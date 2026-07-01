import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getUserProfile, upsertUserProfile, getDb } from "../db";
import { ttsUsageLogs, ttsVoiceRatings } from "../../drizzle/schema";
import { eq, and, gte, desc, sql } from "drizzle-orm";

export const ttsRouter = router({
  /**
   * Get TTS preferences for the current user.
   * Returns global defaults + per-subject overrides.
   */
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getUserProfile(ctx.user.id);
    return {
      ttsEnabledDefault: profile?.ttsEnabledDefault ?? false,
      ttsSpeed: (profile?.ttsSpeed as "slow" | "normal" | "fast") ?? "normal",
      ttsSubjectOverrides: (profile?.ttsSubjectOverrides as Record<string, boolean> | null) ?? {},
      ttsFirstTimeTooltipShown: profile?.ttsFirstTimeTooltipShown ?? false,
      ttsVoiceUri: profile?.ttsVoiceUri ?? null,
    };
  }),

  /**
   * Update TTS preferences (partial — only send changed fields).
   */
  updatePreferences: protectedProcedure
    .input(z.object({
      ttsEnabledDefault: z.boolean().optional(),
      ttsSpeed: z.enum(["slow", "normal", "fast"]).optional(),
      ttsSubjectOverrides: z.record(z.string(), z.boolean()).optional(),
      ttsFirstTimeTooltipShown: z.boolean().optional(),
      ttsVoiceUri: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const data: Record<string, any> = {};
      if (input.ttsEnabledDefault !== undefined) data.ttsEnabledDefault = input.ttsEnabledDefault;
      if (input.ttsSpeed !== undefined) data.ttsSpeed = input.ttsSpeed;
      if (input.ttsSubjectOverrides !== undefined) data.ttsSubjectOverrides = input.ttsSubjectOverrides;
      if (input.ttsFirstTimeTooltipShown !== undefined) data.ttsFirstTimeTooltipShown = input.ttsFirstTimeTooltipShown;
      if (input.ttsVoiceUri !== undefined) data.ttsVoiceUri = input.ttsVoiceUri;
      await upsertUserProfile(ctx.user.id, data);
      return { success: true };
    }),

  /**
   * Toggle TTS for a specific subject (merges into subject overrides).
   */
  toggleSubject: protectedProcedure
    .input(z.object({
      subjectName: z.string(),
      enabled: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const profile = await getUserProfile(ctx.user.id);
      const overrides = (profile?.ttsSubjectOverrides as Record<string, boolean> | null) ?? {};
      overrides[input.subjectName] = input.enabled;
      await upsertUserProfile(ctx.user.id, { ttsSubjectOverrides: overrides });
      return { success: true };
    }),

  /**
   * Log a TTS session when playback ends (called from frontend).
   */
  logSession: protectedProcedure
    .input(z.object({
      courseSubject: z.string(),
      sessionDurationMs: z.number().int().min(0),
      sentencesRead: z.number().int().min(0),
      speed: z.enum(["slow", "normal", "fast"]).optional(),
      voiceUri: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db.insert(ttsUsageLogs).values({
        userId: ctx.user.id,
        courseSubject: input.courseSubject,
        sessionDurationMs: input.sessionDurationMs,
        sentencesRead: input.sentencesRead,
        speed: input.speed ?? "normal",
        voiceUri: input.voiceUri ?? null,
      });
      return { success: true };
    }),

  /**
   * Rate voice quality after a TTS session (thumbs up/down).
   */
  rateVoice: protectedProcedure
    .input(z.object({
      voiceUri: z.string().min(1),
      rating: z.enum(["thumbs_up", "thumbs_down"]),
      sessionId: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db.insert(ttsVoiceRatings).values({
        userId: ctx.user.id,
        voiceUri: input.voiceUri,
        rating: input.rating,
        sessionId: input.sessionId ?? null,
      });
      return { success: true };
    }),

  /**
   * Get aggregated voice ratings (for admin/analytics).
   * Returns per-voice rating breakdown.
   */
  getVoiceRatings: protectedProcedure
    .input(z.object({
      daysBack: z.number().int().min(1).max(90).default(30),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { ratings: [] as { voiceUri: string; thumbsUp: number; thumbsDown: number; total: number }[] };

      const daysBack = input?.daysBack ?? 30;
      const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

      const rows = await db
        .select({
          voiceUri: ttsVoiceRatings.voiceUri,
          rating: ttsVoiceRatings.rating,
          count: sql<number>`count(*)`,
        })
        .from(ttsVoiceRatings)
        .where(gte(ttsVoiceRatings.createdAt, since))
        .groupBy(ttsVoiceRatings.voiceUri, ttsVoiceRatings.rating);

      // Aggregate into per-voice summary
      const voiceMap: Record<string, { thumbsUp: number; thumbsDown: number }> = {};
      for (const row of rows) {
        if (!voiceMap[row.voiceUri]) voiceMap[row.voiceUri] = { thumbsUp: 0, thumbsDown: 0 };
        if (row.rating === "thumbs_up") voiceMap[row.voiceUri].thumbsUp = Number(row.count);
        else voiceMap[row.voiceUri].thumbsDown = Number(row.count);
      }

      const ratings = Object.entries(voiceMap)
        .map(([voiceUri, data]) => ({
          voiceUri,
          thumbsUp: data.thumbsUp,
          thumbsDown: data.thumbsDown,
          total: data.thumbsUp + data.thumbsDown,
        }))
        .sort((a, b) => b.total - a.total);

      return { ratings };
    }),

  /**
   * Get TTS usage stats for a parent's children (aggregated).
   * Returns per-child stats: total sessions, avg duration, top subjects, recent trend.
   */
  getUsageStats: protectedProcedure
    .input(z.object({
      childId: z.number().int().optional(), // if omitted, aggregate all children
      daysBack: z.number().int().min(1).max(90).default(30),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        return {
          totalSessions: 0,
          totalDurationMs: 0,
          totalSentences: 0,
          avgDurationMs: 0,
          topSubjects: [] as { subject: string; sessions: number }[],
          childStats: {} as Record<number, { sessions: number; durationMs: number; sentences: number }>,
          weeklyTrend: [] as { week: string; sessions: number; durationMs: number }[],
          daysBack: input?.daysBack ?? 30,
        };
      }

      const daysBack = input?.daysBack ?? 30;
      const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

      const childFilter = input?.childId
        ? eq(ttsUsageLogs.userId, input.childId)
        : undefined;

      // Get all logs for the time range (optionally filtered by child)
      const logs = await db
        .select({
          userId: ttsUsageLogs.userId,
          courseSubject: ttsUsageLogs.courseSubject,
          sessionDurationMs: ttsUsageLogs.sessionDurationMs,
          sentencesRead: ttsUsageLogs.sentencesRead,
          speed: ttsUsageLogs.speed,
          createdAt: ttsUsageLogs.createdAt,
        })
        .from(ttsUsageLogs)
        .where(
          childFilter
            ? and(childFilter, gte(ttsUsageLogs.createdAt, since))
            : gte(ttsUsageLogs.createdAt, since)
        )
        .orderBy(desc(ttsUsageLogs.createdAt))
        .limit(500);

      // Aggregate stats
      const totalSessions = logs.length;
      const totalDurationMs = logs.reduce((sum, l) => sum + l.sessionDurationMs, 0);
      const totalSentences = logs.reduce((sum, l) => sum + l.sentencesRead, 0);
      const avgDurationMs = totalSessions > 0 ? Math.round(totalDurationMs / totalSessions) : 0;

      // Top subjects by session count
      const subjectCounts: Record<string, number> = {};
      for (const log of logs) {
        subjectCounts[log.courseSubject] = (subjectCounts[log.courseSubject] || 0) + 1;
      }
      const topSubjects = Object.entries(subjectCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([subject, count]) => ({ subject, sessions: count }));

      // Per-child breakdown
      const childStats: Record<number, { sessions: number; durationMs: number; sentences: number }> = {};
      for (const log of logs) {
        if (!childStats[log.userId]) {
          childStats[log.userId] = { sessions: 0, durationMs: 0, sentences: 0 };
        }
        childStats[log.userId].sessions++;
        childStats[log.userId].durationMs += log.sessionDurationMs;
        childStats[log.userId].sentences += log.sentencesRead;
      }

      // Weekly trend (sessions per week for the period)
      const weeklyTrend: { week: string; sessions: number; durationMs: number }[] = [];
      const weekMap: Record<string, { sessions: number; durationMs: number }> = {};
      for (const log of logs) {
        const d = new Date(log.createdAt);
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        const weekKey = weekStart.toISOString().split("T")[0];
        if (!weekMap[weekKey]) weekMap[weekKey] = { sessions: 0, durationMs: 0 };
        weekMap[weekKey].sessions++;
        weekMap[weekKey].durationMs += log.sessionDurationMs;
      }
      for (const [week, data] of Object.entries(weekMap).sort()) {
        weeklyTrend.push({ week, ...data });
      }

      return {
        totalSessions,
        totalDurationMs,
        totalSentences,
        avgDurationMs,
        topSubjects,
        childStats,
        weeklyTrend,
        daysBack,
      };
    }),
});
