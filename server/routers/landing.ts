import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import { courses, users, userCourseEnrollments, diagnosticAttempts, chatSessions, chatMessages, demoRequests } from "../../drizzle/schema";
import { count, eq, desc, like, or, and, gte, lte, isNotNull, asc } from "drizzle-orm";
import { sendEmail } from "../emailService";
import crypto from "crypto";
import { TRPCError } from "@trpc/server";

const LANDING_SYSTEM_PROMPT = `You are EduChamp's friendly AI assistant on the public landing page.
EduChamp is an AI-powered adaptive learning platform for students from Pre-K through Grade 12 (including AP and SAT Prep).

Key facts about EduChamp:
- Offers 70+ courses spanning Pre-K through Grade 12, AP, and SAT Prep — covering Math, English Language Arts, Science, Social Studies, and more
- Every course starts with an adaptive diagnostic placement test to find the student's exact starting level
- AI tutor is always available to explain concepts, answer questions, and adapt to each student's pace
- Parent dashboard gives real-time visibility into progress, quiz scores, and learning activity
- Students can sign up independently and invite their parent/guardian during onboarding
- Mastery-based progression: students advance by demonstrating mastery, not just completing lessons
- Courses are aligned to state and national academic standards; AP courses follow College Board guidelines and SAT Prep is aligned to College Board SAT standards
- Free to start, works on any device
- Available to students and families nationwide; district and school partnerships available

Your role:
- Answer questions about EduChamp clearly and helpfully
- Guide visitors toward signing up (as a student or parent)
- Explain how the platform works, what courses are available, and why the placement test is important
- Be warm, encouraging, and concise
- If asked about pricing or billing, say "Please sign up to see current pricing options"
- Do NOT make up specific pricing numbers
- Do NOT mention specific school districts or state standards by name unless the visitor brings them up first
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
  adminGetSessions: protectedProcedure.use(({ ctx, next }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    return next({ ctx });
  })
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
  adminGetConversation: protectedProcedure.use(({ ctx, next }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    return next({ ctx });
  })
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
  adminUpdateSession: protectedProcedure.use(({ ctx, next }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    return next({ ctx });
  })
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

  /** Submit an ISD/School demo request — public endpoint */
  submitDemoRequest: publicProcedure
    .input(z.object({
      fullName: z.string().min(2).max(256),
      schoolName: z.string().min(2).max(256),
      roleTitle: z.string().min(2).max(128),
      email: z.string().email().max(320),
      phone: z.string().max(32).optional(),
      numStudents: z.string().max(64).optional(),
      gradeLevels: z.array(z.string()).optional(),
      subjects: z.array(z.string()).optional(),
      challenges: z.string().max(2000).optional(),
      interestType: z.enum(["demo", "pilot", "district_license", "campus_license", "partnership", "curriculum_licensing", "other"]).default("demo"),
      preferredTime: z.string().max(128).optional(),
      notes: z.string().max(2000).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      let requestId: number | null = null;

      if (db) {
        const [result] = await db.insert(demoRequests).values({
          fullName: input.fullName,
          schoolName: input.schoolName,
          roleTitle: input.roleTitle,
          email: input.email,
          phone: input.phone ?? null,
          numStudents: input.numStudents ?? null,
          gradeLevels: input.gradeLevels ? JSON.stringify(input.gradeLevels) : null,
          subjects: input.subjects ? JSON.stringify(input.subjects) : null,
          challenges: input.challenges ?? null,
          interestType: input.interestType,
          preferredTime: input.preferredTime ?? null,
          notes: input.notes ?? null,
          status: "new",
        });
        requestId = (result as { insertId?: number })?.insertId ?? null;
      }

      // Confirmation email to requester
      const interestLabels: Record<string, string> = {
        demo: "Product Demo",
        pilot: "Pilot Program",
        district_license: "District License",
        campus_license: "Campus License",
        partnership: "Partnership",
        curriculum_licensing: "Curriculum Licensing",
        other: "General Inquiry",
      };
      const interestLabel = interestLabels[input.interestType] ?? input.interestType;

      await sendEmail({
        to: input.email,
        subject: `EduChamp — We received your ${interestLabel} request`,
        templateName: "demo_request_confirmation",
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:32px 40px;text-align:center">
          <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px">EduChamp</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px">AI-Powered Adaptive Learning</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px">
          <h2 style="margin:0 0 16px;color:#1e293b;font-size:22px">Thank you, ${input.fullName}!</h2>
          <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6">We've received your <strong>${interestLabel}</strong> request for <strong>${input.schoolName}</strong>. Our team will review your inquiry and reach out within 1–2 business days.</p>
          <!-- Summary box -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:8px;padding:24px;margin-bottom:24px">
            <tr><td>
              <p style="margin:0 0 8px;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Request Summary</p>
              <table width="100%" cellpadding="4" cellspacing="0" style="font-size:14px;color:#334155">
                <tr><td style="font-weight:600;width:140px">School / ISD:</td><td>${input.schoolName}</td></tr>
                <tr><td style="font-weight:600">Your Role:</td><td>${input.roleTitle}</td></tr>
                <tr><td style="font-weight:600">Interest:</td><td>${interestLabel}</td></tr>
                ${input.numStudents ? `<tr><td style="font-weight:600">Students:</td><td>${input.numStudents}</td></tr>` : ""}
                ${input.preferredTime ? `<tr><td style="font-weight:600">Preferred Time:</td><td>${input.preferredTime}</td></tr>` : ""}
              </table>
            </td></tr>
          </table>
          <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6">In the meantime, feel free to explore EduChamp at <a href="https://educhamp.app" style="color:#4f46e5;text-decoration:none">educhamp.app</a> or reply to this email if you have any questions.</p>
          <a href="https://educhamp.app" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px">Explore EduChamp →</a>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0">
          <p style="margin:0;color:#94a3b8;font-size:12px">EduChamp · AI-Powered Pre-K–12 Adaptive Learning · <a href="https://educhamp.app" style="color:#94a3b8">educhamp.app</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
        text: `Hi ${input.fullName},\n\nThank you for your ${interestLabel} request for ${input.schoolName}. Our team will reach out within 1–2 business days.\n\nRequest Summary:\n- School: ${input.schoolName}\n- Role: ${input.roleTitle}\n- Interest: ${interestLabel}\n\nExplore EduChamp: https://educhamp.app\n\nThe EduChamp Team`,
      });

      // Internal notification to admin
      const { notifyOwner } = await import("../_core/notification");
      await notifyOwner({
        title: `New ${interestLabel} Request — ${input.schoolName}`,
        content: `${input.fullName} (${input.roleTitle}) at ${input.schoolName} submitted a ${interestLabel} request.\nEmail: ${input.email}${input.phone ? `\nPhone: ${input.phone}` : ""}${input.numStudents ? `\nStudents: ${input.numStudents}` : ""}\n\nView in Admin Console: https://educhamp.app/admin`,
      });

      return { ok: true, requestId };
    }),

  /** Public course catalogue — returns all active courses ordered by sortOrder for the landing page */
  getCourseCatalogue: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db
      .select({
        id: courses.id,
        courseCode: courses.courseCode,
        title: courses.title,
        subject: courses.subject,
        gradeLevel: courses.gradeLevel,
        description: courses.description,
        teksCode: courses.teksCode,
        sortOrder: courses.sortOrder,
      })
      .from(courses)
      .where(eq(courses.isActive, true))
      .orderBy(asc(courses.sortOrder));
    return rows;
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
