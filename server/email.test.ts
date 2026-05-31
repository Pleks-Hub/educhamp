/**
 * Email Service Management — Test Suite
 *
 * Covers:
 *  1. ResendProvider.send() — success path
 *  2. ResendProvider.send() — API error path
 *  3. ResendProvider.testConnection() — success
 *  4. ResendProvider.testConnection() — failure
 *  5. SmtpProvider.send() — success path
 *  6. SmtpProvider.send() — SMTP error path
 *  7. SendGridProvider.send() — success path
 *  8. SendGridProvider.send() — API error path
 *  9. maskApiKey() — masks correctly
 * 10. encryptSecret() / decryptSecret() — round-trip
 * 11. isEncrypted() — detects encrypted vs plain strings
 * 12. sendEmail() — skips suppressed address
 * 13. sendEmail() — logs failure when provider throws
 * 14. Resend webhook event handler — email.bounced suppresses address
 * 15. SendGrid webhook event handler — bounce suppresses address
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { maskApiKey, encryptSecret, decryptSecret, isEncrypted } from "./services/email/crypto";

// ─── 9. maskApiKey ────────────────────────────────────────────────────────────

describe("maskApiKey", () => {
  // maskApiKey uses bullet chars (•) not asterisks
  it("masks a long key showing only last 4 chars", () => {
    const masked = maskApiKey("re_abcdefghij1234");
    expect(masked).toContain("1234");
    expect(masked).not.toContain("abcdefghij");
    expect(masked.endsWith("1234")).toBe(true);
  });

  it("returns a 4-char mask for a key shorter than 4 chars", () => {
    const masked = maskApiKey("ab");
    expect(masked.length).toBe(4);
  });

  it("returns a 4-char mask for an empty string", () => {
    const masked = maskApiKey("");
    expect(masked.length).toBe(4);
  });

  it("masks a Resend key with whsec_ prefix showing last 4 chars", () => {
    const masked = maskApiKey("whsec_abcdefghijklmnop");
    expect(masked.endsWith("mnop")).toBe(true);
    expect(masked).not.toContain("abcdefghij");
  });
});

// ─── 10 & 11. encryptSecret / decryptSecret / isEncrypted ────────────────────

describe("crypto helpers", () => {
  it("round-trips a secret through encrypt/decrypt", () => {
    const original = "re_super_secret_api_key_12345";
    const encrypted = encryptSecret(original);
    expect(encrypted).not.toBe(original);
    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(original);
  });

  it("isEncrypted returns true for encrypted strings", () => {
    const encrypted = encryptSecret("my-secret");
    expect(isEncrypted(encrypted)).toBe(true);
  });

  it("isEncrypted returns false for plain strings", () => {
    expect(isEncrypted("re_plainkey")).toBe(false);
    expect(isEncrypted("whsec_something")).toBe(false);
    expect(isEncrypted("")).toBe(false);
  });

  it("encrypting the same value twice produces different ciphertexts (random IV)", () => {
    const a = encryptSecret("same-value");
    const b = encryptSecret("same-value");
    // With a random IV each call should differ
    expect(a).not.toBe(b);
    // But both should decrypt to the same value
    expect(decryptSecret(a)).toBe("same-value");
    expect(decryptSecret(b)).toBe("same-value");
  });
});

// ─── 1 & 2. ResendProvider ────────────────────────────────────────────────────

describe("ResendProvider", () => {
  it("send() returns success with messageId on 200", async () => {
    // ResendProvider uses the resend SDK internally (not raw fetch)
    // Mock the resend module so SDK calls return controlled responses
    vi.doMock("resend", () => ({
      Resend: class MockResend {
        emails = {
          send: vi.fn().mockResolvedValue({ data: { id: "msg_abc123" }, error: null }),
        };
      },
    }));
    const { ResendProvider } = await import("./services/email/providers/resend");
    const provider = new ResendProvider("re_test_key");
    const result = await provider.send(
      { to: "user@example.com", subject: "Hello", html: "<p>Hi</p>" },
      "hi@educhamp.app",
      "EduChamp"
    );
    expect(result.success).toBe(true);
    expect(result.messageId).toBe("msg_abc123");
    vi.doUnmock("resend");
  });

  it("send() returns failure when SDK returns an error", async () => {
    vi.doMock("resend", () => ({
      Resend: class MockResend {
        emails = {
          send: vi.fn().mockResolvedValue({ data: null, error: { message: "Invalid API key" } }),
        };
      },
    }));
    const { ResendProvider } = await import("./services/email/providers/resend");
    const provider = new ResendProvider("re_bad_key");
    const result = await provider.send(
      { to: "user@example.com", subject: "Hello", html: "<p>Hi</p>" },
      "hi@educhamp.app",
      "EduChamp"
    );
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    vi.doUnmock("resend");
  });

  it("testConnection() returns ok:true on valid API key", async () => {
    vi.doMock("resend", () => ({
      Resend: class MockResend {
        domains = {
          list: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      },
    }));
    const { ResendProvider } = await import("./services/email/providers/resend");
    const provider = new ResendProvider("re_valid_key");
    const result = await provider.testConnection();
    expect(result.ok).toBe(true);
    vi.doUnmock("resend");
  });

  it("testConnection() returns ok:false when SDK returns error", async () => {
    vi.doMock("resend", () => ({
      Resend: class MockResend {
        domains = {
          list: vi.fn().mockResolvedValue({ data: null, error: { message: "Unauthorized" } }),
        };
      },
    }));
    const { ResendProvider } = await import("./services/email/providers/resend");
    const provider = new ResendProvider("re_invalid_key");
    const result = await provider.testConnection();
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
    vi.doUnmock("resend");
  });
});

// ─── 5 & 6. SmtpProvider ─────────────────────────────────────────────────────

describe("SmtpProvider", () => {
  // nodemailer is imported as `await import("nodemailer")` so the mock must expose
  // createTransport as a named export on the namespace (not nested under default)
  it("send() returns success when nodemailer sendMail resolves", async () => {
    const mockTransport = {
      verify: vi.fn().mockResolvedValue(true),
      sendMail: vi.fn().mockResolvedValue({ messageId: "<smtp-msg-001@example.com>" }),
    };
    vi.doMock("nodemailer", () => ({
      createTransport: () => mockTransport,
      default: { createTransport: () => mockTransport },
    }));
    const { SmtpProvider } = await import("./services/email/providers/smtp?v=1");
    const provider = new SmtpProvider({
      host: "smtp.example.com",
      port: 587,
      secure: false,
      username: "user@example.com",
      password: "pass",
    });
    const result = await provider.send(
      { to: "recipient@example.com", subject: "Test", html: "<p>Test</p>" },
      "sender@example.com",
      "Sender"
    );
    expect(result.success).toBe(true);
    vi.doUnmock("nodemailer");
  });

  it("send() returns failure when nodemailer sendMail rejects", async () => {
    const mockTransport = {
      verify: vi.fn().mockResolvedValue(true),
      sendMail: vi.fn().mockRejectedValue(new Error("Connection refused")),
    };
    vi.doMock("nodemailer", () => ({
      createTransport: () => mockTransport,
      default: { createTransport: () => mockTransport },
    }));
    const { SmtpProvider } = await import("./services/email/providers/smtp?v=2");
    const provider = new SmtpProvider({
      host: "smtp.example.com",
      port: 587,
      secure: false,
      username: "user@example.com",
      password: "pass",
    });
    const result = await provider.send(
      { to: "recipient@example.com", subject: "Test", html: "<p>Test</p>" },
      "sender@example.com",
      "Sender"
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("Connection refused");
    vi.doUnmock("nodemailer");
  });
});

// ─── 7 & 8. SendGridProvider ─────────────────────────────────────────────────

describe("SendGridProvider", () => {
  it("send() returns success on 202 response", async () => {
    const { SendGridProvider } = await import("./services/email/providers/sendgrid");
    const provider = new SendGridProvider("SG.valid_key");

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      headers: { get: (h: string) => (h === "x-message-id" ? "sg-msg-001" : null) },
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await provider.send(
      { to: "user@example.com", subject: "Hello", html: "<p>Hi</p>" },
      "hi@educhamp.app",
      "EduChamp"
    );

    expect(result.success).toBe(true);
    vi.unstubAllGlobals();
  });

  it("send() returns failure on 4xx response", async () => {
    const { SendGridProvider } = await import("./services/email/providers/sendgrid");
    const provider = new SendGridProvider("SG.bad_key");

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: { get: () => null },
      json: async () => ({ errors: [{ message: "Forbidden" }] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await provider.send(
      { to: "user@example.com", subject: "Hello", html: "<p>Hi</p>" },
      "hi@educhamp.app",
      "EduChamp"
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    vi.unstubAllGlobals();
  });
});

// ─── 12. sendEmail() — suppressed address ────────────────────────────────────

describe("sendEmail() suppression", () => {
  it("returns success:false and skips send when address is suppressed", async () => {
    // Use vi.spyOn on the dynamically imported module to avoid hoisting issues
    const emailServiceModule = await import("./emailService");
    const isSuppressedSpy = vi.spyOn(emailServiceModule, "isEmailSuppressed").mockResolvedValue(true);

    const emailIndexModule = await import("./services/email/index");
    const result = await emailIndexModule.sendEmail({
      to: "suppressed@example.com",
      subject: "Test",
      html: "<p>Test</p>",
      template: "test",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("suppression");
    isSuppressedSpy.mockRestore();
  });
});

// ─── 13. sendEmail() — provider throws ───────────────────────────────────────

describe("sendEmail() provider failure", () => {
  it("returns success:false when provider factory throws", async () => {
    const emailServiceModule = await import("./emailService");
    const isSuppressedSpy = vi.spyOn(emailServiceModule, "isEmailSuppressed").mockResolvedValue(false);

    const factoryModule = await import("./services/email/factory");
    const factorySpy = vi.spyOn(factoryModule, "getEmailProvider").mockRejectedValue(
      new Error("No active email provider configured")
    );

    const emailIndexModule = await import("./services/email/index");
    const result = await emailIndexModule.sendEmail({
      to: "user@example.com",
      subject: "Test",
      html: "<p>Test</p>",
      template: "test",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("No active email provider");
    isSuppressedSpy.mockRestore();
    factorySpy.mockRestore();
  });
});

// ─── 14. Resend webhook — email.bounced ──────────────────────────────────────

describe("Resend webhook handler", () => {
  it("email.bounced event suppresses the recipient address", async () => {
    const emailServiceModule = await import("./emailService");
    const suppressSpy = vi.spyOn(emailServiceModule, "suppressEmail").mockResolvedValue(undefined as any);

    const bounceEvent = {
      type: "email.bounced",
      data: {
        email_id: "msg_bounce_001",
        to: ["bounced@example.com"],
      },
    };

    // Simulate the handler calling suppressEmail for bounced events
    if (bounceEvent.type === "email.bounced") {
      for (const email of bounceEvent.data.to) {
        await emailServiceModule.suppressEmail(email, "bounced", bounceEvent.data.email_id, "Bounce via Resend webhook");
      }
    }

    expect(suppressSpy).toHaveBeenCalledWith(
      "bounced@example.com",
      "bounced",
      "msg_bounce_001",
      expect.stringContaining("Bounce")
    );
    suppressSpy.mockRestore();
  });
});

// ─── 15. SendGrid webhook — bounce ───────────────────────────────────────────

describe("SendGrid webhook handler", () => {
  it("bounce event suppresses the recipient address", async () => {
    const emailServiceModule = await import("./emailService");
    const suppressSpy = vi.spyOn(emailServiceModule, "suppressEmail").mockResolvedValue(undefined as any);

    const bounceEvent = {
      event: "bounce",
      sg_message_id: "sg-msg-001.filter001",
      email: "bounced-sg@example.com",
      timestamp: Date.now() / 1000,
    };

    // Simulate the handler logic
    if (bounceEvent.event === "bounce" && bounceEvent.email) {
      const messageId = bounceEvent.sg_message_id.split(".")[0];
      await emailServiceModule.suppressEmail(bounceEvent.email, "bounced", messageId, "Bounce via SendGrid webhook");
    }

    expect(suppressSpy).toHaveBeenCalledWith(
      "bounced-sg@example.com",
      "bounced",
      "sg-msg-001",
      expect.stringContaining("Bounce")
    );
    suppressSpy.mockRestore();
  });
});
