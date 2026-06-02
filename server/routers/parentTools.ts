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
} from "../db";
import { getMasteryLabel, getAdaptivePath } from "../educhamp-helpers";

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
    };
  }),

  updateNotificationPreferences: protectedProcedure
    .input(z.object({
      weeklyDigestEnabled: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      await upsertUserProfile(ctx.user.id, {
        weeklyDigestEnabled: input.weeklyDigestEnabled,
      });
      return { success: true };
    }),
});
