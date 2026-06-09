import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerTutorStreamRoute } from "../tutorStream";
import { gradePromotionHandler } from "../scheduledHandlers";
import { inviteExpiryHandler } from "../scheduled/inviteExpiry";
import { inactivityMonitorHandler } from "../scheduled/inactivityMonitor";
import { weeklyParentDigestHandler } from "../scheduled/weeklyParentDigest";
import { cardExpiryReminderHandler } from "../scheduled/cardExpiryReminder";
import { parentBillingReminderHandler } from "../scheduled/parentBillingReminder";
import { pendingCourseRequestDigestHandler } from "../scheduled/pendingCourseRequestDigest";
import { learningPlanReminderHandler } from "../scheduled/learningPlanReminder";
import { weeklyStudentReviewSummaryHandler } from "../scheduled/weeklyStudentReviewSummary";
import { inviteExpiryReminderHandler } from "../scheduled/inviteExpiryReminder";
import { studentInviteAutoExpireHandler } from "../scheduled/studentInviteAutoExpire";
import { seedDefaultRoles } from "../db";
import { seedDefaultBadges } from "../gamification/badges";
import { seedDefaultQuests } from "../gamification/quests";
import { seedDefaultHouses } from "../gamification/houses";
import { registerStripeWebhook } from "../stripeWebhook";
import { registerResendWebhook } from "../resendWebhook";
import { registerEmailWebhook } from "../emailWebhook";
import { bootstrapEmailService } from "../services/email/bootstrap";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

// ── Rate limiters ──────────────────────────────────────────────────────────────
// Public LLM chatbot: 20 requests / 5 minutes per IP
const chatbotLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests — please wait a moment before chatting again." },
});

