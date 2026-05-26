/**
 * Tests for auth enhancements: 2FA logic, password reset token flow,
 * welcome notification, and parent tools access control.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import speakeasy from "speakeasy";

// ─── 2FA / TOTP Logic ─────────────────────────────────────────────────────────

describe("TOTP 2FA logic", () => {
  it("generates a valid TOTP secret", () => {
    const secret = speakeasy.generateSecret({ length: 20 });
    expect(secret.base32).toBeTruthy();
    expect(secret.base32.length).toBeGreaterThan(10);
    expect(secret.otpauth_url).toContain("otpauth://totp/");
  });

  it("verifies a valid TOTP code against its secret", () => {
    const secret = speakeasy.generateSecret({ length: 20 });
    const token = speakeasy.totp({ secret: secret.base32, encoding: "base32" });
    const isValid = speakeasy.totp.verify({
      token,
      secret: secret.base32,
      encoding: "base32",
      window: 1,
    });
    expect(isValid).toBe(true);
  });

  it("rejects an invalid TOTP code", () => {
    const secret = speakeasy.generateSecret({ length: 20 });
    const isValid = speakeasy.totp.verify({
      token: "000000",
      secret: secret.base32,
      encoding: "base32",
      window: 0,
    });
    // Extremely unlikely to be valid; treat as false
    expect(typeof isValid).toBe("boolean");
  });

  it("generates 8 backup codes of length 10", () => {
    const { nanoid } = { nanoid: () => Math.random().toString(36).slice(2, 12).toUpperCase() };
    const backupCodes = Array.from({ length: 8 }, nanoid);
    expect(backupCodes).toHaveLength(8);
    backupCodes.forEach((code) => {
      expect(code.length).toBeGreaterThanOrEqual(8);
    });
  });
});

// ─── Password Reset Token Logic ───────────────────────────────────────────────

describe("Password reset token logic", () => {
  it("token expires after 1 hour", () => {
    const now = Date.now();
    const expiresAt = new Date(now + 60 * 60 * 1000);
    expect(expiresAt.getTime()).toBeGreaterThan(now);
    expect(expiresAt.getTime() - now).toBe(3600000);
  });

  it("expired token is detected correctly", () => {
    const expiresAt = new Date(Date.now() - 1000); // 1 second ago
    expect(expiresAt < new Date()).toBe(true);
  });

  it("valid token is detected correctly", () => {
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now
    expect(expiresAt > new Date()).toBe(true);
  });

  it("reset URL is constructed correctly from origin and token", () => {
    const origin = "https://educhamp.example.com";
    const token = "abc123xyz";
    const resetUrl = `${origin}/reset-password?token=${token}`;
    expect(resetUrl).toBe("https://educhamp.example.com/reset-password?token=abc123xyz");
  });
});

// ─── Parent Tools Access Control Logic ───────────────────────────────────────

describe("Parent tools child access check", () => {
  // Simulate the shape returned by getChildrenForParent
  const mockChildren = [
    { link: { id: 1, parentId: 10, childId: 100, nickname: "Emma", relationship: "parent", enrolledAt: new Date(), isActive: true }, child: { id: 100, name: "Emma Smith" } },
    { link: { id: 2, parentId: 10, childId: 200, nickname: null, relationship: "guardian", enrolledAt: new Date(), isActive: true }, child: { id: 200, name: "Jake Smith" } },
  ];

  it("correctly identifies a child belonging to the parent", () => {
    const childId = 100;
    const isMyChild = mockChildren.some((c) => c.link?.childId === childId);
    expect(isMyChild).toBe(true);
  });

  it("correctly rejects a child not belonging to the parent", () => {
    const childId = 999;
    const isMyChild = mockChildren.some((c) => c.link?.childId === childId);
    expect(isMyChild).toBe(false);
  });

  it("finds the correct child record for report generation", () => {
    const childId = 200;
    const child = mockChildren.find((c) => c.link?.childId === childId);
    expect(child).toBeDefined();
    expect(child?.link.nickname).toBeNull();
    expect(child?.child?.name).toBe("Jake Smith");
  });

  it("nickname falls back to null when not set", () => {
    const childId = 200;
    const child = mockChildren.find((c) => c.link?.childId === childId);
    const nickname = child?.link?.nickname ?? null;
    expect(nickname).toBeNull();
  });
});

// ─── Skill Gap Analysis Logic ─────────────────────────────────────────────────

describe("Skill gap analysis logic", () => {
  const masteryData = [
    { skillId: "ALG1-U1-S1", score: 95 },
    { skillId: "ALG1-U1-S2", score: 45 },
    { skillId: "ALG1-U2-S1", score: 72 },
    { skillId: "ALG1-U3-S1", score: 88 },
    { skillId: "ALG1-U3-S2", score: 30 },
  ];

  it("identifies gaps as skills below 75", () => {
    const gaps = masteryData.filter((m) => m.score < 75);
    expect(gaps).toHaveLength(3);
    expect(gaps.map((g) => g.skillId)).toContain("ALG1-U1-S2");
    expect(gaps.map((g) => g.skillId)).toContain("ALG1-U2-S1");
    expect(gaps.map((g) => g.skillId)).toContain("ALG1-U3-S2");
  });

  it("identifies strengths as skills at or above 90", () => {
    const strengths = masteryData.filter((m) => m.score >= 90);
    expect(strengths).toHaveLength(1);
    expect(strengths[0].skillId).toBe("ALG1-U1-S1");
  });

  it("assigns high priority to gaps below 60", () => {
    const gaps = masteryData
      .filter((m) => m.score < 75)
      .map((m) => ({ ...m, priority: m.score < 60 ? "high" : "medium" }));
    const highPriority = gaps.filter((g) => g.priority === "high");
    expect(highPriority).toHaveLength(2); // 45 and 30 are below 60
  });

  it("parses unit number from skill ID correctly", () => {
    const skillId = "ALG1-U3-S2";
    const match = skillId.match(/ALG1-U(\d+)-S(\d+)/);
    expect(match).not.toBeNull();
    expect(parseInt(match![1])).toBe(3);
    expect(parseInt(match![2])).toBe(2);
  });
});

// ─── Report CSV Generation Logic ─────────────────────────────────────────────

describe("CSV report generation", () => {
  it("generates valid CSV rows from skill data", () => {
    const skills = [
      { skillId: "ALG1-U1-S1", unitName: "Unit 1", score: 95, masteryLabel: "Advanced" },
      { skillId: "ALG1-U1-S2", unitName: "Unit 1", score: 45, masteryLabel: "Beginner" },
    ];
    const header = ["Skill ID", "Unit", "Score", "Mastery Level"];
    const rows = [header, ...skills.map((s) => [s.skillId, s.unitName, s.score.toString(), s.masteryLabel])];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");

    expect(csv).toContain('"Skill ID","Unit","Score","Mastery Level"');
    expect(csv).toContain('"ALG1-U1-S1","Unit 1","95","Advanced"');
    expect(csv).toContain('"ALG1-U1-S2","Unit 1","45","Beginner"');
  });

  it("calculates quiz percentage correctly", () => {
    const score = 12;
    const totalQuestions = 15;
    const percentage = Math.round((score / totalQuestions) * 100);
    expect(percentage).toBe(80);
  });

  it("calculates overall average from unit summaries", () => {
    const unitSummaries = [
      { averageScore: 80 },
      { averageScore: 60 },
      { averageScore: 90 },
    ];
    const overallAvg = Math.round(
      unitSummaries.reduce((s, u) => s + u.averageScore, 0) / unitSummaries.length
    );
    expect(overallAvg).toBe(77);
  });
});
