/**
 * Newsletter Management Router
 * Admin-only procedures for managing newsletter subscribers and campaigns.
 * Includes: subscriber CRUD, campaign CRUD, AI draft generation, scheduling, analytics.
 */
import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  newsletterSubscriptions,
  newsletterCampaigns,
  users,
  userCourseEnrollments,
} from "../../drizzle/schema";
import { and, count, desc, eq, gte, like, or, sql } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

// ─── Subscriber Procedures ────────────────────────────────────────────────────

const subscriberRouter = router({
  /** List all subscribers with optional search and filter */
  list: adminProcedure
    .input(z.object({
      search: z.string().optional(),
      source: z.enum(["all", "landing_page", "onboarding", "dashboard"]).default("all"),
      status: z.enum(["all", "active", "unsubscribed"]).default("all"),
      limit: z.number().min(1).max(200).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const conditions = [];
      if (input.search) {
        conditions.push(
          or(
            like(newsletterSubscriptions.email, `%${input.search}%`),
            like(newsletterSubscriptions.name, `%${input.search}%`)
          )
        );
      }
      if (input.source !== "all") {
        conditions.push(eq(newsletterSubscriptions.source, input.source));
      }
      if (input.status === "active") {
        conditions.push(eq(newsletterSubscriptions.isActive, true));
      } else if (input.status === "unsubscribed") {
        conditions.push(eq(newsletterSubscriptions.isActive, false));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, [totalRow]] = await Promise.all([
        db.select().from(newsletterSubscriptions)
          .where(where)
          .orderBy(desc(newsletterSubscriptions.subscribedAt))
          .limit(input.limit)
          .offset(input.offset),
        db.select({ total: count() }).from(newsletterSubscriptions).where(where),
      ]);

      return { subscribers: rows, total: totalRow?.total ?? 0 };
    }),

  /** Get aggregate stats for the subscriber list */
  stats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { total: 0, active: 0, unsubscribed: 0, bySource: {} };

    const [totalRow, activeRow, landingRow, onboardingRow, dashboardRow] = await Promise.all([
      db.select({ v: count() }).from(newsletterSubscriptions),
      db.select({ v: count() }).from(newsletterSubscriptions).where(eq(newsletterSubscriptions.isActive, true)),
      db.select({ v: count() }).from(newsletterSubscriptions).where(eq(newsletterSubscriptions.source, "landing_page")),
      db.select({ v: count() }).from(newsletterSubscriptions).where(eq(newsletterSubscriptions.source, "onboarding")),
      db.select({ v: count() }).from(newsletterSubscriptions).where(eq(newsletterSubscriptions.source, "dashboard")),
    ]);

    const total = totalRow[0]?.v ?? 0;
    const active = activeRow[0]?.v ?? 0;

    return {
      total,
      active,
      unsubscribed: total - active,
      bySource: {
        landing_page: landingRow[0]?.v ?? 0,
        onboarding: onboardingRow[0]?.v ?? 0,
        dashboard: dashboardRow[0]?.v ?? 0,
      },
    };
  }),

  /** Manually add a subscriber */
  add: adminProcedure
    .input(z.object({
      email: z.string().email(),
      name: z.string().optional(),
      source: z.enum(["landing_page", "onboarding", "dashboard"]).default("dashboard"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const existing = await db.select({ id: newsletterSubscriptions.id, isActive: newsletterSubscriptions.isActive })
        .from(newsletterSubscriptions)
        .where(eq(newsletterSubscriptions.email, input.email.toLowerCase().trim()))
        .limit(1);

      if (existing.length > 0) {
        if (existing[0].isActive) throw new TRPCError({ code: "CONFLICT", message: "Email already subscribed" });
        // Reactivate
        await db.update(newsletterSubscriptions)
          .set({ isActive: true, unsubscribedAt: null, name: input.name ?? null })
          .where(eq(newsletterSubscriptions.id, existing[0].id));
        return { reactivated: true };
      }

      await db.insert(newsletterSubscriptions).values({
        email: input.email.toLowerCase().trim(),
        name: input.name ?? null,
        source: input.source,
        isActive: true,
      });
      return { reactivated: false };
    }),

  /** Unsubscribe a subscriber by ID */
  unsubscribe: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(newsletterSubscriptions)
        .set({ isActive: false, unsubscribedAt: new Date() })
        .where(eq(newsletterSubscriptions.id, input.id));
      return { success: true };
    }),

  /** Delete a subscriber permanently */
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(newsletterSubscriptions).where(eq(newsletterSubscriptions.id, input.id));
      return { success: true };
    }),

  /** Export all active subscribers as CSV data */
  exportCsv: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const rows = await db.select().from(newsletterSubscriptions)
      .where(eq(newsletterSubscriptions.isActive, true))
      .orderBy(desc(newsletterSubscriptions.subscribedAt));

    const header = "email,name,source,subscribed_at";
    const lines = rows.map(r =>
      `"${r.email}","${r.name ?? ""}","${r.source}","${r.subscribedAt?.toISOString() ?? ""}"`
    );
    return { csv: [header, ...lines].join("\n"), count: rows.length };
  }),
});

