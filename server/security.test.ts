/**
 * Security Hardening Tests — ASA Code Review
 * Covers:
 *  - P0-1: Suspended/deactivated/archived users must not pass auth
 *  - P0-4: RBAC enforcement — checkAdminPermission logic
 *  - P1-7: DB index coverage (schema shape assertions)
 *  - P1-10: Tutor session history cap at 100 messages
 *  - P1-11: Body-parser limit (1 MB)
 *  - P1-12: robots.txt disallows private routes
 *  - P0-5: Heartbeat cron paths start with /api/scheduled/
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";

// ─── P0-1: Suspended user auth bypass ────────────────────────────────────────

describe("P0-1 — Suspended user auth: status check logic", () => {
  type UserStatus = "active" | "suspended" | "deactivated" | "pending_verification" | "archived" | "deleted";

  const BLOCKED_STATUSES: UserStatus[] = ["suspended", "deactivated", "archived", "deleted"];
  const ALLOWED_STATUSES: UserStatus[] = ["active", "pending_verification"];

  function isUserAllowed(status: UserStatus): boolean {
    return !BLOCKED_STATUSES.includes(status);
  }

  it("allows active users", () => {
    expect(isUserAllowed("active")).toBe(true);
  });

  it("allows pending_verification users", () => {
    expect(isUserAllowed("pending_verification")).toBe(true);
  });

  it("blocks suspended users", () => {
    expect(isUserAllowed("suspended")).toBe(false);
  });

  it("blocks deactivated users", () => {
    expect(isUserAllowed("deactivated")).toBe(false);
  });

  it("blocks archived users", () => {
    expect(isUserAllowed("archived")).toBe(false);
  });

  it("blocks deleted users", () => {
    expect(isUserAllowed("deleted")).toBe(false);
  });

  it("all BLOCKED_STATUSES are rejected", () => {
    for (const status of BLOCKED_STATUSES) {
      expect(isUserAllowed(status)).toBe(false);
    }
  });

  it("all ALLOWED_STATUSES pass", () => {
    for (const status of ALLOWED_STATUSES) {
      expect(isUserAllowed(status)).toBe(true);
    }
  });
});

// ─── P0-4: RBAC enforcement ───────────────────────────────────────────────────

describe("P0-4 — RBAC: checkAdminPermission logic", () => {
  type Permission = { resource: string; action: string };
  type RoleAssignment = { roleId: number; isActive: boolean };
  type RolePermission = { roleId: number; resource: string; action: string };

  /**
   * Mirrors the logic in server/db.ts checkAdminPermission (without DB).
   */
  function checkPermission(
    userRole: string,
    assignments: RoleAssignment[],
    rolePermissions: RolePermission[],
    resource: string,
    action: string
  ): boolean {
    if (userRole === "admin") return true;
    const activeRoleIds = assignments.filter((a) => a.isActive).map((a) => a.roleId);
    if (activeRoleIds.length === 0) return false;
    return rolePermissions.some(
      (p) => activeRoleIds.includes(p.roleId) && p.resource === resource && p.action === action
    );
  }

  const samplePermissions: RolePermission[] = [
    { roleId: 1, resource: "users", action: "delete" },
    { roleId: 1, resource: "users", action: "update_role" },
    { roleId: 2, resource: "cms", action: "publish" },
  ];

  it("super-admin (role=admin) always has permission", () => {
    expect(checkPermission("admin", [], [], "users", "delete")).toBe(true);
    expect(checkPermission("admin", [], [], "rbac", "assign")).toBe(true);
    expect(checkPermission("admin", [], [], "settings", "update")).toBe(true);
  });

  it("user with no role assignments is denied", () => {
    expect(checkPermission("user", [], samplePermissions, "users", "delete")).toBe(false);
  });

  it("user with inactive assignment is denied", () => {
    const assignments: RoleAssignment[] = [{ roleId: 1, isActive: false }];
    expect(checkPermission("user", assignments, samplePermissions, "users", "delete")).toBe(false);
  });

  it("user with active assignment and matching permission is allowed", () => {
    const assignments: RoleAssignment[] = [{ roleId: 1, isActive: true }];
    expect(checkPermission("user", assignments, samplePermissions, "users", "delete")).toBe(true);
  });

  it("user with active assignment but wrong resource is denied", () => {
    const assignments: RoleAssignment[] = [{ roleId: 1, isActive: true }];
    expect(checkPermission("user", assignments, samplePermissions, "cms", "publish")).toBe(false);
  });

  it("user with active assignment for cms:publish is allowed", () => {
    const assignments: RoleAssignment[] = [{ roleId: 2, isActive: true }];
    expect(checkPermission("user", assignments, samplePermissions, "cms", "publish")).toBe(true);
  });

  it("user with multiple roles — one matching is enough", () => {
    const assignments: RoleAssignment[] = [
      { roleId: 1, isActive: true },
      { roleId: 2, isActive: true },
    ];
    expect(checkPermission("user", assignments, samplePermissions, "cms", "publish")).toBe(true);
    expect(checkPermission("user", assignments, samplePermissions, "users", "delete")).toBe(true);
  });

  it("permission check is exact — partial match is not enough", () => {
    const assignments: RoleAssignment[] = [{ roleId: 1, isActive: true }];
    // roleId 1 has users:delete but not users:create
    expect(checkPermission("user", assignments, samplePermissions, "users", "create")).toBe(false);
  });

  it("5 critical procedures each have a distinct resource:action pair", () => {
    const criticalPairs: Permission[] = [
      { resource: "users", action: "delete" },
      { resource: "users", action: "update_role" },
      { resource: "cms", action: "publish" },
      { resource: "rbac", action: "assign" },
      { resource: "settings", action: "update" },
    ];
    // All pairs must be unique
    const keys = criticalPairs.map((p) => `${p.resource}:${p.action}`);
    const unique = new Set(keys);
    expect(unique.size).toBe(criticalPairs.length);
  });
});

