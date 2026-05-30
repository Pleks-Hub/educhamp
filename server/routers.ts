import { COOKIE_NAME } from "@shared/const";
import { parentRouter, courseRequestTokenRouter } from "./routers/parent";
import { coParentRouter } from "./routers/coParent";
import { authEnhancementsRouter } from "./routers/authEnhancements";
import { parentToolsRouter } from "./routers/parentTools";
import { referralRouter } from "./routers/referral";
import { onboardingRouter } from "./routers/onboarding";
import { landingRouter } from "./routers/landing";
import { adminRouter } from "./routers/admin";
import { newsletterRouter } from "./routers/newsletter";
import { paymentRouter } from "./routers/payment";
import { gamificationRouter } from "./routers/gamification";
import { questionFlagsRouter } from "./routers/questionFlags";
import { coppaRouter } from "./routers/coppa";
import { awardXp } from "./gamification/xp";
import { checkAndAwardBadges } from "./gamification/badges";
import { recordActivity } from "./gamification/streaks";
import { updateQuestProgress } from "./gamification/quests";
import { awardHousePoints } from "./gamification/houses";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import { protectedProcedure, studentProcedure, publicProcedure, router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import {
  getAllDiagnosticQuestions,
  getDiagnosticQuestionsForCourse,
  getActiveCourseIdForUser,
  getAllDiagnosticAttempts,
  getAllSkills,
  getSkillsForCourse,
  getAllUnits,
  getLessonById,
  getLessonProgressForUser,
  getLessonsByUnit,
  getLatestDiagnosticAttempt,
  getLatestDiagnosticAttemptForCourse,
  getLatestQuizAttempt,
  getOrCreateTutorSession,
  getQuizAttemptsForUser,
  getQuizQuestionsByUnit,
  getSkillsByUnit,
  getUnitByNumber,
  getUserMastery,
  getUserUnitProgress,
  getUserUnitProgressForUnit,
  markLessonComplete,
  saveDiagnosticAttempt,
  saveQuizAttempt,
  updateTutorSessionMessages,
  listTutorSessions,
  upsertUnitProgress,
  upsertUserMastery,
  getParentsByChildId,
  getUnitsForCourse,
  getUserCourseEnrollments,
  getAllCourseProgressForUser,
  getCourseById,
  getCourseCooldownDays,
  getDb,
  writeMasteryRecordsForUnit,
} from "./db";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getMasteryLevel, getMasteryLabel, buildTutorSystemPrompt } from "./educhamp-helpers";