// ─── Campaign Procedures ──────────────────────────────────────────────────────

const campaignRouter = router({
  /** List all campaigns */
  list: adminProcedure
    .input(z.object({
      status: z.enum(["all", "draft", "scheduled", "sent", "cancelled"]).default("all"),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const where = input.status !== "all"
        ? eq(newsletterCampaigns.status, input.status as "draft" | "scheduled" | "sent" | "cancelled")
        : undefined;

      const [rows, [totalRow]] = await Promise.all([
        db.select().from(newsletterCampaigns)
          .where(where)
          .orderBy(desc(newsletterCampaigns.createdAt))
          .limit(input.limit)
          .offset(input.offset),
        db.select({ total: count() }).from(newsletterCampaigns).where(where),
      ]);

      return { campaigns: rows, total: totalRow?.total ?? 0 };
    }),

  /** Get a single campaign by ID */
  get: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select().from(newsletterCampaigns)
        .where(eq(newsletterCampaigns.id, input.id))
        .limit(1);
      if (!rows.length) throw new TRPCError({ code: "NOT_FOUND" });
      return rows[0];
    }),

  /** Create a new campaign (draft) */
  create: adminProcedure
    .input(z.object({
      title: z.string().min(1).max(256),
      subject: z.string().min(1).max(512),
      bodyHtml: z.string().min(1),
      bodyText: z.string().optional(),
      segment: z.enum(["all", "students", "parents", "landing_page"]).default("all"),
      scheduledAt: z.string().datetime().optional(),
      aiGenerated: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const status = input.scheduledAt ? "scheduled" : "draft";
      const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;

      const [result] = await db.insert(newsletterCampaigns).values({
        title: input.title,
        subject: input.subject,
        bodyHtml: input.bodyHtml,
        bodyText: input.bodyText ?? null,
        segment: input.segment,
        status,
        scheduledAt: scheduledAt ?? undefined,
        aiGenerated: input.aiGenerated,
        createdBy: ctx.user.id,
      });

      return { id: (result as any).insertId };
    }),

  /** Update an existing campaign */
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).max(256).optional(),
      subject: z.string().min(1).max(512).optional(),
      bodyHtml: z.string().min(1).optional(),
      bodyText: z.string().optional(),
      segment: z.enum(["all", "students", "parents", "landing_page"]).optional(),
      scheduledAt: z.string().datetime().nullable().optional(),
      status: z.enum(["draft", "scheduled", "cancelled"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const existing = await db.select({ status: newsletterCampaigns.status })
        .from(newsletterCampaigns)
        .where(eq(newsletterCampaigns.id, input.id))
        .limit(1);

      if (!existing.length) throw new TRPCError({ code: "NOT_FOUND" });
      if (existing[0].status === "sent") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot edit a sent campaign" });
      }

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (input.title !== undefined) updates.title = input.title;
      if (input.subject !== undefined) updates.subject = input.subject;
      if (input.bodyHtml !== undefined) updates.bodyHtml = input.bodyHtml;
      if (input.bodyText !== undefined) updates.bodyText = input.bodyText;
      if (input.segment !== undefined) updates.segment = input.segment;
      if (input.scheduledAt !== undefined) {
        updates.scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;
        updates.status = input.scheduledAt ? "scheduled" : "draft";
      }
      if (input.status !== undefined) updates.status = input.status;

      await db.update(newsletterCampaigns).set(updates).where(eq(newsletterCampaigns.id, input.id));
      return { success: true };
    }),

  /** Mark a campaign as sent (simulate send — no actual email delivery in this version) */
  markSent: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [campaign] = await db.select().from(newsletterCampaigns)
        .where(eq(newsletterCampaigns.id, input.id)).limit(1);
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });
      if (campaign.status === "sent") throw new TRPCError({ code: "BAD_REQUEST", message: "Already sent" });

      // Count recipients based on segment
      let recipientCount = 0;
      if (campaign.segment === "all") {
        const [row] = await db.select({ v: count() }).from(newsletterSubscriptions)
          .where(eq(newsletterSubscriptions.isActive, true));
        recipientCount = row?.v ?? 0;
      } else {
        const [row] = await db.select({ v: count() }).from(newsletterSubscriptions)
          .where(and(
            eq(newsletterSubscriptions.isActive, true),
            eq(newsletterSubscriptions.source, campaign.segment as string)
          ));
        recipientCount = row?.v ?? 0;
      }

      await db.update(newsletterCampaigns).set({
        status: "sent",
        sentAt: new Date(),
        recipientCount,
        updatedAt: new Date(),
      }).where(eq(newsletterCampaigns.id, input.id));

      return { success: true, recipientCount };
    }),

  /** Delete a campaign (draft/cancelled only) */
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [existing] = await db.select({ status: newsletterCampaigns.status })
        .from(newsletterCampaigns).where(eq(newsletterCampaigns.id, input.id)).limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (existing.status === "sent") throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot delete a sent campaign" });
      await db.delete(newsletterCampaigns).where(eq(newsletterCampaigns.id, input.id));
      return { success: true };
    }),

  /** AI News Bot: generate a newsletter draft based on a topic/prompt */
  aiDraft: adminProcedure
    .input(z.object({
      topic: z.string().min(1).max(500),
      tone: z.enum(["professional", "friendly", "motivational", "informational"]).default("friendly"),
      segment: z.enum(["all", "students", "parents", "landing_page"]).default("all"),
      includeCourseTips: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const audienceLabel = {
        all: "all subscribers (students, parents, and prospective users)",
        students: "students currently enrolled in EduChamp courses",
        parents: "parents monitoring their children's learning progress",
        landing_page: "prospective users who signed up from the landing page",
      }[input.segment];

      const systemPrompt = `You are EduChamp's newsletter content writer. EduChamp is an AI-powered adaptive learning platform for K-12 and AP students.

Generate a complete, engaging newsletter email for the following audience: ${audienceLabel}.

Tone: ${input.tone}
${input.includeCourseTips ? "Include at least one practical learning tip or course-related insight." : ""}

Output a JSON object with these exact fields:
{
  "subject": "Email subject line (max 80 chars, compelling, no clickbait)",
  "previewText": "Preview text shown in email clients (max 120 chars)",
  "title": "Newsletter title/headline (max 60 chars)",
  "bodyHtml": "Full HTML email body (use simple inline styles, no external CSS, suitable for email clients)",
  "bodyText": "Plain text version of the email body"
}

The HTML should be clean, mobile-friendly, and include:
- A warm greeting
- Main content sections with clear headings
- A call-to-action button (use inline styles: background #4f46e5, color white, padding 12px 24px, border-radius 6px, text-decoration none)
- An unsubscribe notice at the bottom
- EduChamp branding (use #4f46e5 as the primary color)

Keep the total email under 600 words.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Topic: ${input.topic}` },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "newsletter_draft",
            strict: true,
            schema: {
              type: "object",
              properties: {
                subject: { type: "string" },
                previewText: { type: "string" },
                title: { type: "string" },
                bodyHtml: { type: "string" },
                bodyText: { type: "string" },
              },
              required: ["subject", "previewText", "title", "bodyHtml", "bodyText"],
              additionalProperties: false,
            },
          },
        },
      });

      const raw = response.choices?.[0]?.message?.content ?? "{}";
      let draft: { subject: string; previewText: string; title: string; bodyHtml: string; bodyText: string };
      try {
        draft = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI returned invalid JSON" });
      }

      return draft;
    }),

  /** Get campaign analytics summary */
  analytics: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const [totalRow, sentRow, draftRow, scheduledRow] = await Promise.all([
      db.select({ v: count() }).from(newsletterCampaigns),
      db.select({
        v: count(),
        recipients: sql<number>`SUM(${newsletterCampaigns.recipientCount})`,
        opens: sql<number>`SUM(${newsletterCampaigns.openCount})`,
        clicks: sql<number>`SUM(${newsletterCampaigns.clickCount})`,
      }).from(newsletterCampaigns).where(eq(newsletterCampaigns.status, "sent")),
      db.select({ v: count() }).from(newsletterCampaigns).where(eq(newsletterCampaigns.status, "draft")),
      db.select({ v: count() }).from(newsletterCampaigns).where(eq(newsletterCampaigns.status, "scheduled")),
    ]);

    const sentStats = sentRow[0];
    const totalRecipients = Number(sentStats?.recipients ?? 0);
    const totalOpens = Number(sentStats?.opens ?? 0);
    const totalClicks = Number(sentStats?.clicks ?? 0);

    return {
      total: totalRow[0]?.v ?? 0,
      sent: sentStats?.v ?? 0,
      draft: draftRow[0]?.v ?? 0,
      scheduled: scheduledRow[0]?.v ?? 0,
      totalRecipients,
      totalOpens,
      totalClicks,
      avgOpenRate: totalRecipients > 0 ? Math.round((totalOpens / totalRecipients) * 100) : 0,
      avgClickRate: totalRecipients > 0 ? Math.round((totalClicks / totalRecipients) * 100) : 0,
    };
  }),
});

// ─── Newsletter Router ────────────────────────────────────────────────────────
export const newsletterRouter = router({
  subscribers: subscriberRouter,
  campaigns: campaignRouter,
});