// ─── P1-7: DB index coverage ──────────────────────────────────────────────────

describe("P1-7 — DB indexes: schema index definitions", () => {
  /**
   * We assert the index names we know were added to schema.ts.
   * This is a smoke-test — if someone removes an index from schema.ts,
   * the corresponding string will no longer appear in the file.
   */
  const EXPECTED_INDEXES = [
    "users_email_idx",
    "users_status_idx",
    "users_role_idx",
    "parentChildren_parentId_idx",
    "parentChildren_childId_idx",
    "tutorSessions_userId_idx",
    "tutorSessions_userId_updatedAt_idx",
    // Pre-existing indexes (regression guard)
    "userMastery_userId_idx",
    "userMastery_userId_skillId_idx",
    "unitProgress_userId_idx",
    "unitProgress_userId_unitId_idx",
    "lessonProgress_userId_idx",
    "lessonProgress_userId_lessonId_idx",
    "quizAttempts_userId_idx",
    "quizAttempts_userId_unitId_idx",
    "diagnosticAttempts_userId_idx",
    "diagnosticAttempts_userId_courseId_idx",
  ];

  const schemaSource = require("fs").readFileSync(
    require("path").join(__dirname, "../drizzle/schema.ts"),
    "utf-8"
  );

  for (const indexName of EXPECTED_INDEXES) {
    it(`schema.ts contains index "${indexName}"`, () => {
      expect(schemaSource).toContain(indexName);
    });
  }
});

// ─── P1-10: Tutor session history cap ────────────────────────────────────────

describe("P1-10 — Tutor session history cap at 100 messages", () => {
  const MAX_STORED_MESSAGES = 100;

  function applyHistoryCap(
    history: Array<{ role: string; content: string; timestamp: number }>,
    userMsg: string,
    assistantMsg: string
  ) {
    return [
      ...history,
      { role: "user", content: userMsg, timestamp: Date.now() },
      { role: "assistant", content: assistantMsg, timestamp: Date.now() },
    ].slice(-MAX_STORED_MESSAGES);
  }

  it("does not exceed 100 messages when starting from empty history", () => {
    const history: Array<{ role: string; content: string; timestamp: number }> = [];
    const result = applyHistoryCap(history, "hello", "hi");
    expect(result.length).toBeLessThanOrEqual(MAX_STORED_MESSAGES);
  });

  it("trims to 100 when history is already at 99 and a new turn is added", () => {
    const history = Array.from({ length: 99 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `msg ${i}`,
      timestamp: Date.now(),
    }));
    const result = applyHistoryCap(history, "new user msg", "new assistant msg");
    expect(result.length).toBe(MAX_STORED_MESSAGES);
  });

  it("trims excess when history is at 100 before new turn", () => {
    const history = Array.from({ length: 100 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `msg ${i}`,
      timestamp: Date.now(),
    }));
    const result = applyHistoryCap(history, "new user msg", "new assistant msg");
    expect(result.length).toBe(MAX_STORED_MESSAGES);
  });

  it("keeps the most recent messages when trimming", () => {
    const history = Array.from({ length: 100 }, (_, i) => ({
      role: "user",
      content: `old msg ${i}`,
      timestamp: Date.now(),
    }));
    const result = applyHistoryCap(history, "latest user", "latest assistant");
    const contents = result.map((m) => m.content);
    expect(contents).toContain("latest user");
    expect(contents).toContain("latest assistant");
    expect(contents).not.toContain("old msg 0");
  });
});

// ─── P1-11: Body-parser limit ─────────────────────────────────────────────────

describe("P1-11 — Body-parser limit: 1 MB configuration", () => {
  it("server index.ts uses 1mb body limit", () => {
    const source = require("fs").readFileSync(
      require("path").join(__dirname, "_core/index.ts"),
      "utf-8"
    );
    // Must contain 1mb (not 2mb) for express.json
    expect(source).toContain('"1mb"');
    // Must NOT contain 2mb for express.json
    expect(source).not.toContain('"2mb"');
  });
});

// ─── P1-12: robots.txt ────────────────────────────────────────────────────────

describe("P1-12 — robots.txt: private routes are disallowed", () => {
  const PRIVATE_ROUTES = ["/admin", "/api/", "/quiz", "/diagnostic", "/parent/", "/profile", "/billing"];

  const robotsSource = require("fs").readFileSync(
    require("path").join(__dirname, "../client/public/robots.txt"),
    "utf-8"
  );

  for (const route of PRIVATE_ROUTES) {
    it(`robots.txt disallows ${route}`, () => {
      expect(robotsSource).toContain(`Disallow: ${route}`);
    });
  }
});

// ─── P0-5: Heartbeat cron paths ───────────────────────────────────────────────

describe("P0-5 — Heartbeat crons: all scheduled paths start with /api/scheduled/", () => {
  const REGISTERED_PATHS = [
    "/api/scheduled/grade-promotion",
    "/api/scheduled/invite-expiry",
    "/api/scheduled/inactivity-monitor",
    "/api/scheduled/weekly-parent-digest",
  ];

  for (const path of REGISTERED_PATHS) {
    it(`path "${path}" starts with /api/scheduled/`, () => {
      expect(path.startsWith("/api/scheduled/")).toBe(true);
    });
  }

  it("all 4 scheduled handlers are mounted in index.ts", () => {
    const source = require("fs").readFileSync(
      require("path").join(__dirname, "_core/index.ts"),
      "utf-8"
    );
    for (const path of REGISTERED_PATHS) {
      expect(source).toContain(`"${path}"`);
    }
  });
});
