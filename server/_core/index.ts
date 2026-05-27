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
import { seedDefaultRoles } from "../db";
import { registerStripeWebhook } from "../stripeWebhook";
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
      // Allow inline scripts/styles needed by Vite HMR in dev; tighten in prod
      contentSecurityPolicy: process.env.NODE_ENV === "production" ? undefined : false,
      crossOriginEmbedderPolicy: false, // Required for Manus storage proxy
    })
  );

  // ── Stripe webhook (must be registered BEFORE express.json) ─────────────────
  registerStripeWebhook(app);

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // ── Rate limiting ──────────────────────────────────────────────────────────
  app.use("/api/trpc", apiLimiter);
  app.use("/api/tutor/stream", chatbotLimiter);

  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerTutorStreamRoute(app);
  // Scheduled Heartbeat handlers
  app.post("/api/scheduled/grade-promotion", gradePromotionHandler);
  app.post("/api/scheduled/invite-expiry", inviteExpiryHandler);
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
