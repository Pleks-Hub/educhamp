import { z } from "zod";
import { router } from "../_core/trpc";
import { studentProcedure } from "../_core/trpc";
import { getActiveCourseIdForUser, getSkillsForCourse, getUserMastery, getDb } from "../db";
import { quizQuestions } from "../../drizzle/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getMasteryLabel, getAdaptivePath } from "../educhamp-helpers";

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
   * Submit practice answers and get feedback (no mastery update, just feedback).
   * Practice mode gives immediate per-question feedback.
   */
  submitPractice: studentProcedure
    .input(z.object({
      answers: z.array(z.object({
        questionId: z.number(),
        answer: z.string(),
      })),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { results: [], score: 0, total: 0 };

      const questionIds = input.answers.map((a) => a.questionId);
      const questions = await db
        .select()
        .from(quizQuestions)
        .where(inArray(quizQuestions.id, questionIds));

      const questionMap = new Map(questions.map((q) => [q.id, q]));

      function normalise(raw: string): string {
        return raw.trim().toLowerCase().replace(/\s+/g, "");
      }
      function answersMatch(student: string, correct: string): boolean {
        const s = normalise(student);
        const c = normalise(correct);
        if (s === c) return true;
        const stripDot0 = (v: string) => v.replace(/\.0+$/, "");
        if (stripDot0(s) === stripDot0(c)) return true;
        const sParts = s.split(",").map((p) => p.trim()).sort();
        const cParts = c.split(",").map((p) => p.trim()).sort();
        if (sParts.join(",") === cParts.join(",")) return true;
        return false;
      }

      const results = input.answers.map((a) => {
        const q = questionMap.get(a.questionId);
        if (!q) return { questionId: a.questionId, correct: false, correctAnswer: "", explanation: "" };
        const correct = answersMatch(a.answer, q.correctAnswer);
        return {
          questionId: a.questionId,
          correct,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          skillTag: q.skillTag,
        };
      });

      const correctCount = results.filter((r) => r.correct).length;

      return {
        results,
        score: correctCount,
        total: results.length,
        percentage: Math.round((correctCount / results.length) * 100),
      };
    }),
});
