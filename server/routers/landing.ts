import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import { courses, users, userCourseEnrollments, diagnosticAttempts, chatSessions, chatMessages } from "../../drizzle/schema";
import { count, eq, desc, like, or, and, gte, lte, isNotNull } from "drizzle-orm";
import crypto from "crypto";
import { TRPCError } from "@trpc/server";

const LANDING_SYSTEM_PROMPT = `You are EduChamp's friendly AI assistant on the public landing page.
EduChamp is an AI-powered adaptive learning platform for students (K-12 through AP level).

Key facts about EduChamp:
- Offers 15+ courses: Algebra I, AP Calculus BC, AP Statistics, AP Chemistry, AP Literature, AP Physics, AP Biology, AP Business with Personal Finance, SAT Prep, and more
- Every course starts with a 30-question diagnostic placement test to find the student's exact starting level
- AI tutor is always available to explain concepts, answer questions, and adapt to each student's pace
- Parent dashboard gives real-time visibility into progress, quiz scores, and learning activity
- Students can sign up independently and invite their parent/guardian during onboarding
- Mastery-based progression: students advance by demonstrating mastery, not just completing lessons
- Aligned with TEKS (Texas), AP College Board standards, and SAT standards
- Free to start, works on any device

Your role:
- Answer questions about EduChamp clearly and helpfully
- Guide visitors toward signing up (as a student or parent)
- Explain how the platform works, what courses are available, and why the placement test is important
- Be warm, encouraging, and concise
- If asked about pricing or billing, say "Please sign up to see current pricing options"
- Do NOT make up specific pricing numbers
- Keep responses under 150 words
- After 2-3 exchanges, naturally ask for the visitor's name and email so we can follow up with more information
- End responses with a gentle nudge toward signing up when appropriate`;

