/**
 * /api/tutor/stream  — Server-Sent Events endpoint for token-by-token AI tutor streaming.
 *
 * Accepts a POST with JSON body:
 *   { message, mode, unitId?, unitNumber?, lessonId?, sessionId? }
 * Requires a valid session cookie (same auth as tRPC protected procedures).
 *
 * Streams back SSE events:
 *   data: {"type":"token","content":"..."}\n\n
 *   data: {"type":"done","sessionId":N}\n\n
 *   data: {"type":"error","message":"..."}\n\n
 */

import type { Express, Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";
import { notifyOwner } from "./_core/notification";
import { buildTutorSystemPrompt } from "./educhamp-helpers";
import {
  getOrCreateTutorSession,
  updateTutorSessionMessages,
  getUserMastery,
  getAllUnits,
  getLatestDiagnosticAttempt,
  getQuizAttemptsForUser,
  getUserUnitProgress,
  getLessonsByUnit,
  getUserCourseEnrollments,
  getActiveCourseIdForUser,
} from "./db";

type TutorMode = "teach" | "practice" | "quiz" | "exam_review" | "remediation" | "parent_summary";

const VALID_MODES = new Set<string>(["teach", "practice", "quiz", "exam_review", "remediation", "parent_summary"]);

function resolveApiUrl(): string {
  const base = ENV.forgeApiUrl || "https://api.manus.im";
  return `${base}/v1/chat/completions`;
}

export function registerTutorStreamRoute(app: Express) {
  app.post("/api/tutor/stream", async (req: Request, res: Response) => {
    // ── Auth ──────────────────────────────────────────────────────────────────
    let user: Awaited<ReturnType<typeof sdk.authenticateRequest>> | null = null;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      user = null;
    }
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const {
      message,
      mode: rawMode,
      unitId,
      unitNumber,
      lessonId,
      sessionId: inputSessionId,
      childId,
    } = req.body as {
      message: string;
      mode: string;
      unitId?: number;
      unitNumber?: number;
      lessonId?: number;
      sessionId?: number;
      childId?: number;
    };

    // When a parent opens the tutor with a childId, load the child's data instead
    // Verify the parent has access to this child before proceeding
    let contextUserId = user.id;
    let contextUserName = user.name ?? "Student";
    let parentGoalContext: { goalCategory?: string; goalDetail?: string; signupReason?: string } | undefined;
    let studentDemographics: { schoolType?: string; gradeLevel?: string; schoolDistrict?: string } | undefined;

    if (childId && childId !== user.id) {
      const { getParentChildLink, getUserById, getUserProfile } = await import("./db");
      const link = await getParentChildLink(user.id, childId).catch(() => null);
      if (link && link.isActive) {
        const childUser = await getUserById(childId).catch(() => null);
        if (childUser) {
          contextUserId = childId;
          contextUserName = link.nickname ?? childUser.name ?? "Student";
        }
        // Load parent's goal context
        const parentProfile = await getUserProfile(user.id).catch(() => null);
        if (parentProfile?.parentGoalCategory || parentProfile?.parentGoalDetail) {
          parentGoalContext = {
            goalCategory: parentProfile.parentGoalCategory ?? undefined,
            goalDetail: parentProfile.parentGoalDetail ?? undefined,
            signupReason: parentProfile.parentSignupReason ?? undefined,
          };
        }
        // Load student demographics
        const childProfile = await getUserProfile(contextUserId).catch(() => null);
        if (childProfile) {
          studentDemographics = {
            schoolType: childProfile.schoolType ?? undefined,
            gradeLevel: childProfile.gradeLevel ?? undefined,
            schoolDistrict: childProfile.schoolDistrict ?? undefined,
          };
        }
      }
    } else {
      // Student accessing their own tutor — load their demographics
      const { getUserProfile } = await import("./db");
      const profile = await getUserProfile(user.id).catch(() => null);
      if (profile) {
        studentDemographics = {
          schoolType: profile.schoolType ?? undefined,
          gradeLevel: profile.gradeLevel ?? undefined,
          schoolDistrict: profile.schoolDistrict ?? undefined,
        };
      }
    }

    if (!message || !rawMode) {
      res.status(400).json({ error: "message and mode are required" });
      return;
    }
    // Enforce max message length to prevent oversized LLM payloads
    if (typeof message !== "string" || message.length > 4000) {
      res.status(400).json({ error: "Message too long. Maximum 4000 characters." });
      return;
    }
    const mode = VALID_MODES.has(rawMode) ? (rawMode as TutorMode) : "teach";

    // ── SSE headers ───────────────────────────────────────────────────────────
    // charset=utf-8 is required by Safari for correct SSE parsing
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    // Safari requires explicit transfer-encoding to stream properly
    res.setHeader("Transfer-Encoding", "chunked");
    // Restrict SSE to the app's own origin — never use wildcard on authenticated endpoints
    const allowedOrigin = req.headers.origin ?? "";
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    res.setHeader("Vary", "Origin");
    res.flushHeaders();

    const send = (data: object) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      if (typeof (res as any).flush === "function") (res as any).flush();
    };

    try {
      // ── Session & history ─────────────────────────────────────────────────
      // Sessions are always owned by the authenticated user (parent or student).
      // contextUserId is used for loading child data but the session belongs to user.id.
      const session = await getOrCreateTutorSession(
        user.id,
        unitId ?? null,
        lessonId ?? null,
        mode
      );

      const history = (session?.messages ?? []) as {
        role: "user" | "assistant";
        content: string;
        timestamp: number;
      }[];
      const recentHistory = history.slice(-20);

      // ── Gather full student context ───────────────────────────────────────
      const [masteryData, allUnitsAll, diagnosticAttempt, allQuizAttempts, unitProgressData, enrollments, activeCourseId] = await Promise.all([
        getUserMastery(contextUserId),
        getAllUnits(),
        getLatestDiagnosticAttempt(contextUserId),
        getQuizAttemptsForUser(contextUserId),
        getUserUnitProgress(contextUserId),
        getUserCourseEnrollments(contextUserId),
        getActiveCourseIdForUser(contextUserId),
      ]);

      // Resolve active course details for course-aware system prompt
      const activeEnrollment = enrollments.find((e) => e.enrollment.courseId === activeCourseId) ?? enrollments[0];
      const activeCourse = activeEnrollment?.course;

      // Filter units to only those belonging to the active course
      const allUnits = activeCourse
        ? allUnitsAll.filter((u: { courseId?: number }) => u.courseId === activeCourse.id)
        : allUnitsAll;

      // Load preferred name and ai welcome message from user profile
      let preferredName: string | null = null;
      let aiWelcomeMessage: string | null = null;
      try {
        const { getUserProfile } = await import("./db");
        const profile = await getUserProfile(contextUserId);
        preferredName = (profile as any)?.preferredName ?? null;
        aiWelcomeMessage = (profile as any)?.aiWelcomeMessage ?? null;
      } catch { /* non-fatal */ }

      const currentUnit = allUnits.find((u) => u.unitNumber === unitNumber);

      // Fetch lessons for current unit to inject learning objectives
      let currentUnitLessons: { title: string; learningObjectives: string }[] = [];
      if (currentUnit) {
        try {
          const lessons = await getLessonsByUnit(currentUnit.id);
          currentUnitLessons = lessons.map((l) => ({
            title: l.title,
            // Use teksAlignment as the learning objective (TEKS standard alignment)
            learningObjectives: l.teksAlignment ?? "",
          }));
        } catch {
          // non-fatal
        }
      }

      // ── Parse placement data ──────────────────────────────────────────────
      let placementScore: number | undefined;
      let placementRecommendation: string | undefined;
      let unitPlacementResults: { unit: string; score: number; ready: boolean }[] | undefined;

      if (diagnosticAttempt) {
        placementScore = diagnosticAttempt.overallScore ?? undefined;
        placementRecommendation = diagnosticAttempt.placementRecommendation ?? undefined;

        // unitResults is stored as JSON — parse it
        const rawUnitResults = diagnosticAttempt.unitResults;
        if (Array.isArray(rawUnitResults)) {
          unitPlacementResults = (rawUnitResults as any[]).map((r) => ({
            unit: `Unit ${r.unit ?? r.unitNumber ?? "?"}`,
            score: typeof r.score === "number" ? r.score : 0,
            ready: r.ready === true || (typeof r.score === "number" && r.score >= 75),
          }));
        }
      }

      // ── Recent quiz history (last 8 attempts) ─────────────────────────────
      const recentQuizzes = allQuizAttempts.slice(0, 8).map((q: { unitNumber: number; score: number; completedAt: Date | null }) => ({
        unitNumber: q.unitNumber,
        score: q.score,
        completedAt: q.completedAt ? q.completedAt.toISOString() : new Date().toISOString(),
      }));

      // ── Build system prompt with full context ─────────────────────────────
      // Build unit-by-unit mastery summary for Parent Summary mode
      const activeCourseCode = activeCourse?.courseCode ?? "ALG1";
      const unitMasterySummary = allUnits.map((u) => {
        const unitSkills = masteryData.filter((m: { skillId: string; score: number }) =>
          m.skillId.startsWith(`${activeCourseCode}-U${u.unitNumber}-`)
        );
        const avgScore =
          unitSkills.length > 0
            ? Math.round(unitSkills.reduce((s: number, m: { score: number }) => s + m.score, 0) / unitSkills.length)
            : null;
        const progress = unitProgressData.find((p) => p.unitNumber === u.unitNumber);
        return {
          unitNumber: u.unitNumber,
          title: u.title,
          avgMastery: avgScore,
          status: progress?.status ?? "locked",
          quizScore: progress?.quizScore ?? null,
        };
      });

      // Build learning objectives string for current unit
      const learningObjectivesText =
        currentUnitLessons.length > 0
          ? currentUnitLessons
              .map((l) => {
                const objs = Array.isArray(l.learningObjectives)
                  ? (l.learningObjectives as string[]).join("; ")
                  : typeof l.learningObjectives === "string"
                  ? l.learningObjectives
                  : "";
                return `${l.title}: ${objs}`;
              })
              .filter(Boolean)
              .join(" | ")
          : "";

      const systemPrompt = buildTutorSystemPrompt(
        contextUserName,
        mode,
        currentUnit?.title ?? "",
        masteryData.map((m: { skillId: string; score: number }) => ({ skillId: m.skillId, score: m.score })),
        {
          currentUnitNumber: unitNumber,
          placementScore,
          placementRecommendation,
          unitPlacementResults,
          recentQuizzes,
          unitMasterySummary,
          learningObjectives: learningObjectivesText,
          parentGoalContext,
          studentDemographics,
          courseContext: activeCourse
            ? {
                title: activeCourse.title,
                subject: activeCourse.subject,
                gradeLevel: activeCourse.gradeLevel,
                teksCode: activeCourse.teksCode ?? null,
                courseCode: activeCourse.courseCode,
                preferredName: preferredName,
                aiWelcomeMessage: aiWelcomeMessage,
              }
            : undefined,
        }
      );

      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...recentHistory.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user" as const, content: message },
      ];

      // ── Stream from LLM ───────────────────────────────────────────────────
      const payload = {
        model: "gemini-2.5-flash",
        messages,
        stream: true,
        max_tokens: 4096,
      };

      const llmRes = await fetch(resolveApiUrl(), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${ENV.forgeApiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!llmRes.ok || !llmRes.body) {
        const errText = await llmRes.text().catch(() => "unknown error");
        send({ type: "error", message: `LLM error: ${llmRes.status} ${errText}` });
        res.end();
        return;
      }

      // ── Parse SSE stream from LLM ─────────────────────────────────────────
      const reader = llmRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;
          const dataStr = trimmed.slice(5).trim();
          if (dataStr === "[DONE]") continue;

          try {
            const chunk = JSON.parse(dataStr);
            const delta = chunk?.choices?.[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              send({ type: "token", content: delta });
            }
          } catch {
            // skip malformed chunks
          }
        }
      }

      // ── Persist session messages ──────────────────────────────────────────
      if (session) {
        const allMessages = [
          ...history,
          { role: "user" as const, content: message, timestamp: Date.now() },
          { role: "assistant" as const, content: fullContent, timestamp: Date.now() },
        ];
        // Cap stored history to the last 40 messages (20 turns) to prevent
        // unbounded JSON column growth and slow reads over time.
        const MAX_STORED_MESSAGES = 40;
        const newMessages = allMessages.length > MAX_STORED_MESSAGES
          ? allMessages.slice(allMessages.length - MAX_STORED_MESSAGES)
          : allMessages;
        await updateTutorSessionMessages(session.id, newMessages);
      }

      // ── Notify owner for Parent Summary mode ──────────────────────────────
      if (mode === "parent_summary" && fullContent.length > 50) {
        const scoreNote = placementScore !== undefined ? ` (Placement: ${placementScore}%)` : "";
        notifyOwner({
          title: `Parent Summary — ${user.name ?? "Student"}${scoreNote}`,
          content: `A parent summary was generated for ${user.name ?? "a student"}. Preview: ${fullContent.slice(0, 300)}…`,
        }).catch(() => {});
      }

      send({ type: "done", sessionId: session?.id ?? null });
      res.end();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Streaming error";
      send({ type: "error", message: msg });
      res.end();
    }
  });
}