export const appRouter = router({
  system: systemRouter,
  admin: adminRouter,
  parent: parentRouter,
  courseRequest: courseRequestTokenRouter,
  coParent: coParentRouter,
  authEnhancements: authEnhancementsRouter,
  parentTools: parentToolsRouter,
  referral: referralRouter,
  onboarding: onboardingRouter,
  landing: landingRouter,
  newsletter: newsletterRouter,
  payment: paymentRouter,
  gamification: gamificationRouter,
  questionFlags: questionFlagsRouter,
  coppa: coppaRouter,

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

    getAllSkills: protectedProcedure.query(async ({ ctx }) => {
      const courseId = await getActiveCourseIdForUser(ctx.user.id);
      const rows = await getSkillsForCourse(courseId);
      // Flatten to the shape the frontend expects (same as the old Skill type)
      return rows.map((r) => r.skill);
    }),

    /**
     * Returns all units for a course with their lessons nested inside.
     * Used by the lesson navigator in the five-mode course dashboard.
     */
    getUnitsWithLessons: protectedProcedure
      .input(z.object({ courseId: z.number() }))
      .query(async ({ input }) => {
        const courseUnits = await getUnitsForCourse(input.courseId);
        const unitsWithLessons = await Promise.all(
          courseUnits.map(async (unit) => {
            const unitLessons = await getLessonsByUnit(unit.id);
            return {
              ...unit,
              lessons: unitLessons.map((l) => ({
                id: l.id,
                lessonNumber: l.lessonNumber,
                title: l.title,
                sortOrder: l.sortOrder,
              })),
            };
          })
        );
        return unitsWithLessons;
      }),
  }),

  // ─── Progress ────────────────────────────────────────────────────────────────
  progress: router({
    getDashboard: protectedProcedure.query(async ({ ctx }) => {
      const userId = ctx.user.id;

      // Determine which course to show: use the student's current active enrollment.
      // If a student has no enrollments yet, auto-enroll them in a grade-appropriate
      // default course so the dashboard is never empty on first login.
      let enrollments = await getUserCourseEnrollments(userId);
      let wasAutoEnrolled = false;
      if (enrollments.length === 0 && ctx.user.accountType === "student") {
        const { getGradeDefaultCourse: _getDefault, enrollUserInCourse: _enroll, setUserActiveCourse: _setActive } = await import("./db");
        const defaultCourse = await _getDefault(ctx.user.grade ?? "9");
        const defaultCourseId = defaultCourse?.id ?? 1;
        await _enroll(userId, defaultCourseId);
        await _setActive(userId, defaultCourseId);
        enrollments = await getUserCourseEnrollments(userId);
        wasAutoEnrolled = true;
      }
      const currentEnrollmentForInit = enrollments.find((e) => e.enrollment.isCurrent) ?? enrollments[0];
      const initCourseId = currentEnrollmentForInit?.enrollment.courseId ?? 1;
      // On first load with no unit progress, unlock the first 2 units so students can start immediately
      // (before taking the diagnostic). After diagnostic, all units get unlocked.
      const existingProgress = await getUserUnitProgress(userId);
      if (existingProgress.length === 0 && ctx.user.accountType === "student") {
        const initUnits = await getUnitsForCourse(initCourseId);
        const sorted = initUnits.sort((a, b) => a.sortOrder - b.sortOrder);
        // Unlock first 2 units
        for (const unit of sorted.slice(0, 2)) {
          await upsertUnitProgress(userId, unit.id, unit.unitNumber, { status: "in_progress" });
        }
      }
      const currentEnrollment = enrollments.find((e) => e.enrollment.isCurrent) ?? enrollments[0];
      const activeCourseId = currentEnrollment?.enrollment.courseId ?? 1;

      const [courseUnits, unitProgressData, masteryData, quizAttemptsData] = await Promise.all([
        getUnitsForCourse(activeCourseId),
        getUserUnitProgress(userId),
        getUserMastery(userId),
        getQuizAttemptsForUser(userId),
      ]);

      const progressMap = new Map(unitProgressData.map((p) => [p.unitId, p]));
      const masteryMap = new Map(masteryData.map((m) => [m.skillId, m]));

      // Sort units by sortOrder
      const allUnits = courseUnits.sort((a, b) => a.sortOrder - b.sortOrder);

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

            // Count only units in the active course for completedUnits/inProgressUnits
      const activeUnitIds = new Set(allUnits.map((u) => u.id));
      const completedUnits = unitProgressData.filter((p) => activeUnitIds.has(p.unitId) && p.status === "completed").length;
      const inProgressUnits = unitProgressData.filter((p) => activeUnitIds.has(p.unitId) && (p.status === "in_progress" || p.status === "quiz_unlocked")).length;
      const latestDiag = await getLatestDiagnosticAttemptForCourse(ctx.user.id, activeCourseId);
      return {
        units: unitsWithProgress,
        mastery: masteryData,
        overallMastery,
        completedUnits,
        inProgressUnits,
        totalUnits: allUnits.length,
        recentQuizAttempts: quizAttemptsData.slice(0, 5),
        courseTitle: currentEnrollment?.course?.title ?? "Course",
        courseSubject: currentEnrollment?.course?.subject ?? "other",
        courseGradeLevel: currentEnrollment?.course?.gradeLevel ?? "",
        courseTeksCode: currentEnrollment?.course?.teksCode ?? null,
        courseDescription: currentEnrollment?.course?.description ?? null,
        courseCode: currentEnrollment?.course?.courseCode ?? "",
        activeCourseId,
        hasDiagnosticForActiveCourse: latestDiag !== null,
        diagnosticCooldownDays: currentEnrollment?.course?.diagnosticCooldownDays ?? 7,
        isTimedExam: currentEnrollment?.course?.isTimedExam ?? false,
        timeLimitMinutes: currentEnrollment?.course?.timeLimitMinutes ?? null,
        wasAutoEnrolled,
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

    getAllCourseProgress: protectedProcedure.query(async ({ ctx }) => {
      return getAllCourseProgressForUser(ctx.user.id);
    }),

    switchActiveCourse: protectedProcedure
      .input(z.object({ courseId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { setUserActiveCourse } = await import("./db");
        await setUserActiveCourse(ctx.user.id, input.courseId);
        return { success: true };
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

        // ── Gamification side-effects (fire-and-forget) ──────────────────
        Promise.all([
          awardXp(ctx.user.id, "lesson_complete", 50, `lesson_${input.lessonId}`, "Lesson completed"),
          recordActivity(ctx.user.id),
          updateQuestProgress(ctx.user.id, "lessons_completed", 1),
          updateQuestProgress(ctx.user.id, "xp_earned", 50),
          awardHousePoints(ctx.user.id, 10),
          checkAndAwardBadges(ctx.user.id, { type: "lesson_complete", lessonCount: 1 }),
        ]).catch(() => {});

        // Re-fetch AFTER the mark so the count is accurate (no +1 double-count)
        const [lessonProgress, allLessons] = await Promise.all([
          getLessonProgressForUser(ctx.user.id, input.unitId),
          getLessonsByUnit(input.unitId),
        ]);
        const completedCount = Math.min(
          lessonProgress.filter((l) => l.completed).length,
          allLessons.length
        );
        const allDone = completedCount >= allLessons.length && allLessons.length > 0;
        await upsertUnitProgress(ctx.user.id, input.unitId, input.unitNumber, {
          status: allDone ? "quiz_unlocked" : "in_progress",
          lessonsCompleted: completedCount,
          totalLessons: allLessons.length,
        });
        return { success: true, allLessonsComplete: allDone };
      }),
  }),

  // ─── Quiz ─────────────────────────────────────────────────────────────────────
  quiz: router({
    getQuestions: studentProcedure
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
          questionTimings: z.array(z.object({ questionId: z.number(), seconds: z.number() })).optional(),
          isPracticeMode: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const questions = await getQuizQuestionsByUnit(input.unitId);
        const questionMap = new Map(questions.map((q) => [q.id, q]));

        // Normalise quiz answers: strip spaces, lowercase, strip trailing .0, accept comma-sorted sets
        function normaliseQuizAnswer(raw: string): string {
          return raw.trim().toLowerCase().replace(/\s+/g, "");
        }
        function quizAnswersMatch(student: string, correct: string): boolean {
          const s = normaliseQuizAnswer(student);
          const c = normaliseQuizAnswer(correct);
          if (s === c) return true;
          const stripDot0 = (v: string) => v.replace(/\.0+$/, "");
          if (stripDot0(s) === stripDot0(c)) return true;
          const sParts = s.split(",").map((p) => p.trim()).sort();
          const cParts = c.split(",").map((p) => p.trim()).sort();
          if (sParts.join(",") === cParts.join(",")) return true;
          const numericMatch = s.replace(/^[a-z]=/i, "");
          if (numericMatch === c || stripDot0(numericMatch) === stripDot0(c)) return true;
          return false;
        }

        const gradedAnswers = input.answers.map((a) => {
          const q = questionMap.get(a.questionId);
          if (!q) return { questionId: a.questionId, answer: a.answer, correct: false };
          const correct = quizAnswersMatch(a.answer, q.correctAnswer);
          return { questionId: a.questionId, answer: a.answer, correct };
        });

        const correctCount = gradedAnswers.filter((a) => a.correct).length;
        const score = Math.round((correctCount / questions.length) * 100);

        const isPractice = input.isPracticeMode ?? false;

        // Save quiz attempt
        await saveQuizAttempt(
          ctx.user.id,
          input.unitId,
          input.unitNumber,
          gradedAnswers,
          score,
          questions.length,
          correctCount,
          input.questionTimings,
          isPractice
        );

        // Practice mode: skip all mastery/progress/gamification side-effects
        if (isPractice) {
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
            masteryLabel: getMasteryLabel(score),
            xpAwarded: 0,
            isPracticeMode: true,
            adaptivePath: "Practice mode — this attempt does not affect your mastery score or progress.",
          };
        }

        // Update unit progress based on score
        let newStatus: "locked" | "in_progress" | "quiz_unlocked" | "completed" = "in_progress";
        if (score >= 75) newStatus = "completed";

        await upsertUnitProgress(ctx.user.id, input.unitId, input.unitNumber, {
          status: newStatus,
          quizScore: score,
          quizAttempts: 1,
        });

        // If this unit is now completed, unlock the next unit in the same course
        if (newStatus === "completed") {
          const unit = await getUnitByNumber(input.unitNumber);
          if (unit?.courseId) {
            const courseUnits = await getUnitsForCourse(unit.courseId);
            const sortedUnits = courseUnits.sort((a, b) => a.sortOrder - b.sortOrder);
            const currentIdx = sortedUnits.findIndex((u) => u.id === input.unitId);
            const nextUnit = sortedUnits[currentIdx + 1];
            if (nextUnit) {
              const nextProgress = await getUserUnitProgressForUnit(ctx.user.id, nextUnit.id);
              // Only unlock if the next unit is still locked (don't downgrade in_progress/completed)
              if (!nextProgress || nextProgress.status === "locked") {
                const nextLessons = await getLessonsByUnit(nextUnit.id);
                await upsertUnitProgress(ctx.user.id, nextUnit.id, nextUnit.unitNumber, {
                  status: "in_progress",
                  lessonsCompleted: 0,
                  totalLessons: nextLessons.length,
                });
              }
            }
          }
        }

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

        // Phase 2: Dual-write masteryRecords (non-fatal — runs alongside userMastery)
        await writeMasteryRecordsForUnit(ctx.user.id, input.unitId, score, "quiz").catch(() => {});

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

        // ── Gamification side-effects for quiz completion ────────────────
        const quizXp = score >= 90 ? 200 : score >= 75 ? 150 : score >= 60 ? 75 : 25;
        Promise.all([
          awardXp(ctx.user.id, score >= 75 ? "quiz_pass" : "lesson_complete", quizXp, `quiz_${input.unitId}_${Date.now()}`, `Quiz: Unit ${input.unitNumber} (${score}%)`),
          recordActivity(ctx.user.id),
          updateQuestProgress(ctx.user.id, "quizzes_passed", score >= 75 ? 1 : 0),
          updateQuestProgress(ctx.user.id, "xp_earned", quizXp),
          awardHousePoints(ctx.user.id, score >= 75 ? 25 : 5),
          checkAndAwardBadges(ctx.user.id, { type: "quiz_pass", score, quizAttemptCount: 1 }),
          ...(newStatus === "completed" ? [checkAndAwardBadges(ctx.user.id, { type: "unit_complete" })] : []),
        ]).catch(() => {});

        return {
          score,
          correctCount,
          totalQuestions: questions.length,
          results,
          masteryLabel,
          xpAwarded: quizXp,
          isPracticeMode: false,
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
      .input(z.object({ seed: z.string().optional(), courseId: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const resolvedCourseId = input?.courseId ?? await getActiveCourseIdForUser(ctx.user.id);
        const allQuestions = await getDiagnosticQuestionsForCourse(resolvedCourseId);

        // Group questions by mapsToUnit.
        // Normalise: "Unit 3" → "3", "prerequisite" stays, full-title strings stay as-is.
        function normaliseUnit(raw: string): string {
          if (!raw) return raw;
          const lower = raw.trim().toLowerCase();
          if (lower === "prerequisite") return "prerequisite";
          const unitMatch = raw.trim().match(/^[Uu]nit\s+(\d+)$/);
          if (unitMatch) return unitMatch[1];
          return raw.trim();
        }
        const groups = new Map<string, typeof allQuestions>();
        for (const q of allQuestions) {
          const key = normaliseUnit(q.mapsToUnit);
          const g = groups.get(key) ?? [];
          g.push(q);
          groups.set(key, g);
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
          courseId: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const resolvedCourseId = input.courseId ?? await getActiveCourseIdForUser(ctx.user.id);
        const questions = await getDiagnosticQuestionsForCourse(resolvedCourseId);
        const questionMap = new Map(questions.map((q) => [q.questionId, q]));

        const gradedAnswers = input.answers.map((a) => {
          const q = questionMap.get(a.questionId);
          if (!q) return { questionId: a.questionId, answer: a.answer, correct: false };
          const correct = a.answer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
          return { questionId: a.questionId, answer: a.answer, correct };
        });

        // Score prerequisite questions (DIAG-001 to DIAG-006)
        // Normalise mapsToUnit for scoring (same logic as getQuestions)
        function normUnit(raw: string | null | undefined): string {
          if (!raw) return "";
          const lower = raw.trim().toLowerCase();
          if (lower === "prerequisite") return "prerequisite";
          const m = raw.trim().match(/^[Uu]nit\s+(\d+)$/);
          if (m) return m[1];
          return raw.trim();
        }
        const prereqAnswers = gradedAnswers.filter((a) => {
          const q = questionMap.get(a.questionId);
          return normUnit(q?.mapsToUnit) === "prerequisite";
        });
        // AP/advanced courses may have no prerequisite questions — treat as passing
        const prerequisiteScore = prereqAnswers.length > 0
          ? prereqAnswers.filter((a) => a.correct).length
          : 6; // auto-pass prereq gate for courses without prerequisite questions

        // Score per unit
        const unitResults: {
          unitNumber: number;
          unitTitle: string;
          correct: number;
          total: number;
          status: "likely_mastered" | "partial_understanding" | "needs_instruction";
          recommendation: string;
        }[] = [];

        const allUnits = await getUnitsForCourse(resolvedCourseId);
        const unitMap = new Map(allUnits.map((u) => [String(u.unitNumber), u]));

        for (let i = 1; i <= 12; i++) {
          const unitAnswers = gradedAnswers.filter((a) => {
            const q = questionMap.get(a.questionId);
            return normUnit(q?.mapsToUnit) === String(i);
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
            "Foundational gaps detected. Recommend reviewing prerequisite concepts before starting this course.";
        } else {
          const firstGap = unitResults.find((u) => u.status === "needs_instruction");
          placementRecommendation = firstGap
            ? `Ready to begin. Recommend starting at Unit ${firstGap.unitNumber}: ${firstGap.unitTitle}.`
            : "Strong foundation across all units. Begin with Unit 1 and use unit quizzes to confirm mastery before advancing.";
        }

        await saveDiagnosticAttempt(
          ctx.user.id,
          gradedAnswers,
          unitResults,
          prerequisiteScore,
          overallScore,
          placementRecommendation,
          resolvedCourseId
        );

        // Phase 2: Dual-write masteryRecords for all assessed units (non-fatal)
        for (const unitResult of unitResults) {
          const assessedUnit = allUnits.find((u) => u.unitNumber === unitResult.unitNumber);
          if (assessedUnit) {
            const unitScore = Math.round(
              unitResult.total > 0 ? (unitResult.correct / unitResult.total) * 100 : 0
            );
            await writeMasteryRecordsForUnit(ctx.user.id, assessedUnit.id, unitScore, "diagnostic").catch(() => {});
          }
        }

        // Initialize unit progress for all units based on diagnostic results.
        // - likely_mastered → quiz_unlocked (can skip straight to quiz)
        // - partial_understanding → in_progress (unlock to study)
        // - needs_instruction → in_progress (unlock to study)
        // All units are unlocked so students can choose their own starting point.
        for (const unit of allUnits) {
          const unitResult = unitResults.find((r) => r.unitNumber === unit.unitNumber);
          if (unitResult?.status === "likely_mastered") {
            await upsertUnitProgress(ctx.user.id, unit.id, unit.unitNumber, {
              status: "quiz_unlocked",
            });
          } else {
            // Unlock all other units so the student can choose where to start
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

    getLatestAttempt: protectedProcedure
      .input(z.object({ courseId: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const resolvedCourseId = input?.courseId ?? await getActiveCourseIdForUser(ctx.user.id);
        const attempt = await getLatestDiagnosticAttemptForCourse(ctx.user.id, resolvedCourseId);
        const cooldownDays = await getCourseCooldownDays(resolvedCourseId);
        return attempt ? { ...attempt, cooldownDays } : null;
      }),

    getAllAttempts: protectedProcedure.query(async ({ ctx }) => {
      return getAllDiagnosticAttempts(ctx.user.id);
    }),

    /**
     * Submit pre-graded results from the visual/audio early diagnostic (Pre-K through Grade 2).
     * Unlike submitDiagnostic, this accepts already-graded answers from the client-side question bank.
     */
    saveDiagnosticResults: studentProcedure
      .input(
        z.object({
          score: z.number().min(0).max(100),
          recommendation: z.string().max(512),
          unitResults: z.array(
            z.object({
              unit: z.string(),
              score: z.number().min(0).max(100),
              ready: z.boolean(),
            })
          ),
          courseId: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const resolvedCourseId = input.courseId ?? await getActiveCourseIdForUser(ctx.user.id);
        // Build a minimal gradedAnswers array for saveDiagnosticAttempt
        const gradedAnswers = input.unitResults.map((r, i) => ({
          questionId: `early-${i}`,
          answer: r.ready ? "correct" : "incorrect",
          correct: r.ready,
        }));
        const unitResultsForSave = input.unitResults.map((r, i) => ({
          unitNumber: i + 1,
          unitTitle: r.unit,
          correct: r.ready ? 1 : 0,
          total: 1,
          status: (r.ready ? "likely_mastered" : "needs_instruction") as
            | "likely_mastered"
            | "partial_understanding"
            | "needs_instruction",
          recommendation: r.ready
            ? "Likely mastered — verify with unit quiz before advancing."
            : "Needs full instruction — begin with Unit 1 or earliest gap.",
        }));
        await saveDiagnosticAttempt(
          ctx.user.id,
          gradedAnswers,
          unitResultsForSave,
          input.score >= 70 ? 6 : 2, // prerequisiteScore proxy
          input.score,
          input.recommendation,
          resolvedCourseId
        );
        // Phase 2: Dual-write masteryRecords for early-learner diagnostic (non-fatal)
        // unitResultsForSave already has unitNumber (i+1) and correct/total fields
        try {
          const courseUnits = await getUnitsForCourse(resolvedCourseId);
          for (const ur of unitResultsForSave) {
            const assessedUnit = courseUnits.find((u) => u.unitNumber === ur.unitNumber);
            if (assessedUnit) {
              const unitScore = ur.correct >= 1 ? 85 : 45; // ready = approaching mastery, not ready = needs instruction
              await writeMasteryRecordsForUnit(ctx.user.id, assessedUnit.id, unitScore, "diagnostic").catch(() => {});
            }
          }
        } catch { /* non-fatal */ }
        return { success: true, score: input.score };
      }),
  }),

  // ─── AI Tutor ─────────────────────────────────────────────────────────────────
  tutor: router({
    chat: protectedProcedure
      .input(
        z.object({
          message: z.string().min(1).max(2000),
          mode: z.enum(["teach", "practice", "quiz", "exam_review", "exam_prep", "remediation", "parent_summary", "misconception_drill"]),
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
        // Fetch active course for course-scoped guardrails
        const activeCourseId = await getActiveCourseIdForUser(ctx.user.id);
        const activeCourse = activeCourseId ? await getCourseById(activeCourseId) : null;
        // Build system prompt with full course context
        const systemPrompt = buildTutorSystemPrompt(
          ctx.user.name ?? "Student",
          input.mode,
          currentUnit?.title ?? "",
          masteryData.map((m) => ({ skillId: m.skillId, score: m.score })),
          activeCourse ? {
            courseContext: {
              title: activeCourse.title,
              courseCode: activeCourse.courseCode ?? "",
              subject: activeCourse.subject ?? "other",
              gradeLevel: activeCourse.gradeLevel ?? "",
              teksCode: activeCourse.teksCode ?? undefined,
            },
            currentUnitNumber: input.unitNumber,
          } : undefined
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

        // Update session messages — cap at 100 messages (50 turns) to prevent unbounded growth (P1-10)
        if (session) {
          const MAX_STORED_MESSAGES = 100;
          const newMessages = [
            ...history,
            { role: "user" as const, content: input.message, timestamp: Date.now() },
            { role: "assistant" as const, content: assistantMessage, timestamp: Date.now() },
          ].slice(-MAX_STORED_MESSAGES);
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
        mode: z.enum(["teach", "practice", "quiz", "exam_review", "exam_prep", "remediation", "parent_summary", "misconception_drill"]),
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

    listSessions: protectedProcedure
      .input(
        z.object({
          unitId: z.number().optional(),
          mode: z.enum(["teach", "practice", "quiz", "exam_review", "exam_prep", "remediation", "parent_summary", "misconception_drill"]).optional(),
          fromDate: z.date().optional(),
          toDate: z.date().optional(),
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        return listTutorSessions(ctx.user.id, {
          unitId: input.unitId,
          mode: input.mode,
          fromDate: input.fromDate,
          toDate: input.toDate,
          limit: input.limit,
          offset: input.offset,
        });
      }),
  }),

  // ─── Course Requests (Student-facing) ──────────────────────────────────────────
  courses: router({
    /**
     * Student: request access to a course. Creates a pending request and emails the parent.
     */
    requestCourse: protectedProcedure
      .input(z.object({ courseId: z.number(), origin: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const { createCourseRequest: doCreate, getParentsByChildId, getCourseById: getCourse } = await import("./db");
        const { buildCourseRequestNotificationEmail } = await import("./emailTemplates/courseRequestNotification");
        const { sendEmail } = await import("./emailService");

        const course = await getCourse(input.courseId);
        if (!course) throw new TRPCError({ code: "NOT_FOUND", message: "Course not found." });

        const reqResult = await doCreate(ctx.user.id, input.courseId, ctx.user.id);
        if (reqResult.alreadyExists) {
          return { success: true, alreadyExists: true, requestId: reqResult.request.id };
        }

        // Notify all linked parents
        const parents = await getParentsByChildId(ctx.user.id);
        const newReq = reqResult.request as { id: number; approveToken: string; tokenExpiresAt: Date };
        for (const parent of parents) {
          if (!parent.parentEmail) continue;
          const approveUrl = `${input.origin}/api/course-request/token?token=${newReq.approveToken}&action=approve`;
          const rejectUrl = `${input.origin}/api/course-request/token?token=${newReq.approveToken}&action=reject`;
          const dashboardUrl = `${input.origin}/parent`;
          const email = buildCourseRequestNotificationEmail({
            parentName: parent.parentName ?? "Parent",
            studentName: ctx.user.name ?? "Your student",
            courseName: course.title,
            requestedAt: new Date(),
            approveUrl,
            rejectUrl,
            dashboardUrl,
          });
          await sendEmail({
            to: parent.parentEmail,
            subject: email.subject,
            html: email.html,
            text: email.text,
            templateName: "courseRequestNotification",
            referenceId: `course-request-${newReq.id}`,
          });
        }
        return { success: true, alreadyExists: false, requestId: newReq.id };
      }),

    /**
     * Student: get all their own course requests with status.
     */
    getMyCourseRequests: protectedProcedure.query(async ({ ctx }) => {
      const { getCourseRequestsForStudent } = await import("./db");
      const rows = await getCourseRequestsForStudent(ctx.user.id);
      return rows.map((r) => ({
        id: r.request.id,
        courseId: r.request.courseId,
        courseName: r.course.title,
        status: r.request.status,
        rejectionReason: r.request.rejectionReason,
        approvedAt: r.request.approvedAt,
        rejectedAt: r.request.rejectedAt,
        createdAt: r.request.createdAt,
      }));
    }),

    /**
     * Student: cancel their own pending course request.
     */
    cancelCourseRequest: protectedProcedure
      .input(z.object({ requestId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { getCourseRequestById: getReq, cancelCourseRequest: doCancel } = await import("./db");
        const request = await getReq(input.requestId);
        if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found." });
        if (request.requestedBy !== ctx.user.id && request.studentId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You cannot cancel this request." });
        }
        if (request.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "Only pending requests can be cancelled." });
        await doCancel(input.requestId);
        return { success: true };
      }),

    /**
     * Admin: get all course requests with full audit trail.
     */
    adminGetAllRequests: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().default(0),
        status: z.enum(["pending", "approved", "rejected", "cancelled", "all"]).default("all"),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const { getAllCourseRequestsAdmin } = await import("./db");
        const statusFilter = input.status === "all" ? undefined : input.status;
        const rows = await getAllCourseRequestsAdmin(input.limit, input.offset, statusFilter);
        return rows.map((r) => ({
          id: r.request.id,
          studentId: r.request.studentId,
          studentName: r.student.name,
          studentEmail: r.student.email,
          courseId: r.request.courseId,
          courseName: r.course.title,
          status: r.request.status,
          requestedBy: r.request.requestedBy,
          approvedBy: r.request.approvedBy,
          rejectedBy: r.request.rejectedBy,
          rejectionReason: r.request.rejectionReason,
          approvedAt: r.request.approvedAt,
          rejectedAt: r.request.rejectedAt,
          createdAt: r.request.createdAt,
        }));
      }),

    /**
     * Returns the next unstarted lesson for the authenticated student in a given course.
     * Iterates units in sortOrder, then lessons in sortOrder within each unit.
     * Returns the first lesson that has no lessonProgress row (or completed=false).
     * If all lessons are complete, returns null.
     */
    getNextLesson: protectedProcedure
      .input(z.object({ courseId: z.number() }))
      .query(async ({ ctx, input }) => {
        const { getUnitsForCourse, getLessonsByUnit, getLessonProgressForUser } = await import("./db");
        const courseUnits = await getUnitsForCourse(input.courseId);
        for (const unit of courseUnits) {
          const unitLessons = await getLessonsByUnit(unit.id);
          if (unitLessons.length === 0) continue;
          const progressRows = await getLessonProgressForUser(ctx.user.id, unit.id);
          const completedIds = new Set(progressRows.filter((p) => p.completed).map((p) => p.lessonId));
          const nextLesson = unitLessons.find((l) => !completedIds.has(l.id));
          if (nextLesson) {
            return {
              lessonId: nextLesson.id,
              lessonNumber: nextLesson.lessonNumber,
              lessonTitle: nextLesson.title,
              unitId: unit.id,
              unitNumber: unit.unitNumber,
              unitTitle: unit.title,
              courseId: input.courseId,
            };
          }
        }
        // All lessons complete
        return null;
      }),
  }),

  // ─── Student Re-Engagement ─────────────────────────────────────────────────
  student: router({
    /**
     * Returns re-engagement context for a student inactive 7+ days.
     * Used by the WelcomeBackBanner component on the Dashboard.
     */
    getReEngagementContext: protectedProcedure.query(async ({ ctx }) => {
      const user = ctx.user;
      const lastActiveAt = user.lastActiveAt ?? user.lastSignedIn;
      const now = Date.now();
      const daysSinceActive = lastActiveAt
        ? Math.floor((now - new Date(lastActiveAt).getTime()) / 86_400_000)
        : 0;
      if (daysSinceActive < 7) {
        return { isInactive: false, daysSinceActive, lastLesson: null, lastCompletedActivity: null };
      }
      const db = await getDb();
      if (!db) return { isInactive: true, daysSinceActive, lastLesson: null, lastCompletedActivity: null };
      const { lessonProgress: lpTable, lessons: lessonsTable, units } = await import("../drizzle/schema");
      const { desc: descOp, eq: eqOp } = await import("drizzle-orm");
      const recentProgress = await db
        .select()
        .from(lpTable)
        .where(eqOp(lpTable.userId, user.id))
        .orderBy(descOp(lpTable.updatedAt))
        .limit(1);
      let lastLesson: { id: number; title: string; unitTitle: string; unitId: number } | null = null;
      let lastCompletedActivity: string | null = null;
      if (recentProgress.length > 0) {
        const lp = recentProgress[0];
        const lessonRows = await db
          .select({ id: lessonsTable.id, title: lessonsTable.title, unitId: lessonsTable.unitId })
          .from(lessonsTable)
          .where(eqOp(lessonsTable.id, lp.lessonId))
          .limit(1);
        if (lessonRows.length > 0) {
          const lesson = lessonRows[0];
          const unitRows = await db
            .select({ id: units.id, title: units.title })
            .from(units)
            .where(eqOp(units.id, lesson.unitId))
            .limit(1);
          const unitTitle = unitRows[0]?.title ?? "Unit";
          lastLesson = { id: lesson.id, title: lesson.title, unitTitle, unitId: lesson.unitId };
          if (lp.completed) lastCompletedActivity = `Completed: ${lesson.title}`;
          else if (lp.independentCompleted) lastCompletedActivity = `Independent practice: ${lesson.title}`;
          else if (lp.guidedCompleted) lastCompletedActivity = `Guided practice: ${lesson.title}`;
          else lastCompletedActivity = `Started: ${lesson.title}`;
        }
      }
      return { isInactive: true, daysSinceActive, lastLesson, lastCompletedActivity };
    }),
  }),

  // ─── In-App Notifications ────────────────────────────────────────────────────
  notifications: router({
    getMyNotifications: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(50).default(20),
        onlyUnread: z.boolean().default(false),
      }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return { notifications: [], unreadCount: 0 };
        const { userNotifications } = await import("../drizzle/schema");
        const { eq, and, desc } = await import("drizzle-orm");
        const conditions: ReturnType<typeof eq>[] = [eq(userNotifications.userId, ctx.user.id)];
        if (input.onlyUnread) conditions.push(eq(userNotifications.isRead, false));
        const rows = await db.select().from(userNotifications)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .orderBy(desc(userNotifications.createdAt))
          .limit(input.limit);
        const unreadCount = rows.filter((r) => !r.isRead).length;
        return { notifications: rows, unreadCount };
      }),

    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return { success: false };
        const { userNotifications } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        await db.update(userNotifications)
          .set({ isRead: true })
          .where(and(eq(userNotifications.id, input.id), eq(userNotifications.userId, ctx.user.id)));
        return { success: true };
      }),

    markAllRead: protectedProcedure
      .mutation(async ({ ctx }) => {
        const db = await getDb();
        if (!db) return { success: false };
        const { userNotifications } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        await db.update(userNotifications)
          .set({ isRead: true })
          .where(eq(userNotifications.userId, ctx.user.id));
        return { success: true };
      }),
  }),

  // ─── Exam Prep ─────────────────────────────────────────────────────────────
  examPrep: router({
    /**
     * Start an exam prep session: calls buildExamReview() and returns the
     * question set with template metadata. Correct answers are stripped from
     * the response so they cannot be read from the network tab.
     */
    start: studentProcedure
      .input(z.object({ courseId: z.number() }))
      .query(async ({ ctx, input }) => {
        const { buildExamReview } = await import("./db");
        const result = await buildExamReview(ctx.user.id, input.courseId);
        if (!result) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "No exam template found for this course. Please check back later.",
          });
        }
        // Strip correct answers before sending to client
        const clientItems = result.items.map((item) => ({
          id: item.id,
          questionText: item.questionText,
          questionType: item.questionType,
          choices: item.choices,
          skillTag: item.skillTag,
          difficulty: item.difficulty,
          unitId: item.unitId,
          unitTitle: item.unitTitle,
        }));
        return {
          templateId: result.templateId,
          templateName: result.templateName,
          assessmentRegime: result.assessmentRegime,
          itemCount: result.itemCount,
          timeLimitMinutes: result.timeLimitMinutes,
          thinBankWarning: result.thinBankWarning,
          studentNote: result.studentNote,
          items: clientItems,
        };
      }),

    /**
     * Submit answers for an exam prep session.
     * Accepts an array of { questionId, answer } pairs, grades them server-side
     * against the question bank, and returns per-question feedback + summary.
     */
    submit: studentProcedure
      .input(
        z.object({
          courseId: z.number(),
          answers: z.array(
            z.object({
              questionId: z.number(),
              answer: z.string(),
            })
          ),
          timeTakenSeconds: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { quizQuestions } = await import("../drizzle/schema");
        const { inArray } = await import("drizzle-orm");

        const questionIds = input.answers.map((a) => a.questionId);
        if (questionIds.length === 0) return { results: [], score: 0, total: 0, percentage: 0 };

        // Fetch correct answers from DB
        const questions = await db
          .select({
            id: quizQuestions.id,
            correctAnswer: quizQuestions.correctAnswer,
            explanation: quizQuestions.explanation,
            questionText: quizQuestions.questionText,
            difficulty: quizQuestions.difficulty,
            skillTag: quizQuestions.skillTag,
          })
          .from(quizQuestions)
          .where(inArray(quizQuestions.id, questionIds));

        const qMap = new Map(questions.map((q) => [q.id, q]));

        let correct = 0;
        const results = input.answers.map((a) => {
          const q = qMap.get(a.questionId);
          if (!q) return { questionId: a.questionId, isCorrect: false, correctAnswer: "", explanation: "", difficulty: "medium" as const, skillTag: "" };
          const isCorrect = a.answer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
          if (isCorrect) correct++;
          return {
            questionId: a.questionId,
            isCorrect,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            difficulty: q.difficulty as "easy" | "medium" | "hard" | "challenge",
            skillTag: q.skillTag,
          };
        });

        const total = results.length;
        const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

        // Award XP: 5 XP per correct answer
        if (correct > 0) {
          try {
            await awardXp(ctx.user.id, "exam_prep_session", correct * 5);
          } catch { /* non-fatal */ }
        }

                return { results, score: correct, total, percentage };
      }),

    /**
     * Lightweight query for the mode selector tile: returns EOC template name,
     * item count, and standards coverage without building a full question set.
     */
    getInfo: studentProcedure
      .input(z.object({ courseId: z.number() }))
      .query(async ({ ctx: _ctx, input }) => {
        const db = await getDb();
        if (!db) return null;
        const { assessmentTemplates } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        const templates = await db
          .select()
          .from(assessmentTemplates)
          .where(
            and(
              eq(assessmentTemplates.courseId, input.courseId),
              eq(assessmentTemplates.assessmentRegime, "staar_eoc")
            )
          )
          .limit(1);
        const template = templates[0];
        if (!template) return null;
        return {
          templateName: template.name,
          itemCount: template.itemCount,
          assessmentRegime: template.assessmentRegime,
        };
      }),
  }),
});
export type AppRouter = typeof appRouter;
