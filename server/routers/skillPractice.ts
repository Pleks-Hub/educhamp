import { z } from "zod";
import { router } from "../_core/trpc";
import { studentProcedure } from "../_core/trpc";
import { answersMatch, partialCreditCheck } from "@shared/answerUtils";
import { getActiveCourseIdForUser, getSkillsForCourse, getUserMastery, getDb } from "../db";
import { quizQuestions } from "../../drizzle/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getMasteryLabel, getAdaptivePath } from "../educhamp-helpers";
import { getSkillsDueForReview, updateReviewSchedule, getReviewStats } from "../spacedRepetition";

export const skillPracticeRouter = router({
  /**
   * Returns weak skills (below threshold) for the student's active course,
   * along with available practice questions for each skill.
   */
  getWeakSkills: studentProcedure
    .input(z.object({ threshold: z.number().min(0).max(100).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const threshold = input?.threshold ?? 75;
      const userId = ctx.user.id;
      const activeCourseId = await getActiveCourseIdForUser(userId);

      const [courseSkillRows, allMastery] = await Promise.all([
        getSkillsForCourse(activeCourseId),
        getUserMastery(userId),
      ]);

      const masteryMap = new Map(allMastery.map((m) => [m.skillId, m]));

      // Find skills below threshold
      const weakSkills = courseSkillRows
        .map((row) => {
          const skill = row.skill;
          const unit = row.unit;
          const mastery = masteryMap.get(skill.skillId);
          const score = mastery?.score ?? 0;
          return {
            skillId: skill.skillId,
            skillName: skill.skillName,
            unitId: unit.id,
            unitNumber: unit.unitNumber,
            unitTitle: unit.title,
            score,
            masteryLabel: getMasteryLabel(score),
            adaptivePath: getAdaptivePath(score),
            priority: score < 40 ? "critical" as const : score < 60 ? "high" as const : "medium" as const,
            attemptCount: mastery?.attemptCount ?? 0,
          };
        })
        .filter((s) => s.score < threshold)
        .sort((a, b) => a.score - b.score); // Worst skills first

      return {
        weakSkills,
        threshold,
        totalSkills: courseSkillRows.length,
        masteredCount: courseSkillRows.filter((r) => {
          const m = masteryMap.get(r.skill.skillId);
          return (m?.score ?? 0) >= threshold;
        }).length,
      };
    }),

  /**
   * Returns practice questions for a specific set of weak skills.
   * Questions are drawn from the units that contain those skills.
   */
  getPracticeQuestions: studentProcedure
    .input(z.object({
      unitIds: z.array(z.number()).min(1).max(12),
      count: z.number().min(5).max(30).optional(),
      difficulty: z.enum(["easy", "medium", "hard", "mixed"]).optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const count = input.count ?? 15;
      const difficulty = input.difficulty ?? "mixed";

      // Get questions from the specified units
      let conditions = [inArray(quizQuestions.unitId, input.unitIds), eq(quizQuestions.isActive, true)];
      if (difficulty !== "mixed") {
        conditions.push(eq(quizQuestions.difficulty, difficulty));
      }

      const allQuestions = await db
        .select()
        .from(quizQuestions)
        .where(and(...conditions));

      // Shuffle and pick the requested count
      const shuffled = allQuestions.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, count);

      // Return without correct answers (like quiz mode)
      return selected.map((q) => ({
        id: q.id,
        unitId: q.unitId,
        questionText: q.questionText,
        questionType: q.questionType,
        choices: q.choices,
        skillTag: q.skillTag,
        difficulty: q.difficulty,
      }));
    }),

  /**
   * Submit practice answers and get feedback.
   * Updates spaced repetition schedule based on per-skill performance.
   */
  submitPractice: studentProcedure
    .input(z.object({
      answers: z.array(z.object({
        questionId: z.number(),
        answer: z.string(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { results: [], score: 0, total: 0 };

      const questionIds = input.answers.map((a) => a.questionId);
      const questions = await db
        .select()
        .from(quizQuestions)
        .where(inArray(quizQuestions.id, questionIds));

      const questionMap = new Map(questions.map((q) => [q.id, q]));

      // Use shared answersMatch utility (handles / as ÷, fraction evaluation, etc.)

      const results = input.answers.map((a) => {
        const q = questionMap.get(a.questionId);
        if (!q) return { questionId: a.questionId, correct: false, isPartial: false, partialHint: "", correctAnswer: "", explanation: "" };
        const correct = answersMatch(a.answer, q.correctAnswer);
        const partial = !correct ? partialCreditCheck(a.answer, q.correctAnswer) : { isPartial: false, score: 0, hint: "" };
        return {
          questionId: a.questionId,
          correct,
          isPartial: partial.isPartial,
          partialHint: partial.hint,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          skillTag: q.skillTag,
        };
      });

      const correctCount = results.filter((r) => r.correct).length;
      const partialCount = results.filter((r) => r.isPartial).length;

      // Update spaced repetition schedules per skill
      const skillScores = new Map<string, { correct: number; total: number }>();
      for (const r of results) {
        if (r.skillTag) {
          const existing = skillScores.get(r.skillTag) || { correct: 0, total: 0 };
          existing.total++;
          if (r.correct) existing.correct++;
          skillScores.set(r.skillTag, existing);
        }
      }

      const activeCourseId = await getActiveCourseIdForUser(ctx.user.id);
      const reviewUpdates: Array<{ skillId: string; nextReviewAt: Date; interval: number }> = [];
      for (const [skillId, { correct, total }] of Array.from(skillScores.entries())) {
        const score = Math.round((correct / total) * 100);
        try {
          const result = await updateReviewSchedule(ctx.user.id, skillId, activeCourseId, score);
          reviewUpdates.push({ skillId, nextReviewAt: result.nextReviewAt, interval: result.interval });
        } catch (e) {
          // Non-critical: don't fail the whole submission
        }
      }

      // Effective score: full credit + half credit for partial
      const effectiveScore = correctCount + (partialCount * 0.5);

      return {
        results,
        score: correctCount,
        partialCount,
        effectiveScore,
        total: results.length,
        percentage: Math.round((effectiveScore / results.length) * 100),
        reviewUpdates,
      };
    }),

  /**
   * Get skills due for spaced repetition review.
   */
  getDueReviews: studentProcedure
    .input(z.object({ limit: z.number().min(1).max(20).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const activeCourseId = await getActiveCourseIdForUser(userId);
      const limit = input?.limit ?? 10;

      const dueSkills = await getSkillsDueForReview(userId, activeCourseId, limit);
      const stats = await getReviewStats(userId, activeCourseId);

      // Enrich with skill names from course skills
      const courseSkills = await getSkillsForCourse(activeCourseId);
      const skillNameMap = new Map(courseSkills.map((r) => [r.skill.skillId, r.skill.skillName]));
      const skillUnitMap = new Map(courseSkills.map((r) => [r.skill.skillId, { unitId: r.unit.id, unitTitle: r.unit.title }]));

      const enrichedDue = dueSkills.map((s) => ({
        ...s,
        skillName: skillNameMap.get(s.skillId) || s.skillId,
        unitTitle: skillUnitMap.get(s.skillId)?.unitTitle || "Unknown",
        unitId: skillUnitMap.get(s.skillId)?.unitId || 0,
        daysSinceReview: s.lastReviewedAt
          ? Math.floor((Date.now() - new Date(s.lastReviewedAt).getTime()) / (1000 * 60 * 60 * 24))
          : null,
      }));

      return {
        dueSkills: enrichedDue,
        stats,
      };
    }),

  /**
   * Get review statistics for the dashboard widget.
   */
  getReviewStats: studentProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const activeCourseId = await getActiveCourseIdForUser(userId);
    return getReviewStats(userId, activeCourseId);
  }),

  /**
   * Get review forecast for the next 7 days.
   * Returns an array of { date, count } for each day.
   */
  getReviewForecast: studentProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const activeCourseId = await getActiveCourseIdForUser(userId);
    const db = await getDb();
    if (!db) return { forecast: [] };

    const { skillReviewSchedule } = await import("../../drizzle/schema");
    const { and: _and, eq: _eq, gte, lte } = await import("drizzle-orm");

    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 7);

    const conditions = [
      _eq(skillReviewSchedule.userId, userId),
      gte(skillReviewSchedule.nextReviewAt, now),
      lte(skillReviewSchedule.nextReviewAt, endDate),
    ];
    if (activeCourseId) {
      conditions.push(_eq(skillReviewSchedule.courseId, activeCourseId));
    }

    const upcoming = await db.select({
      nextReviewAt: skillReviewSchedule.nextReviewAt,
      skillId: skillReviewSchedule.skillId,
    }).from(skillReviewSchedule)
      .where(_and(...conditions));

    // Group by date
    const dateMap: Record<string, number> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      dateMap[d.toISOString().slice(0, 10)] = 0;
    }
    for (const item of upcoming) {
      if (item.nextReviewAt) {
        const key = new Date(item.nextReviewAt).toISOString().slice(0, 10);
        if (key in dateMap) dateMap[key]++;
      }
    }

    const forecast = Object.entries(dateMap).map(([date, count]) => ({ date, count }));
    return { forecast };
  }),
});
