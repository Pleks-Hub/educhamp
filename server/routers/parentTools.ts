/**
 * Parent Tools Router
 * Goals, notes, skill gap analysis, and report export for parents
 */
import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createParentGoal,
  listParentGoals,
  completeParentGoal,
  deleteParentGoal,
  createParentNote,
  listParentNotes,
  deleteParentNote,
  getChildProgressSummary,
  getChildrenForParent,
  getUserProfile,
  upsertUserProfile,
  getWeeklyDigestDataForParent,
  getDb,
} from "../db";
import { getMasteryLabel, getAdaptivePath } from "../educhamp-helpers";
import { buildWeeklyParentDigestEmail, type WeeklyDigestChild } from "../emailTemplates/weeklyParentDigest";
import { userMastery, unitProgress, units, diagnosticAttempts } from "../../drizzle/schema";
import { and, eq, gte, desc, inArray } from "drizzle-orm";

// ─── Goals ────────────────────────────────────────────────────────────────────

export const parentToolsRouter = router({
  // Goals
  createGoal: protectedProcedure
    .input(z.object({
      childId: z.number().int().positive(),
      goalText: z.string().min(1).max(500),
      targetDate: z.string().optional(), // ISO date string
    }))
    .mutation(async ({ ctx, input }) => {
      const children = await getChildrenForParent(ctx.user.id);
      const isMyChild = children.some((c: any) => c.link?.childId === input.childId);
      if (!isMyChild) throw new TRPCError({ code: "FORBIDDEN", message: "Not your child" });
      const targetDate = input.targetDate ? new Date(input.targetDate) : undefined;
      await createParentGoal(ctx.user.id, input.childId, input.goalText, targetDate);
      return { success: true };
    }),

  listGoals: protectedProcedure
    .input(z.object({ childId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const children = await getChildrenForParent(ctx.user.id);
      const isMyChild = children.some((c: any) => c.link?.childId === input.childId);
      if (!isMyChild) throw new TRPCError({ code: "FORBIDDEN", message: "Not your child" });
      return listParentGoals(ctx.user.id, input.childId);
    }),

  completeGoal: protectedProcedure
    .input(z.object({ goalId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await completeParentGoal(input.goalId, ctx.user.id);
      return { success: true };
    }),

  deleteGoal: protectedProcedure
    .input(z.object({ goalId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await deleteParentGoal(input.goalId, ctx.user.id);
      return { success: true };
    }),

  // Notes
  createNote: protectedProcedure
    .input(z.object({
      childId: z.number().int().positive(),
      noteText: z.string().min(1).max(2000),
    }))
    .mutation(async ({ ctx, input }) => {
      const children = await getChildrenForParent(ctx.user.id);
      const isMyChild = children.some((c: any) => c.link?.childId === input.childId);
      if (!isMyChild) throw new TRPCError({ code: "FORBIDDEN", message: "Not your child" });
      await createParentNote(ctx.user.id, input.childId, input.noteText);
      return { success: true };
    }),

  listNotes: protectedProcedure
    .input(z.object({ childId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const children = await getChildrenForParent(ctx.user.id);
      const isMyChild = children.some((c: any) => c.link?.childId === input.childId);
      if (!isMyChild) throw new TRPCError({ code: "FORBIDDEN", message: "Not your child" });
      return listParentNotes(ctx.user.id, input.childId);
    }),

  deleteNote: protectedProcedure
    .input(z.object({ noteId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await deleteParentNote(input.noteId, ctx.user.id);
      return { success: true };
    }),

  // Skill Gap Analysis
  skillGapAnalysis: protectedProcedure
    .input(z.object({ childId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const children = await getChildrenForParent(ctx.user.id);
      const isMyChild = children.some((c: any) => c.link?.childId === input.childId);
      if (!isMyChild) throw new TRPCError({ code: "FORBIDDEN", message: "Not your child" });

      const progress = await getChildProgressSummary(input.childId);
      if (!progress) throw new TRPCError({ code: "NOT_FOUND", message: "Child not found" });

      // mastery rows only have skillId + score; parse unit from skillId (ALG1-U3-S2 → unit 3)
      const mastery = progress.mastery.map((m) => {
        const match = m.skillId.match(/ALG1-U(\d+)-S(\d+)/);
        return {
          skillId: m.skillId,
          skillName: m.skillId,
          unitNumber: match ? parseInt(match[1]) : 0,
          score: m.score,
        };
      });

      const gaps = mastery
        .filter((m) => m.score < 75)
        .map((m) => ({
          skillId: m.skillId,
          skillName: m.skillName,
          unitNumber: m.unitNumber,
          score: m.score,
          masteryLabel: getMasteryLabel(m.score),
          adaptivePath: getAdaptivePath(m.score),
          priority: m.score < 60 ? "high" : "medium",
        }))
        .sort((a, b) => a.score - b.score);

      const strengths = mastery
        .filter((m) => m.score >= 90)
        .map((m) => ({
          skillId: m.skillId,
          skillName: m.skillName,
          unitNumber: m.unitNumber,
          score: m.score,
          masteryLabel: getMasteryLabel(m.score),
        }));

      return {
        gaps,
        strengths,
        totalSkills: mastery.length,
        masteredCount: mastery.filter((m) => m.score >= 90).length,
        approachingCount: mastery.filter((m) => m.score >= 75 && m.score < 90).length,
        developingCount: mastery.filter((m) => m.score >= 60 && m.score < 75).length,
        beginnerCount: mastery.filter((m) => m.score < 60).length,
      };
    }),

  // Learning Insights: time-based trends and improvement rate
  learningInsights: protectedProcedure
    .input(z.object({ childId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const children = await getChildrenForParent(ctx.user.id);
      const isMyChild = children.some((c: any) => c.link?.childId === input.childId);
      if (!isMyChild) throw new TRPCError({ code: "FORBIDDEN", message: "Not your child" });

      const progress = await getChildProgressSummary(input.childId);
      if (!progress) throw new TRPCError({ code: "NOT_FOUND", message: "Child not found" });

      // Build quiz score trend (chronological)
      const quizTrend = progress.quizHistory
        .filter((q) => q.completedAt && q.totalQuestions)
        .map((q) => ({
          date: q.completedAt!.toISOString(),
          unitNumber: q.unitId ?? 0,
          percentage: Math.round(((q.score ?? 0) / (q.totalQuestions ?? 15)) * 100),
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate improvement rate: compare first half vs second half of quiz scores
      let improvementRate: number | null = null;
      if (quizTrend.length >= 2) {
        const mid = Math.floor(quizTrend.length / 2);
        const firstHalf = quizTrend.slice(0, mid);
        const secondHalf = quizTrend.slice(mid);
        const firstAvg = firstHalf.reduce((s, q) => s + q.percentage, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((s, q) => s + q.percentage, 0) / secondHalf.length;
        improvementRate = Math.round(secondAvg - firstAvg);
      }

      // Mastery trend: group mastery scores by unit number
      const masteryByUnit = progress.mastery.reduce((acc, m) => {
        const match = m.skillId.match(/ALG1-U(\d+)-S(\d+)/);
        const unitNum = match ? parseInt(match[1]) : 0;
        if (!acc[unitNum]) acc[unitNum] = [];
        acc[unitNum].push(m.score);
        return acc;
      }, {} as Record<number, number[]>);

      const masteryTrend = Object.entries(masteryByUnit)
        .map(([unitNum, scores]) => ({
          unitNumber: parseInt(unitNum),
          averageScore: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length),
          skillCount: scores.length,
        }))
        .sort((a, b) => a.unitNumber - b.unitNumber);

      // Overall stats
      const totalMastery = progress.mastery;
      const currentAvg = totalMastery.length > 0
        ? Math.round(totalMastery.reduce((s, m) => s + m.score, 0) / totalMastery.length)
        : 0;

      return {
        quizTrend,
        masteryTrend,
        improvementRate,
        currentAverageMastery: currentAvg,
        totalQuizzesTaken: quizTrend.length,
        totalSkillsTracked: totalMastery.length,
        masteredSkills: totalMastery.filter((m) => m.score >= 90).length,
      };
    }),

  // Report data for export (returns structured JSON that the frontend renders as PDF/CSV)
  getReportData: protectedProcedure
    .input(z.object({ childId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const children = await getChildrenForParent(ctx.user.id);
      const child = children.find((c: any) => c.link?.childId === input.childId);
      if (!child) throw new TRPCError({ code: "FORBIDDEN", message: "Not your child" });

      const progress = await getChildProgressSummary(input.childId);
      if (!progress) throw new TRPCError({ code: "NOT_FOUND", message: "Child not found" });

      const mastery = progress.mastery.map((m) => {
        const match = m.skillId.match(/ALG1-U(\d+)-S(\d+)/);
        return {
          skillId: m.skillId,
          skillName: m.skillId,
          unitNumber: match ? parseInt(match[1]) : 0,
          unitName: `Unit ${match ? match[1] : '?'}`,
          score: m.score,
        };
      });
      const quizHistory = progress.quizHistory.map((q) => ({
        unitNumber: q.unitId ?? 0,
        unitName: `Unit ${q.unitId ?? '?'}`,
        score: q.score ?? 0,
        totalQuestions: q.totalQuestions ?? 15,
        completedAt: q.completedAt?.toISOString() ?? new Date().toISOString(),
      }));

      // Group mastery by unit
      const unitMap = new Map<number, { unitName: string; skills: typeof mastery }>();
      for (const m of mastery) {
        if (!unitMap.has(m.unitNumber)) {
          unitMap.set(m.unitNumber, { unitName: m.unitName ?? `Unit ${m.unitNumber}`, skills: [] });
        }
        unitMap.get(m.unitNumber)!.skills.push(m);
      }

      const unitSummaries = Array.from(unitMap.entries()).map(([unitNumber, { unitName, skills }]) => {
        const avgScore = skills.length > 0 ? Math.round(skills.reduce((s, k) => s + k.score, 0) / skills.length) : 0;
        return {
          unitNumber,
          unitName,
          averageScore: avgScore,
          masteryLabel: getMasteryLabel(avgScore),
          skillCount: skills.length,
          masteredSkills: skills.filter((s) => s.score >= 90).length,
          skills: skills.map((s) => ({
            skillId: s.skillId,
            skillName: s.skillName,
            score: s.score,
            masteryLabel: getMasteryLabel(s.score),
          })),
        };
      }).sort((a, b) => a.unitNumber - b.unitNumber);

      const overallAvg = mastery.length > 0
        ? Math.round(mastery.reduce((s, m) => s + m.score, 0) / mastery.length)
        : 0;

      return {
        student: {
          name: progress.name,
          email: progress.email,
          grade: progress.grade,
          school: progress.school,
          nickname: (child as any).link?.nickname ?? null,
        },
        generatedAt: new Date().toISOString(),
        overallAverage: overallAvg,
        overallMasteryLabel: getMasteryLabel(overallAvg),
        placementScore: progress.placementScore,
        placementRecommendation: progress.placementRecommendation,
        unitSummaries,
        quizHistory: quizHistory.map((q) => ({
          ...q,
          percentage: Math.round((q.score / q.totalQuestions) * 100),
          masteryLabel: getMasteryLabel(Math.round((q.score / q.totalQuestions) * 100)),
        })),
        totalSkills: mastery.length,
        masteredSkills: mastery.filter((m) => m.score >= 90).length,
        skillsNeedingWork: mastery.filter((m) => m.score < 75).length,
      };
    }),

  // ─── Notification Preferences ──────────────────────────────────────────────

  getNotificationPreferences: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getUserProfile(ctx.user.id);
    return {
      weeklyDigestEnabled: profile?.weeklyDigestEnabled ?? true,
      activityPreference: (profile?.activityPreference as string) ?? "general",
    };
  }),

  updateNotificationPreferences: protectedProcedure
    .input(z.object({
      weeklyDigestEnabled: z.boolean(),
      activityPreference: z.enum(["general", "reading", "math_games", "hands_on", "outdoor", "creative"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const data: Record<string, any> = {
        weeklyDigestEnabled: input.weeklyDigestEnabled,
      };
      if (input.activityPreference !== undefined) {
        data.activityPreference = input.activityPreference;
      }
      await upsertUserProfile(ctx.user.id, data);
      return { success: true };
    }),

  // ─── Preview Digest ──────────────────────────────────────────────────────────────

  previewDigest: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    const childData = await getWeeklyDigestDataForParent(ctx.user.id);
    if (childData.length === 0) {
      throw new TRPCError({ code: "NOT_FOUND", message: "No children linked to your account." });
    }

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(now);
    weekEnd.setHours(23, 59, 59, 999);
    const appUrl = ctx.req.headers.origin || "https://educhamp.co";

    const digestChildren: WeeklyDigestChild[] = [];

    for (const child of childData) {
      const grade = child.gradeLevel || "Student";

      const weekMastery = await db
        .select()
        .from(userMastery)
        .where(and(eq(userMastery.userId, child.childId), gte(userMastery.updatedAt, weekStart)));
      const newSkillsMastered = weekMastery.filter((m) => (m.score ?? 0) >= 75).length;

      const allMastery = await db
        .select({ score: userMastery.score })
        .from(userMastery)
        .where(eq(userMastery.userId, child.childId));
      const totalMasteryScore = allMastery.length > 0
        ? Math.round(allMastery.reduce((s, m) => s + (m.score ?? 0), 0) / allMastery.length)
        : 0;

      const recentUnitProgress = await db
        .select({ unitId: unitProgress.unitId })
        .from(unitProgress)
        .where(eq(unitProgress.userId, child.childId))
        .orderBy(desc(unitProgress.updatedAt))
        .limit(2);
      let recentUnitNames: string[] = [];
      if (recentUnitProgress.length > 0) {
        const unitIds = recentUnitProgress.map((u) => u.unitId);
        const unitRows = await db.select({ id: units.id, title: units.title }).from(units).where(inArray(units.id, unitIds));
        recentUnitNames = unitRows.map((u) => u.title);
      }

      const latestDiag = await db
        .select({ overallScore: diagnosticAttempts.overallScore })
        .from(diagnosticAttempts)
        .where(eq(diagnosticAttempts.userId, child.childId))
        .orderBy(desc(diagnosticAttempts.completedAt))
        .limit(1)
        .then((r) => r[0] ?? null);
      const diagScore = latestDiag?.overallScore ?? null;
      const onTrackStatus: "on_track" | "needs_attention" | "check_in" | null =
        diagScore === null ? null :
        diagScore >= 75 ? "on_track" :
        diagScore >= 60 ? "needs_attention" : "check_in";

      digestChildren.push({
        name: child.childName,
        grade,
        lessonsCompleted: child.lessonsCompleted,
        quizAttempts: child.quizzesTaken,
        bestQuizScore: child.bestQuizScore,
        newSkillsMastered,
        totalMasteryScore,
        recentUnits: recentUnitNames,
        showedImprovement: child.lessonsCompleted > 0,
        suggestedActivity: "Practice a fun 10-minute activity together — this is a preview of your weekly digest!",
        progressUrl: `${appUrl}/parent`,
        nextLessonUrl: `${appUrl}/curriculum`,
        onTrackStatus,
        diagnosticScore: diagScore,
      });
    }

    const emailData = buildWeeklyParentDigestEmail({
      parentName: ctx.user.name ?? "Parent",
      parentEmail: ctx.user.email ?? "",
      weekStart,
      weekEnd,
      children: digestChildren,
      appUrl,
    });

    return { html: emailData.html, subject: emailData.subject };
  }),
});