export const landingRouter = router({
  /** Live platform statistics for the landing page stat counters */
  getStats: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return { courses: 15, students: 0, enrollments: 0, diagnosticsCompleted: 0 };
    }
    const [
      [courseCount],
      [studentCount],
      [enrollmentCount],
      [diagnosticCount],
    ] = await Promise.all([
      db.select({ value: count() }).from(courses),
      db.select({ value: count() }).from(users).where(eq(users.accountType, "student")),
      db.select({ value: count() }).from(userCourseEnrollments),
      db.select({ value: count() }).from(diagnosticAttempts),
    ]);
    return {
      courses: courseCount?.value ?? 0,
      students: studentCount?.value ?? 0,
      enrollments: enrollmentCount?.value ?? 0,
      diagnosticsCompleted: diagnosticCount?.value ?? 0,
    };
  }),

  /** Create or retrieve a chat session token */
  createSession: publicProcedure
    .input(z.object({ source: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const token = crypto.randomBytes(32).toString("hex");
      if (db) {
        await db.insert(chatSessions).values({
          sessionToken: token,
          source: input.source ?? "landing_page",
        });
      }
      return { sessionToken: token };
    }),

  /** Update visitor contact info on a session (lead capture) */
  updateSessionContact: publicProcedure
    .input(z.object({
      sessionToken: z.string(),
      visitorName: z.string().optional(),
      visitorEmail: z.string().email().optional(),
      visitorPhone: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { ok: true };
      const { sessionToken, ...contact } = input;
      const updates: Record<string, string | Date> = {};
      if (contact.visitorName) updates.visitorName = contact.visitorName;
      if (contact.visitorEmail) updates.visitorEmail = contact.visitorEmail;
      if (contact.visitorPhone) updates.visitorPhone = contact.visitorPhone;
      if (Object.keys(updates).length > 0) {
        await db.update(chatSessions)
          .set({ ...updates, status: "converted", updatedAt: new Date() })
          .where(eq(chatSessions.sessionToken, sessionToken));
      }
      return { ok: true };
    }),

  /** AI chatbot for the landing page — persists messages to DB */
  chat: publicProcedure
    .input(
      z.object({
        sessionToken: z.string().optional(),
        messages: z.array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string().max(2000),
          })
        ).max(40),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();

      // Get or create session
      let sessionId: number | null = null;
      if (db && input.sessionToken) {
        const [session] = await db.select({ id: chatSessions.id })
          .from(chatSessions)
          .where(eq(chatSessions.sessionToken, input.sessionToken))
          .limit(1);
        sessionId = session?.id ?? null;
      }

      // Persist the latest user message
      const lastUserMsg = [...input.messages].reverse().find(m => m.role === "user");
      if (db && sessionId && lastUserMsg) {
        await db.insert(chatMessages).values({
          sessionId,
          role: "user",
          content: String(lastUserMsg.content),
        });
      }

      const response = await invokeLLM({
        messages: [
          { role: "system", content: LANDING_SYSTEM_PROMPT },
          ...input.messages,
        ],
      });
      const content = response.choices?.[0]?.message?.content ?? "I'm here to help! What would you like to know about EduChamp?";

      // Persist the assistant reply
      if (db && sessionId) {
        await db.insert(chatMessages).values({
          sessionId,
          role: "assistant",
          content: String(content),
        });
        // Update message count and last message time
        await db.update(chatSessions)
          .set({
            messageCount: input.messages.length + 1,
            lastMessageAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(chatSessions.id, sessionId));
      }

      // Detect if visitor shared their email in the message
      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
      const emailInMessage = lastUserMsg?.content.match(emailRegex)?.[0];
      if (db && sessionId && emailInMessage) {
        await db.update(chatSessions)
          .set({ visitorEmail: emailInMessage, status: "converted", updatedAt: new Date() })
          .where(eq(chatSessions.id, sessionId));
      }

      return { content };
    }),

  // ─── Admin: Chat Management ───────────────────────────────────────────────

  /** List all chat sessions (admin only) */
  adminGetSessions: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      status: z.enum(["all", "active", "converted", "archived"]).default("all"),
      hasContact: z.boolean().optional(),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(20),
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return { sessions: [], total: 0 };

      const conditions = [];
      if (input.status !== "all") {
        conditions.push(eq(chatSessions.status, input.status as "active" | "converted" | "archived"));
      }
      if (input.hasContact === true) {
        conditions.push(isNotNull(chatSessions.visitorEmail));
      }
      if (input.search) {
        const s = `%${input.search}%`;
        conditions.push(or(
          like(chatSessions.visitorEmail, s),
          like(chatSessions.visitorName, s),
        ));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [sessions, [totalRow]] = await Promise.all([
        db.select().from(chatSessions)
          .where(where)
          .orderBy(desc(chatSessions.createdAt))
          .limit(input.pageSize)
          .offset((input.page - 1) * input.pageSize),
        db.select({ value: count() }).from(chatSessions).where(where),
      ]);

      return { sessions, total: totalRow?.value ?? 0 };
    }),

  /** Get full conversation for a session (admin only) */
  adminGetConversation: protectedProcedure
    .input(z.object({ sessionId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return { session: null, messages: [] };

      const [[session], messages] = await Promise.all([
        db.select().from(chatSessions).where(eq(chatSessions.id, input.sessionId)).limit(1),
        db.select().from(chatMessages)
          .where(eq(chatMessages.sessionId, input.sessionId))
          .orderBy(chatMessages.createdAt),
      ]);

      return { session: session ?? null, messages };
    }),

  /** Update session status (admin only) */
  adminUpdateSession: protectedProcedure
    .input(z.object({
      sessionId: z.number().int(),
      status: z.enum(["active", "converted", "archived"]).optional(),
      adminNote: z.string().max(1000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return { ok: true };

      const updates: Record<string, string | Date> = { updatedAt: new Date() };
      if (input.status) updates.status = input.status as string;
      if (input.adminNote !== undefined) updates.adminNotes = input.adminNote;

      await db.update(chatSessions)
        .set(updates)
        .where(eq(chatSessions.id, input.sessionId));

      return { ok: true };
    }),

  /** Get summary stats for chat sessions (admin only) */
  adminGetChatStats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) return { total: 0, converted: 0, active: 0, withEmail: 0 };

    const [
      [total],
      [converted],
      [active],
      [withEmail],
    ] = await Promise.all([
      db.select({ value: count() }).from(chatSessions),
      db.select({ value: count() }).from(chatSessions).where(eq(chatSessions.status, "converted" as "active" | "converted" | "archived")),
      db.select({ value: count() }).from(chatSessions).where(eq(chatSessions.status, "active" as "active" | "converted" | "archived")),
      db.select({ value: count() }).from(chatSessions).where(isNotNull(chatSessions.visitorEmail)),
    ]);

    return {
      total: total?.value ?? 0,
      converted: converted?.value ?? 0,
      active: active?.value ?? 0,
      withEmail: withEmail?.value ?? 0,
    };
  }),
});
