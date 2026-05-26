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
    } = req.body as {
      message: string;
      mode: string;
      unitId?: number;
      unitNumber?: number;
      lessonId?: number;
      sessionId?: number;
    };

    if (!message || !rawMode) {
      res.status(400).json({ error: "message and mode are required" });
      return;
    }
    const mode = VALID_MODES.has(rawMode) ? (rawMode as TutorMode) : "teach";

    // ── SSE headers ───────────────────────────────────────────────────────────
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const send = (data: object) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      // flush if available (compression middleware)
      if (typeof (res as any).flush === "function") (res as any).flush();
    };

    try {
      // ── Session & history ─────────────────────────────────────────────────
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

      // ── Build system prompt ───────────────────────────────────────────────
      const masteryData = await getUserMastery(user.id);
      const allUnits = unitNumber ? await getAllUnits() : [];
      const currentUnit = allUnits.find((u) => u.unitNumber === unitNumber);

      const systemPrompt = buildTutorSystemPrompt(
        user.name ?? "Student",
        mode,
        currentUnit?.title ?? "",
        masteryData.map((m) => ({ skillId: m.skillId, score: m.score }))
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
        const newMessages = [
          ...history,
          { role: "user" as const, content: message, timestamp: Date.now() },
          {
            role: "assistant" as const,
            content: fullContent,
            timestamp: Date.now(),
          },
        ];
        await updateTutorSessionMessages(session.id, newMessages);
      }

      // ── Notify owner for Parent Summary mode ──────────────────────────────
      if (mode === "parent_summary" && fullContent.length > 50) {
        notifyOwner({
          title: `Parent Summary — ${user.name ?? "Student"}`,
          content: `A parent summary was generated for ${user.name ?? "a student"}. Preview: ${fullContent.slice(0, 200)}…`,
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