// General API: 300 requests / minute per IP (protects tRPC)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith("/api/oauth"), // OAuth callbacks must never be rate-limited
});

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Trust the first proxy hop (Cloud Run / Manus gateway) so rate-limit
  // can read the real client IP from X-Forwarded-For
  app.set("trust proxy", 1);

  // ── Security headers (Helmet) ──────────────────────────────────────────────
  app.use(
    helmet({
      // The Manus platform injects inline <script id="manus-runtime"> tags that
      // helmet's default script-src 'self' CSP blocks, causing a blank page.
      // Disabling CSP here; the platform's Cloudflare layer applies its own
      // security headers at the edge.
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false, // Required for Manus storage proxy
    })
  );

  // ── Stripe webhook (must be registered BEFORE express.json) ─────────────────
  registerStripeWebhook(app);
  // ── Resend webhook (must be registered BEFORE express.json) ──────────────────────────────────────────────────
  registerResendWebhook(app);
  // ── Unified multi-provider email webhook (Resend + SendGrid) ──────────────────────────────
  registerEmailWebhook(app);

  // 1 MB body limit — no raw file bytes go through tRPC (all uploads use S3 pre-signed URLs) (P1-12 DoS mitigation)
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: true }));

  // ── Rate limiting ──────────────────────────────────────────────────────────
  // 2FA challenge: strict limit to prevent brute-force
  const twoFAChallengeLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many 2FA attempts. Please wait 15 minutes before trying again." },
  });
  app.use("/api/auth/verify-2fa-challenge", twoFAChallengeLimit);
  app.use("/api/trpc", apiLimiter);
  app.use("/api/tutor/stream", chatbotLimiter);
  // Apply tighter chatbot limit to the landing page AI chat endpoint
  app.use("/api/trpc/landing.chat", chatbotLimiter);
  app.use("/api/trpc/landing.createSession", chatbotLimiter);

  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerTutorStreamRoute(app);
  // Scheduled Heartbeat handlers
  app.post("/api/scheduled/grade-promotion", gradePromotionHandler);
  app.post("/api/scheduled/invite-expiry", inviteExpiryHandler);
  app.post("/api/scheduled/inactivity-monitor", inactivityMonitorHandler);
  app.post("/api/scheduled/weekly-parent-digest", weeklyParentDigestHandler);
  app.post("/api/scheduled/card-expiry-reminder", cardExpiryReminderHandler);
  app.post("/api/scheduled/parent-billing-reminder", parentBillingReminderHandler);
  app.post("/api/scheduled/pending-course-request-digest", pendingCourseRequestDigestHandler);
  app.post("/api/scheduled/learning-plan-reminder", learningPlanReminderHandler);
  app.post("/api/scheduled/weekly-student-review-summary", weeklyStudentReviewSummaryHandler);
  app.post("/api/scheduled/invite-expiry-reminder", inviteExpiryReminderHandler);
  app.post("/api/scheduled/student-invite-auto-expire", studentInviteAutoExpireHandler);

  // ── Course request email approve/reject token handler ─────────────────────
  app.get("/api/course-request/token", async (req, res) => {
    const { token, action } = req.query as { token?: string; action?: string };
    const resultBase = "/course-request/result";
    if (!token || !action || !['approve', 'reject'].includes(action)) {
      return res.redirect(`${resultBase}?status=not_found&action=${action ?? ''}`);
    }
    try {
      const { processCourseRequestToken } = await import("../db");
      const result = await processCourseRequestToken(token, action as 'approve' | 'reject');
      if (!result.success) {
        const status = result.reason === 'expired' ? 'expired' :
                       result.reason === 'already_actioned' ? 'already_actioned' :
                       'not_found';
        return res.redirect(`${resultBase}?status=${status}&action=${action}`);
      }
      const status = action === 'approve' ? 'approved' : 'rejected';
      return res.redirect(`${resultBase}?status=${status}&action=${action}`);
    } catch (err) {
      console.error('[CourseRequestToken]', err);
      return res.redirect(`${resultBase}?status=error&action=${action}`);
    }
  });

  // ── Dynamic sitemap.xml ──────────────────────────────────────────────────────────────
  app.get("/api/sitemap.xml", (_req, res) => {
    const BASE = "https://educhamp.co";
    const now = new Date().toISOString().split("T")[0];

    // Static public pages and landing-page anchor sections
    const staticUrls = [
      { loc: BASE, priority: "1.0", changefreq: "weekly" },
      { loc: `${BASE}/#features`, priority: "0.8", changefreq: "monthly" },
      { loc: `${BASE}/#courses`, priority: "0.8", changefreq: "weekly" },
      { loc: `${BASE}/#how-it-works`, priority: "0.7", changefreq: "monthly" },
      { loc: `${BASE}/#pricing`, priority: "0.9", changefreq: "weekly" },
      { loc: `${BASE}/#schools`, priority: "0.9", changefreq: "monthly" },
      { loc: `${BASE}/#faq`, priority: "0.6", changefreq: "monthly" },
    ];

    const urlEntries = staticUrls
      .map(
        ({ loc, priority, changefreq }) =>
          `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`
      )
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>`;

    res.set("Content-Type", "application/xml");
    res.set("Cache-Control", "public, max-age=3600"); // cache for 1 hour
    res.send(xml);
  });
  // ── Certificate PDF download (public, no auth required) ─────────────────────
  app.get("/api/certificate/:token/pdf", async (req, res) => {
    try {
      const { handleCertificatePDF } = await import("../routers/certificate");
      await handleCertificatePDF(req.params.token, res);
    } catch (err) {
      console.error("[Certificate PDF]", err);
      if (!res.headersSent) res.status(500).json({ error: "Failed to generate certificate" });
    }
  });

  // ── Weekly Report PDF download ─────────────────────────────────────────────
  app.get("/api/reports/weekly/:childId/pdf", async (req, res) => {
    try {
      const { handleWeeklyReportPDF } = await import("../routers/weeklyReport");
      await handleWeeklyReportPDF(req, res);
    } catch (err) {
      console.error("[Weekly Report PDF]", err);
      if (!res.headersSent) res.status(500).json({ error: "Failed to generate report" });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

    server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    // Seed default RBAC roles on startup (idempotent — skips existing roles)
    seedDefaultRoles(1).catch((err) => console.warn("[RBAC] Seed default roles failed:", err));
    // Bootstrap email service — seeds default Resend row from env vars if no active provider exists
    bootstrapEmailService().catch((err) => console.warn("[EmailService] Bootstrap failed:", err));
    // Auto-seed gamification defaults (idempotent — safe to run on every start)
    Promise.all([
      seedDefaultBadges(),
      seedDefaultQuests(),
      seedDefaultHouses(),
    ]).catch((err) => console.warn("[Gamification] Auto-seed failed:", err));
  });
}
startServer().catch(console.error);
