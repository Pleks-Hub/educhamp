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
import { seedDefaultRoles } from "../db";
import { registerStripeWebhook } from "../stripeWebhook";
import { registerResendWebhook } from "../resendWebhook";
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

  // 2 MB body limit — no raw file bytes go through tRPC (all uploads use S3 pre-signed URLs)
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ limit: "2mb", extended: true }));

  // ── Rate limiting ──────────────────────────────────────────────────────────
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
    const BASE = "https://educhamp.app";
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
  });
}
startServer().catch(console.error);
