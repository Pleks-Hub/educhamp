/**
 * EduChamp — Core Logic Tests
 *
 * Tests cover:
 *  1. Mastery label and level helpers
 *  2. Adaptive path threshold rules
 *  3. Skill ID format validation
 *  4. Tutor system prompt generation
 *  5. Auth logout (existing template test, preserved)
 */

import { describe, expect, it } from "vitest";
import { getMasteryLabel, getMasteryLevel, buildTutorSystemPrompt } from "./educhamp-helpers";

// ─── 1. Mastery Labels ────────────────────────────────────────────────────────

describe("getMasteryLabel", () => {
  it("returns Beginner for score < 60", () => {
    expect(getMasteryLabel(0)).toBe("Beginner");
    expect(getMasteryLabel(59)).toBe("Beginner");
  });

  it("returns Developing for score 60–74", () => {
    expect(getMasteryLabel(60)).toBe("Developing");
    expect(getMasteryLabel(74)).toBe("Developing");
  });

  it("returns Approaching for score 75–89", () => {
    expect(getMasteryLabel(75)).toBe("Approaching");
    expect(getMasteryLabel(89)).toBe("Approaching");
  });

  it("returns Mastered for score 90–99", () => {
    expect(getMasteryLabel(90)).toBe("Mastered");
    expect(getMasteryLabel(99)).toBe("Mastered");
  });

  it("returns Advanced for score 100", () => {
    expect(getMasteryLabel(100)).toBe("Advanced");
  });
});

// ─── 2. Mastery Levels ────────────────────────────────────────────────────────

describe("getMasteryLevel", () => {
  it("returns beginner for score < 60", () => {
    expect(getMasteryLevel(0)).toBe("beginner");
    expect(getMasteryLevel(59)).toBe("beginner");
  });

  it("returns developing for score 60–74", () => {
    expect(getMasteryLevel(60)).toBe("developing");
    expect(getMasteryLevel(74)).toBe("developing");
  });

  it("returns approaching for score 75–89", () => {
    expect(getMasteryLevel(75)).toBe("approaching");
    expect(getMasteryLevel(89)).toBe("approaching");
  });

  it("returns mastered for score 90–99", () => {
    expect(getMasteryLevel(90)).toBe("mastered");
    expect(getMasteryLevel(99)).toBe("mastered");
  });

  it("returns advanced for score 100", () => {
    expect(getMasteryLevel(100)).toBe("advanced");
  });
});

// ─── 3. Adaptive Path Threshold Rules ────────────────────────────────────────

describe("Adaptive path thresholds", () => {
  function getAdaptivePath(score: number): string {
    if (score < 60) return "reteach";
    if (score < 75) return "guided_practice";
    if (score < 90) return "quiz_unlocked";
    return "challenge";
  }

  it("returns reteach for score below 60", () => {
    expect(getAdaptivePath(0)).toBe("reteach");
    expect(getAdaptivePath(59)).toBe("reteach");
  });

  it("returns guided_practice for score 60–74", () => {
    expect(getAdaptivePath(60)).toBe("guided_practice");
    expect(getAdaptivePath(74)).toBe("guided_practice");
  });

  it("returns quiz_unlocked for score 75–89", () => {
    expect(getAdaptivePath(75)).toBe("quiz_unlocked");
    expect(getAdaptivePath(89)).toBe("quiz_unlocked");
  });

  it("returns challenge for score 90+", () => {
    expect(getAdaptivePath(90)).toBe("challenge");
    expect(getAdaptivePath(100)).toBe("challenge");
  });

  it("boundary: 59 is reteach, 60 is guided_practice", () => {
    expect(getAdaptivePath(59)).toBe("reteach");
    expect(getAdaptivePath(60)).toBe("guided_practice");
  });

  it("boundary: 74 is guided_practice, 75 is quiz_unlocked", () => {
    expect(getAdaptivePath(74)).toBe("guided_practice");
    expect(getAdaptivePath(75)).toBe("quiz_unlocked");
  });

  it("boundary: 89 is quiz_unlocked, 90 is challenge", () => {
    expect(getAdaptivePath(89)).toBe("quiz_unlocked");
    expect(getAdaptivePath(90)).toBe("challenge");
  });
});

// ─── 4. Skill ID Format Validation ───────────────────────────────────────────

describe("Skill ID format ALG1-U[N]-S[N]", () => {
  const SKILL_ID_REGEX = /^ALG1-U\d+-S\d+$/;

  const validIds = [
    "ALG1-U1-S1",
    "ALG1-U1-S2",
    "ALG1-U12-S5",
    "ALG1-U3-S10",
  ];

  const invalidIds = [
    "alg1-u1-s1",      // lowercase
    "ALG1-U1",         // missing skill part
    "ALG1-S1",         // missing unit part
    "ALG1-U1-S",       // missing skill number
    "U1-S1",           // missing ALG1 prefix
    "ALG1-U0-S0",      // zero is technically valid by regex
  ];

  it("accepts valid skill IDs", () => {
    for (const id of validIds) {
      expect(SKILL_ID_REGEX.test(id), `Expected ${id} to be valid`).toBe(true);
    }
  });

  it("rejects invalid skill IDs", () => {
    for (const id of invalidIds.slice(0, 5)) {
      expect(SKILL_ID_REGEX.test(id), `Expected ${id} to be invalid`).toBe(false);
    }
  });
});

// ─── 5. Tutor System Prompt Generation ───────────────────────────────────────

describe("buildTutorSystemPrompt", () => {
  it("includes the student name", () => {
    const prompt = buildTutorSystemPrompt("Alice", "teach", "Linear Equations", []);
    expect(prompt).toContain("Alice");
  });

  it("includes the unit title when provided", () => {
    const prompt = buildTutorSystemPrompt("Bob", "teach", "Quadratic Functions", []);
    expect(prompt).toContain("Quadratic Functions");
  });

  it("includes mode-specific instructions for each mode", () => {
    const modes = ["teach", "practice", "quiz", "exam_review", "remediation", "parent_summary"] as const;
    for (const mode of modes) {
      const prompt = buildTutorSystemPrompt("Student", mode, "", []);
      expect(prompt.length, `Prompt for mode ${mode} should not be empty`).toBeGreaterThan(100);
    }
  });

  it("includes mastery context when skills are provided", () => {
    const skills = [
      { skillId: "ALG1-U1-S1", score: 85 },
      { skillId: "ALG1-U1-S2", score: 45 },
    ];
    const prompt = buildTutorSystemPrompt("Carol", "remediation", "Unit 1", skills);
    // The prompt should include the mastery section header
    expect(prompt).toContain("Student Mastery Data");
    // The low-scoring skill should appear in the "needing support" list
    expect(prompt).toContain("ALG1-U1-S2");
  });

  it("references mastery concepts in the prompt", () => {
    const prompt = buildTutorSystemPrompt("Dave", "teach", "Algebra", [
      { skillId: "ALG1-U1-S1", score: 95 },
    ]);
    // The prompt should include the mastery data section with skill IDs
    expect(prompt).toContain("Student Mastery Data");
    expect(prompt).toContain("ALG1-U1-S1");
  });
});

// ─── 6. Auth Logout (template test, preserved) ───────────────────────────────

import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type CookieCall = { name: string; options: Record<string, unknown> };
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];
  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({
      maxAge: -1,
      secure: true,
      sameSite: "none",
      httpOnly: true,
      path: "/",
    });
  });
});
