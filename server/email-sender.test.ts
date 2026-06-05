import { describe, it, expect } from "vitest";

describe("Email sender address configuration", () => {
  it("ENV.resendFromEmail resolves to noreply@educhamp.co", async () => {
    const { ENV } = await import("./_core/env");
    expect(ENV.resendFromEmail).toContain("noreply@educhamp.co");
    // Must be in proper format: "Name <email>" or just "email"
    expect(ENV.resendFromEmail).toMatch(/noreply@educhamp\.co/);
  });

  it("ENV.resendFromEmail does not contain mail.manus.im", async () => {
    const { ENV } = await import("./_core/env");
    expect(ENV.resendFromEmail).not.toContain("mail.manus.im");
  });

  it("ENV.resendFromEmail is properly decoded (no unicode escapes)", async () => {
    const { ENV } = await import("./_core/env");
    // Should not contain raw unicode escape sequences
    expect(ENV.resendFromEmail).not.toContain("\\u003c");
    expect(ENV.resendFromEmail).not.toContain("\\u003e");
  });

  it("email factory env fallback extracts correct fromAddress and fromName", async () => {
    const { ENV } = await import("./_core/env");
    const fromEnv = ENV.resendFromEmail;
    const match = fromEnv.match(/^(.+?)\s*<(.+?)>$/);
    if (match) {
      expect(match[1].trim()).toBe("EduChamp");
      expect(match[2].trim()).toBe("noreply@educhamp.co");
    } else {
      // Plain email format
      expect(fromEnv).toBe("noreply@educhamp.co");
    }
  });
});
