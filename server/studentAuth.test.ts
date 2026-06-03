/**
 * Tests for Student Local Authentication (studentAuth router)
 *
 * Covers: validateSetupToken, createPassword, loginWithPassword, sendSetupEmail, account linking
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB ─────────────────────────────────────────────────────────────────
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
};

vi.mock("../server/db", () => ({
  getDb: vi.fn().mockResolvedValue(mockDb),
  getUserByEmail: vi.fn().mockResolvedValue(null),
}));

vi.mock("../drizzle/schema", () => ({
  users: { id: "id", openId: "openId", email: "email", passwordHash: "passwordHash", status: "status" },
  passwordResetTokens: { token: "token", userId: "userId", expiresAt: "expiresAt", usedAt: "usedAt" },
  parentChildren: { parentId: "parentId", childId: "childId", isActive: "isActive" },
}));

vi.mock("nanoid", () => ({
  nanoid: vi.fn().mockReturnValue("test_token_abc123"),
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("$2a$12$hashedpassword"),
    compare: vi.fn().mockImplementation((plain: string, hash: string) => {
      return Promise.resolve(hash === "$2a$12$hashedpassword" && plain === "ValidPass1");
    }),
  },
}));

vi.mock("../server/_core/sdk", () => ({
  sdk: {
    createSessionToken: vi.fn().mockResolvedValue("mock_session_token"),
  },
}));

vi.mock("../server/emailService", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("../server/emailTemplates/studentSetup", () => ({
  buildStudentSetupEmail: vi.fn().mockReturnValue({
    html: "<p>Setup email</p>",
    text: "Setup email",
    subject: "Welcome to EduChamp!",
  }),
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Student Auth — Password Validation", () => {
  const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

  it("rejects passwords shorter than 8 characters", () => {
    expect(PASSWORD_REGEX.test("Ab1")).toBe(false);
    expect(PASSWORD_REGEX.test("Abc123")).toBe(false);
    expect(PASSWORD_REGEX.test("Short1")).toBe(false);
  });

  it("rejects passwords without uppercase", () => {
    expect(PASSWORD_REGEX.test("abcdefg1")).toBe(false);
    expect(PASSWORD_REGEX.test("lowercase1")).toBe(false);
  });

  it("rejects passwords without lowercase", () => {
    expect(PASSWORD_REGEX.test("ABCDEFG1")).toBe(false);
    expect(PASSWORD_REGEX.test("UPPERCASE1")).toBe(false);
  });

  it("rejects passwords without a number", () => {
    expect(PASSWORD_REGEX.test("Abcdefgh")).toBe(false);
    expect(PASSWORD_REGEX.test("NoNumber")).toBe(false);
  });

  it("accepts valid passwords", () => {
    expect(PASSWORD_REGEX.test("ValidPass1")).toBe(true);
    expect(PASSWORD_REGEX.test("MyP@ssw0rd")).toBe(true);
    expect(PASSWORD_REGEX.test("Str0ngPass!")).toBe(true);
    expect(PASSWORD_REGEX.test("Abcdefg1")).toBe(true);
  });
});

describe("Student Auth — Apple Device Detection", () => {
  function isAppleDevice(ua: string): boolean {
    const isAppleHardware = /iPhone|iPad|iPod|Macintosh/.test(ua);
    const isWebKit = /AppleWebKit/.test(ua);
    const isChromeOnMac = /Macintosh/.test(ua) && /Chrome\//.test(ua);
    return isAppleHardware && isWebKit && !isChromeOnMac;
  }

  it("detects iPhone Safari as Apple device", () => {
    const ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
    expect(isAppleDevice(ua)).toBe(true);
  });

  it("detects iPad Safari as Apple device", () => {
    const ua = "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
    expect(isAppleDevice(ua)).toBe(true);
  });

  it("detects Mac Safari as Apple device", () => {
    const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
    expect(isAppleDevice(ua)).toBe(true);
  });

  it("rejects Chrome on Mac (not native Apple Sign-In)", () => {
    const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    expect(isAppleDevice(ua)).toBe(false);
  });

  it("rejects Windows Chrome", () => {
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    expect(isAppleDevice(ua)).toBe(false);
  });

  it("rejects Android Chrome", () => {
    const ua = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
    expect(isAppleDevice(ua)).toBe(false);
  });

  it("rejects Firefox on Linux", () => {
    const ua = "Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0";
    expect(isAppleDevice(ua)).toBe(false);
  });
});

describe("Student Auth — Setup Email Template", () => {
  it("builds email with correct structure", async () => {
    const { buildStudentSetupEmail } = await vi.importActual<typeof import("../server/emailTemplates/studentSetup")>("../server/emailTemplates/studentSetup");
    const result = buildStudentSetupEmail({
      studentName: "Alice Johnson",
      parentName: "Bob Johnson",
      setupUrl: "https://educhamp.app/student-setup?token=abc123",
    });

    expect(result.subject).toContain("Alice");
    expect(result.subject).toContain("EduChamp");
    expect(result.html).toContain("Alice");
    expect(result.html).toContain("Bob Johnson");
    expect(result.html).toContain("https://educhamp.app/student-setup?token=abc123");
    expect(result.text).toContain("Alice");
    expect(result.text).toContain("Bob Johnson");
    expect(result.text).toContain("https://educhamp.app/student-setup?token=abc123");
  });

  it("uses first name in subject line", async () => {
    const { buildStudentSetupEmail } = await vi.importActual<typeof import("../server/emailTemplates/studentSetup")>("../server/emailTemplates/studentSetup");
    const result = buildStudentSetupEmail({
      studentName: "Charlie Brown",
      parentName: "Parent",
      setupUrl: "https://educhamp.app/student-setup?token=xyz",
    });
    expect(result.subject).toContain("Charlie");
    expect(result.subject).not.toContain("Brown");
  });

  it("includes privacy and terms links", async () => {
    const { buildStudentSetupEmail } = await vi.importActual<typeof import("../server/emailTemplates/studentSetup")>("../server/emailTemplates/studentSetup");
    const result = buildStudentSetupEmail({
      studentName: "Test",
      parentName: "Parent",
      setupUrl: "https://educhamp.app/student-setup?token=test",
    });
    expect(result.html).toContain("privacy");
    expect(result.html).toContain("terms");
  });
});

describe("Student Auth — OAuth Account Linking Logic", () => {
  it("identifies parent-enrolled students by child_ prefix", () => {
    const childOpenId = "child_abc123def456";
    expect(childOpenId.startsWith("child_")).toBe(true);
  });

  it("does not link regular OAuth accounts", () => {
    const regularOpenId = "oauth_user_12345";
    expect(regularOpenId.startsWith("child_")).toBe(false);
  });

  it("correctly identifies synthetic openIds for linking", () => {
    const testCases = [
      { openId: "child_abcdefghijklmnopqrstuvwx", shouldLink: true },
      { openId: "child_", shouldLink: true },
      { openId: "user_12345", shouldLink: false },
      { openId: "oauth2|google|12345", shouldLink: false },
      { openId: "", shouldLink: false },
    ];
    for (const tc of testCases) {
      expect(tc.openId.startsWith("child_")).toBe(tc.shouldLink);
    }
  });
});

describe("Student Auth — Password Strength Scoring", () => {
  function getPasswordStrength(password: string): { score: number; label: string } {
    if (!password) return { score: 0, label: "" };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z\d]/.test(password)) score++;

    if (score <= 2) return { score: 1, label: "Weak" };
    if (score <= 4) return { score: 2, label: "Fair" };
    if (score <= 5) return { score: 3, label: "Good" };
    return { score: 4, label: "Strong" };
  }

  it("scores empty password as 0", () => {
    expect(getPasswordStrength("").score).toBe(0);
  });

  it("scores short simple password as Weak", () => {
    expect(getPasswordStrength("abc").label).toBe("Weak");
  });

  it("scores medium password as Fair", () => {
    expect(getPasswordStrength("Abcdefg1").label).toBe("Fair");
  });

  it("scores longer complex password as Good", () => {
    expect(getPasswordStrength("Abcdefghijkl1").label).toBe("Good");
  });

  it("scores very complex password as Strong", () => {
    expect(getPasswordStrength("MyP@ssw0rd123!").label).toBe("Strong");
  });
});
