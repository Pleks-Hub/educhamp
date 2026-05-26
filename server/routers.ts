import { COOKIE_NAME } from "@shared/const";
import { parentRouter } from "./routers/parent";
import { coParentRouter } from "./routers/coParent";
import { authEnhancementsRouter } from "./routers/authEnhancements";
import { parentToolsRouter } from "./routers/parentTools";
import { referralRouter } from "./routers/referral";
import { onboardingRouter } from "./routers/onboarding";
import { adminRouter } from "./routers/admin";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import { protectedProcedure, studentProcedure, publicProcedure, router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import {
  getAllDiagnosticQuestions,
  getAllDiagnosticAttempts,
  getAllSkills,
  getAllUnits,
  getLessonById,
  getLessonProgressForUser,
  getLessonsByUnit,
  getLatestDiagnosticAttempt,
  getLatestQuizAttempt,
  getOrCreateTutorSession,
  getQuizAttemptsForUser,
  getQuizQuestionsByUnit,
  getSkillsByUnit,
  getUnitByNumber,
  getUserMastery,
  getUserUnitProgress,
  markLessonComplete,
  saveDiagnosticAttempt,
  saveQuizAttempt,
  updateTutorSessionMessages,
  upsertUnitProgress,
  upsertUserMastery,
  getParentsByChildId,
} from "./db";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getMasteryLevel, getMasteryLabel, buildTutorSystemPrompt } from "./educhamp-helpers";

