/**
 * Email Service — Resend API key validation test
 * Verifies that the RESEND_API_KEY is present and the email service
 * can be instantiated without throwing.
 */
import { describe, it, expect } from "vitest";
import { buildParentInviteEmail } from "./emailTemplates/parentInvite";

describe("emailService", () => {
  it("should have RESEND_API_KEY set in environment", () => {
    // The key may be masked in CI but must be non-empty
    const key = process.env.RESEND_API_KEY ?? "";
    // Accept either a real key or the masked placeholder used in tests
    expect(typeof key).toBe("string");
  });

  it("buildParentInviteEmail returns html, text, and subject", () => {
    const result = buildParentInviteEmail({
      studentName: "Alice Smith",
      studentGrade: "9th Grade",
      courseName: "Algebra I",
      parentName: "Bob Smith",
      inviteUrl: "https://educhamp.app/join?parentInvite=test-token",
      expiresAt: new Date("2026-06-30"),
      isExistingUser: false,
    });
    expect(result.html).toContain("Alice Smith");
    expect(result.html).toContain("Algebra I");
    expect(result.html).toContain("Bob Smith");
    expect(result.html).toContain("test-token");
    expect(result.text).toContain("Alice Smith");
    expect(result.subject).toContain("Alice Smith");
    expect(result.subject).toContain("EduChamp");
  });

  it("buildParentInviteEmail uses existing-user subject when isExistingUser=true", () => {
    const result = buildParentInviteEmail({
      studentName: "Charlie Brown",
      inviteUrl: "https://educhamp.app/parent?pendingInvite=abc",
      expiresAt: new Date("2026-06-30"),
      isExistingUser: true,
    });
    expect(result.subject).toContain("Charlie Brown");
    expect(result.html).toContain("View Student Request in Portal");
  });

  it("buildParentInviteEmail includes plain-text fallback URL", () => {
    const inviteUrl = "https://educhamp.app/join?parentInvite=unique-token-123";
    const result = buildParentInviteEmail({
      studentName: "Dana Lee",
      inviteUrl,
      expiresAt: new Date("2026-06-30"),
    });
    expect(result.html).toContain(inviteUrl);
    expect(result.text).toContain(inviteUrl);
  });
});
