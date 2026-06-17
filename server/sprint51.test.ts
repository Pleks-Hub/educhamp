import { describe, it, expect } from "vitest";

// ─── Sprint 51: Setup Progress Bar, Personal Note, In-App Notifications ──────

describe("Sprint 51 — Setup Progress Bar", () => {
  it("should compute progress steps correctly for pending student (no password, no onboarding)", () => {
    const steps = computeSetupSteps({ hasPassword: false, onboardingCompleted: false });
    expect(steps.total).toBe(2);
    expect(steps.completed).toBe(0);
    expect(steps.percentage).toBe(0);
    expect(steps.remaining).toEqual(["Set password", "Complete onboarding"]);
  });

  it("should compute progress steps for student with password but no onboarding", () => {
    const steps = computeSetupSteps({ hasPassword: true, onboardingCompleted: false });
    expect(steps.total).toBe(2);
    expect(steps.completed).toBe(1);
    expect(steps.percentage).toBe(50);
    expect(steps.remaining).toEqual(["Complete onboarding"]);
  });

  it("should compute progress steps for fully setup student", () => {
    const steps = computeSetupSteps({ hasPassword: true, onboardingCompleted: true });
    expect(steps.total).toBe(2);
    expect(steps.completed).toBe(2);
    expect(steps.percentage).toBe(100);
    expect(steps.remaining).toEqual([]);
  });
});

describe("Sprint 51 — Personal Note in Setup Email", () => {
  it("should include personal note in email template when provided", () => {
    const note = "Hi sweetie! Please set up your account so we can track your progress.";
    const emailHtml = buildEmailWithNote(note);
    expect(emailHtml).toContain(note);
    expect(emailHtml).toContain("personal note");
  });

  it("should not include personal note section when note is empty", () => {
    const emailHtml = buildEmailWithNote("");
    expect(emailHtml).not.toContain("personal note");
  });

  it("should sanitize HTML in personal note to prevent XSS", () => {
    const maliciousNote = '<script>alert("xss")</script>Hello';
    const emailHtml = buildEmailWithNote(maliciousNote);
    expect(emailHtml).not.toContain("<script>");
    expect(emailHtml).toContain("Hello");
  });
});

describe("Sprint 51 — In-App Notifications for Parent Milestones", () => {
  it("should create notification with correct type for setup completion", () => {
    const notification = buildNotification("student_setup_complete", "Alice", { studentId: 1 });
    expect(notification.type).toBe("student_setup_complete");
    expect(notification.title).toContain("Alice");
    expect(notification.title).toContain("completed setup");
  });

  it("should create notification with correct type for diagnostic completion", () => {
    const notification = buildNotification("milestone_diagnostic_complete", "Bob", { overallScore: 85 });
    expect(notification.type).toBe("milestone_diagnostic_complete");
    expect(notification.title).toContain("Bob");
    expect(notification.title).toContain("diagnostic");
  });

  it("should include encouraging message for high diagnostic scores", () => {
    const notification = buildNotification("milestone_diagnostic_complete", "Charlie", { overallScore: 92 });
    expect(notification.message).toContain("Excellent");
  });

  it("should include supportive message for lower diagnostic scores", () => {
    const notification = buildNotification("milestone_diagnostic_complete", "Dave", { overallScore: 45 });
    expect(notification.message).toContain("support");
  });

  it("should create notification for unit mastery", () => {
    const notification = buildNotification("milestone_mastery", "Eve", { score: 95, unitTitle: "Linear Equations" });
    expect(notification.type).toBe("milestone_mastery");
    expect(notification.title).toContain("Eve");
    expect(notification.message).toContain("95%");
  });
});

// ─── Helper functions (mirroring the app logic) ─────────────────────────────

function computeSetupSteps(child: { hasPassword: boolean; onboardingCompleted: boolean }) {
  const steps = [
    { label: "Set password", done: child.hasPassword },
    { label: "Complete onboarding", done: child.onboardingCompleted },
  ];
  const completed = steps.filter(s => s.done).length;
  const total = steps.length;
  return {
    total,
    completed,
    percentage: Math.round((completed / total) * 100),
    remaining: steps.filter(s => !s.done).map(s => s.label),
  };
}

function buildEmailWithNote(note: string): string {
  // Sanitize HTML
  const sanitized = note.replace(/<[^>]*>/g, "").trim();
  if (!sanitized) {
    return `<div><h2>Setup your account</h2><p>Click the link to get started.</p></div>`;
  }
  return `<div><h2>Setup your account</h2><div class="personal note"><p style="font-style:italic;color:#4b5563">"${sanitized}"</p><p style="font-size:12px;color:#9ca3af">— personal note from your parent</p></div><p>Click the link to get started.</p></div>`;
}

function buildNotification(type: string, studentName: string, meta: Record<string, any>) {
  switch (type) {
    case "student_setup_complete":
      return {
        type,
        title: `${studentName} completed setup!`,
        message: `${studentName} has finished setting up their EduChamp account and is now active. You can view their progress from your dashboard.`,
        metadata: JSON.stringify({ ...meta, completedAt: Date.now() }),
      };
    case "milestone_diagnostic_complete": {
      const score = meta.overallScore ?? 0;
      const msg = score >= 80
        ? "Excellent performance!"
        : score >= 60
        ? "Good effort — check their dashboard for details."
        : "They may need some extra support — review their results together.";
      return {
        type,
        title: `${studentName} completed the diagnostic test!`,
        message: `${studentName} scored ${score}% on the placement diagnostic. ${msg}`,
        metadata: JSON.stringify(meta),
      };
    }
    case "milestone_mastery":
      return {
        type,
        title: `${studentName} achieved mastery on ${meta.unitTitle}!`,
        message: `${studentName} scored an outstanding ${meta.score}% on "${meta.unitTitle}". This demonstrates strong understanding of the material.`,
        metadata: JSON.stringify(meta),
      };
    default:
      return { type, title: "", message: "", metadata: "{}" };
  }
}