export const appRouter = router({
  system: systemRouter,
  admin: adminRouter,
  parent: parentRouter,
  coParent: coParentRouter,
  authEnhancements: authEnhancementsRouter,
  parentTools: parentToolsRouter,
  referral: referralRouter,
  onboarding: onboardingRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Curriculum ─────────────────────────────────────────────────────────────
  curriculum: router({
    getUnits: publicProcedure.query(async () => {
      return getAllUnits();
    }),

    getUnit: publicProcedure
      .input(z.object({ unitNumber: z.number() }))
      .query(async ({ input }) => {
        return getUnitByNumber(input.unitNumber);
      }),

    getLessons: publicProcedure
      .input(z.object({ unitId: z.number() }))
      .query(async ({ input }) => {
        return getLessonsByUnit(input.unitId);
      }),

    getLesson: publicProcedure
      .input(z.object({ lessonId: z.number() }))
      .query(async ({ input }) => {
        return getLessonById(input.lessonId);
      }),

    getSkillsByUnit: publicProcedure
      .input(z.object({ unitNumber: z.number() }))
      .query(async ({ input }) => {
        return getSkillsByUnit(input.unitNumber);
      }),

    getAllSkills: publicProcedure.query(async () => {
      return getAllSkills();
    }),
  }),

  // ─── Progress ────────────────────────────────────────────────────────────────
  progress: router({
    getDashboard: protectedProcedure.query(async ({ ctx }) => {
      const userId = ctx.user.id;
      const [allUnits, unitProgressData, masteryData, quizAttemptsData] = await Promise.all([
        getAllUnits(),
        getUserUnitProgress(userId),
        getUserMastery(userId),
        getQuizAttemptsForUser(userId),
      ]);

      const progressMap = new Map(unitProgressData.map((p) => [p.unitId, p]));
      const masteryMap = new Map(masteryData.map((m) => [m.skillId, m]));

      const unitsWithProgress = allUnits.map((unit) => {
        const progress = progressMap.get(unit.id);
        return {
          ...unit,
          status: progress?.status ?? "locked",
          lessonsCompleted: progress?.lessonsCompleted ?? 0,
          totalLessons: progress?.totalLessons ?? 0,
          quizScore: progress?.quizScore ?? null,
          quizAttempts: progress?.quizAttempts ?? 0,
          lastActivityAt: progress?.lastActivityAt ?? null,
        };
      });

      const overallMastery =
        masteryData.length > 0
          ? Math.round(masteryData.reduce((sum, m) => sum + m.score, 0) / masteryData.length)
          : 0;

      const completedUnits = unitProgressData.filter((p) => p.status === "completed").length;
      const inProgressUnits = unitProgressData.filter((p) => p.status === "in_progress" || p.status === "quiz_unlocked").length;

      return {
        units: unitsWithProgress,
        mastery: masteryData,
        overallMastery,
        completedUnits,
        inProgressUnits,
        totalUnits: allUnits.length,
        recentQuizAttempts: quizAttemptsData.slice(0, 5),
      };
    }),

    getMastery: protectedProcedure.query(async ({ ctx }) => {
      const [masteryData, allSkills] = await Promise.all([
        getUserMastery(ctx.user.id),
        getAllSkills(),
      ]);
      const masteryMap = new Map(masteryData.map((m) => [m.skillId, m]));
      return allSkills.map((skill) => {
        const mastery = masteryMap.get(skill.skillId);
        return {
          ...skill,
          score: mastery?.score ?? 0,
          level: getMasteryLevel(mastery?.score ?? 0),
          label: getMasteryLabel(mastery?.score ?? 0),
          attemptCount: mastery?.attemptCount ?? 0,
          lastAttemptAt: mastery?.lastAttemptAt ?? null,
        };
      });
    }),

    getLessonProgress: protectedProcedure
      .input(z.object({ unitId: z.number() }))
      .query(async ({ ctx, input }) => {
        return getLessonProgressForUser(ctx.user.id, input.unitId);
      }),

    markLessonComplete: studentProcedure
      .input(z.object({ lessonId: z.number(), unitId: z.number(), unitNumber: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await markLessonComplete(ctx.user.id, input.lessonId, input.unitId);
        // Update unit progress
        const lessonProgress = await getLessonProgressForUser(ctx.user.id, input.unitId);
        const completedCount = lessonProgress.filter((l) => l.completed).length + 1;
        const allLessons = await getLessonsByUnit(input.unitId);
        await upsertUnitProgress(ctx.user.id, input.unitId, input.unitNumber, {
          status: "in_progress",
          lessonsCompleted: completedCount,
          totalLessons: allLessons.length,
        });
        return { success: true };
      }),
  }),

  // ─── Quiz ─────────────────────────────────────────────────────────────────────
  quiz: router({
    getQuestions: protectedProcedure
      .input(z.object({ unitId: z.number() }))
      .query(async ({ input }) => {
        const questions = await getQuizQuestionsByUnit(input.unitId);
        // Return questions without correct answers for the quiz
        return questions.map((q) => ({
          id: q.id,
          questionText: q.questionText,
          questionType: q.questionType,
          choices: q.choices,
          skillTag: q.skillTag,
          difficulty: q.difficulty,
        }));
      }),

    submitQuiz: studentProcedure
      .input(
        z.object({
          unitId: z.number(),
          unitNumber: z.number(),
          unitTitle: z.string(),
          answers: z.array(z.object({ questionId: z.number(), answer: z.string() })),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const questions = await getQuizQuestionsByUnit(input.unitId);
        const questionMap = new Map(questions.map((q) => [q.id, q]));

        const gradedAnswers = input.answers.map((a) => {
          const q = questionMap.get(a.questionId);
          if (!q) return { questionId: a.questionId, answer: a.answer, correct: false };
          const correct = a.answer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
          return { questionId: a.questionId, answer: a.answer, correct };
        });

        const correctCount = gradedAnswers.filter((a) => a.correct).length;
        const score = Math.round((correctCount / questions.length) * 100);

        // Save quiz attempt
        await saveQuizAttempt(
          ctx.user.id,
          input.unitId,
          input.unitNumber,
          gradedAnswers,
          score,
          questions.length,
          correctCount
        );

        // Update unit progress based on score
        let newStatus: "locked" | "in_progress" | "quiz_unlocked" | "completed" = "in_progress";
        if (score >= 75) newStatus = "completed";

        await upsertUnitProgress(ctx.user.id, input.unitId, input.unitNumber, {
          status: newStatus,
          quizScore: score,
          quizAttempts: 1,
        });

        // Update mastery for each skill tag
        const skillScores = new Map<string, { correct: number; total: number }>();
        for (const a of gradedAnswers) {
          const q = questionMap.get(a.questionId);
          if (!q) continue;
          const existing = skillScores.get(q.skillTag) ?? { correct: 0, total: 0 };
          skillScores.set(q.skillTag, {
            correct: existing.correct + (a.correct ? 1 : 0),
            total: existing.total + 1,
          });
        }
        const skillMasteryAchievements: string[] = [];
        for (const [skillId, { correct, total }] of Array.from(skillScores.entries())) {
          const skillScore = Math.round((correct / total) * 100);
          await upsertUserMastery(ctx.user.id, skillId, skillScore);
          // Detect mastery achievement (90+)
          if (skillScore >= 90) {
            skillMasteryAchievements.push(`${skillId} (${skillScore}% — ${getMasteryLabel(skillScore)})`);
          }
        }

        // Fetch parent links to include child name in notifications
        const parents = await getParentsByChildId(ctx.user.id).catch(() => []);
        const parentNames = parents.map((p) => p.parentName ?? "a parent").join(", ");
        const studentLabel = parents.length > 0
          ? `${ctx.user.name} (monitored by ${parentNames})`
          : ctx.user.name ?? "Student";

        // Notify owner of skill mastery achievements
        if (skillMasteryAchievements.length > 0) {
          await notifyOwner({
            title: `Skill Mastery Achieved — ${ctx.user.name}`,
            content: `${studentLabel} has achieved mastery on: ${skillMasteryAchievements.join(", ")}.`,
          }).catch(() => {});
        }

        // Notify owner
        const masteryLabel = getMasteryLabel(score);
        const notifyMsg = score >= 75
          ? `${studentLabel} completed Unit ${input.unitNumber} quiz with ${score}% (${masteryLabel}). Unit unlocked.`
          : score < 60
          ? `${studentLabel} scored ${score}% on Unit ${input.unitNumber} quiz — below remediation threshold. Intervention recommended.`
          : `${studentLabel} scored ${score}% on Unit ${input.unitNumber} quiz. Continuing guided practice.`;

        await notifyOwner({
          title: `Quiz Complete: Unit ${input.unitNumber} — ${input.unitTitle}`,
          content: notifyMsg,
        }).catch(() => {});

        // Return graded results with explanations
        const results = gradedAnswers.map((a) => {
          const q = questionMap.get(a.questionId);
          return {
            questionId: a.questionId,
            questionText: q?.questionText ?? "",
            yourAnswer: a.answer,
            correctAnswer: q?.correctAnswer ?? "",
            correct: a.correct,
            explanation: q?.explanation ?? "",
            skillTag: q?.skillTag ?? "",
            difficulty: q?.difficulty ?? "easy",
          };
        });

        return {
          score,
          correctCount,
          totalQuestions: questions.length,
          results,
          masteryLabel,
          adaptivePath: score < 60
            ? "Your score is below 60%. The AI Tutor Remediation mode is now unlocked to help you revisit key concepts before retrying."
            : score < 75
            ? "Your score is 60–74%. Continue with guided practice problems to strengthen your understanding."
            : score < 90
            ? "Great work! You scored 75–89%. The next unit is now unlocked."
            : "Excellent! You scored 90%+. Challenge content is now unlocked for this unit.",
        };
      }),

    getLatestAttempt: protectedProcedure
      .input(z.object({ unitId: z.number() }))
      .query(async ({ ctx, input }) => {
        return getLatestQuizAttempt(ctx.user.id, input.unitId);
      }),
  }),

  // ─── Diagnostic ───────────────────────────────────────────────────────────────
  diagnostic: router({
    /**
     * Returns a varied set of 30 diagnostic questions (6 prerequisite + 2 per unit).
     * On each call a Fisher-Yates shuffle is applied within each group so retests
     * present different questions drawn from the expanded question bank.
     * A stable `seed` string can be passed to reproduce a specific set (used in tests).
     */
    getQuestions: protectedProcedure
      .input(z.object({ seed: z.string().optional() }).optional())
      .query(async ({ input }) => {
        const allQuestions = await getAllDiagnosticQuestions();

        // Group questions by mapsToUnit
        const groups = new Map<string, typeof allQuestions>();
        for (const q of allQuestions) {
          const g = groups.get(q.mapsToUnit) ?? [];
          g.push(q);
          groups.set(q.mapsToUnit, g);
        }

        // Seeded pseudo-random shuffle (mulberry32)
        function seededRng(seed: string) {
          let h = 0;
          for (let i = 0; i < seed.length; i++) {
            h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
          }
          let s = h >>> 0;
          return () => {
            s += 0x6D2B79F5;
            let t = Math.imul(s ^ s >>> 15, 1 | s);
            t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
          };
        }

        const rngSeed = input?.seed ?? Date.now().toString();
        const rng = seededRng(rngSeed);

        function shuffle<T>(arr: T[]): T[] {
          const a = [...arr];
          for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
          }
          return a;
        }

        const selected: typeof allQuestions = [];

        // Pick 6 prerequisite questions (shuffle, take 6)
        const prereqs = shuffle(groups.get("prerequisite") ?? []);
        selected.push(...prereqs.slice(0, 6));

        // Pick 2 questions per unit (1 easy + 1 medium when possible, else any 2)
        for (let u = 1; u <= 12; u++) {
          const unitQs = shuffle(groups.get(String(u)) ?? []);
          const easy = unitQs.filter(q => q.difficulty === "easy");
          const medium = unitQs.filter(q => q.difficulty === "medium");
          if (easy.length > 0 && medium.length > 0) {
            selected.push(easy[0], medium[0]);
          } else {
            selected.push(...unitQs.slice(0, 2));
          }
        }

        return selected.map((q) => ({
          id: q.id,
          questionId: q.questionId,
          questionText: q.questionText,
          questionType: q.questionType,
          choices: q.choices,
          mapsToUnit: q.mapsToUnit,
          difficulty: q.difficulty,
        }));
      }),

    submitDiagnostic: studentProcedure
      .input(
        z.object({
          answers: z.array(z.object({ questionId: z.string(), answer: z.string() })),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const questions = await getAllDiagnosticQuestions();
        const questionMap = new Map(questions.map((q) => [q.questionId, q]));

        const gradedAnswers = input.answers.map((a) => {
          const q = questionMap.get(a.questionId);
          if (!q) return { questionId: a.questionId, answer: a.answer, correct: false };
          const correct = a.answer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
          return { questionId: a.questionId, answer: a.answer, correct };
        });

        // Score prerequisite questions (DIAG-001 to DIAG-006)
        const prereqAnswers = gradedAnswers.filter((a) => {
          const q = questionMap.get(a.questionId);
          return q?.mapsToUnit === "prerequisite";
        });
        const prerequisiteScore = prereqAnswers.filter((a) => a.correct).length;

        // Score per unit
        const unitResults: {
          unitNumber: number;
          unitTitle: string;
          correct: number;
          total: number;
          status: "likely_mastered" | "partial_understanding" | "needs_instruction";
          recommendation: string;
        }[] = [];

        const allUnits = await getAllUnits();
        const unitMap = new Map(allUnits.map((u) => [String(u.unitNumber), u]));

        for (let i = 1; i <= 12; i++) {
          const unitAnswers = gradedAnswers.filter((a) => {
            const q = questionMap.get(a.questionId);
            return q?.mapsToUnit === String(i);
          });
          const correct = unitAnswers.filter((a) => a.correct).length;
          const total = unitAnswers.length;
          const unit = unitMap.get(String(i));

          let status: "likely_mastered" | "partial_understanding" | "needs_instruction";
          let recommendation: string;

          if (correct === total && total > 0) {
            status = "likely_mastered";
            recommendation = "Likely mastered — verify with unit quiz before advancing.";
          } else if (correct > 0) {
            status = "partial_understanding";
            recommendation = "Partial understanding — start from the beginning of the unit.";
          } else {
            status = "needs_instruction";
            recommendation = "Needs full instruction — begin with Unit 1 or earliest gap.";
          }

          unitResults.push({
            unitNumber: i,
            unitTitle: unit?.title ?? `Unit ${i}`,
            correct,
            total,
            status,
            recommendation,
          });
        }

        const overallCorrect = gradedAnswers.filter((a) => a.correct).length;
        const overallScore = Math.round((overallCorrect / gradedAnswers.length) * 100);

        let placementRecommendation: string;
        if (prerequisiteScore < 4) {
          placementRecommendation =
            "Pre-algebra gaps detected. Recommend reviewing order of operations, integer operations, fractions, and basic variable expressions before starting Algebra I.";
        } else {
          const firstGap = unitResults.find((u) => u.status === "needs_instruction");
          placementRecommendation = firstGap
            ? `Ready for Algebra I. Recommend starting at Unit ${firstGap.unitNumber}: ${firstGap.unitTitle}.`
            : "Strong foundation across all units. Begin with Unit 1 and use unit quizzes to confirm mastery before advancing.";
        }

        await saveDiagnosticAttempt(
          ctx.user.id,
          gradedAnswers,
          unitResults,
          prerequisiteScore,
          overallScore,
          placementRecommendation
        );

        // Initialize unit progress for all units
        for (const unit of allUnits) {
          const unitResult = unitResults.find((r) => r.unitNumber === unit.unitNumber);
          if (unitResult?.status === "likely_mastered") {
            await upsertUnitProgress(ctx.user.id, unit.id, unit.unitNumber, {
              status: "quiz_unlocked",
            });
          } else if (unit.unitNumber === 1) {
            await upsertUnitProgress(ctx.user.id, unit.id, unit.unitNumber, {
              status: "in_progress",
            });
          }
        }

        return {
          overallScore,
          prerequisiteScore,
          unitResults,
          placementRecommendation,
          gradedAnswers: gradedAnswers.map((a) => {
            const q = questionMap.get(a.questionId);
            return {
              ...a,
              questionText: q?.questionText ?? "",
              questionType: q?.questionType ?? "short_answer",
              choices: q?.choices ?? null,
              mapsToUnit: q?.mapsToUnit ?? "",
              correctAnswer: q?.correctAnswer ?? "",
              explanation: q?.explanation ?? "",
            };
          }),
        };
      }),

    getLatestAttempt: protectedProcedure.query(async ({ ctx }) => {
      return getLatestDiagnosticAttempt(ctx.user.id);
    }),

    getAllAttempts: protectedProcedure.query(async ({ ctx }) => {
      return getAllDiagnosticAttempts(ctx.user.id);
    }),
  }),

  // ─── AI Tutor ─────────────────────────────────────────────────────────────────
  tutor: router({
    chat: protectedProcedure
      .input(
        z.object({
          message: z.string().min(1).max(2000),
          mode: z.enum(["teach", "practice", "quiz", "exam_review", "remediation", "parent_summary"]),
          unitId: z.number().optional(),
          unitNumber: z.number().optional(),
          lessonId: z.number().optional(),
          sessionId: z.number().optional(),
          context: z.string().optional(), // StudentContext XML
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Get or create session
        let session = input.sessionId
          ? null
          : await getOrCreateTutorSession(
              ctx.user.id,
              input.unitId ?? null,
              input.lessonId ?? null,
              input.mode
            );

        // Build mastery context
        const masteryData = await getUserMastery(ctx.user.id);
        const unitData = input.unitNumber ? await getAllUnits() : [];
        const currentUnit = unitData.find((u) => u.unitNumber === input.unitNumber);

        // Build system prompt
        const systemPrompt = buildTutorSystemPrompt(
          ctx.user.name ?? "Student",
          input.mode,
          currentUnit?.title ?? "",
          masteryData.map((m) => ({ skillId: m.skillId, score: m.score }))
        );

        // Build message history
        const history = (session?.messages ?? []) as { role: "user" | "assistant"; content: string; timestamp: number }[];
        const recentHistory = history.slice(-20); // last 10 turns

        const messages = [
          { role: "system" as const, content: systemPrompt },
          ...recentHistory.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
          { role: "user" as const, content: input.message },
        ];

        const response = await invokeLLM({ messages });
        const assistantMessage = response.choices[0]?.message?.content ?? "I'm having trouble responding right now. Please try again.";

        // Update session messages
        if (session) {
          const newMessages = [
            ...history,
            { role: "user" as const, content: input.message, timestamp: Date.now() },
            { role: "assistant" as const, content: assistantMessage, timestamp: Date.now() },
          ];
          await updateTutorSessionMessages(session.id, newMessages);
        }

        return {
          message: assistantMessage,
          sessionId: session?.id ?? null,
        };
      }),

    getSession: protectedProcedure
      .input(z.object({
        unitId: z.number().optional(),
        lessonId: z.number().optional(),
        mode: z.enum(["teach", "practice", "quiz", "exam_review", "remediation", "parent_summary"]),
      }))
      .query(async ({ ctx, input }) => {
        return getOrCreateTutorSession(
          ctx.user.id,
          input.unitId ?? null,
          input.lessonId ?? null,
          input.mode
        );
      }),

    clearSession: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ input }) => {
        await updateTutorSessionMessages(input.sessionId, []);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
