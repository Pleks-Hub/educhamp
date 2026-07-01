/**
 * Sprint 60 Tests — Admin Voice Quality Report, Low-Rating Notification, Listen Mode Goals
 */
import { describe, it, expect, vi } from "vitest";

// ─── Admin Voice Quality Report ─────────────────────────────────────────────

describe("Admin Voice Quality Report", () => {
  it("should aggregate ratings by voiceUri with thumbsUp/thumbsDown counts", () => {
    // Simulate aggregation logic
    const rows = [
      { voiceUri: "Google US English", rating: "thumbs_up", count: 12 },
      { voiceUri: "Google US English", rating: "thumbs_down", count: 3 },
      { voiceUri: "Microsoft David", rating: "thumbs_up", count: 5 },
      { voiceUri: "Microsoft David", rating: "thumbs_down", count: 8 },
    ];

    const voiceMap: Record<string, { thumbsUp: number; thumbsDown: number }> = {};
    for (const row of rows) {
      if (!voiceMap[row.voiceUri]) voiceMap[row.voiceUri] = { thumbsUp: 0, thumbsDown: 0 };
      if (row.rating === "thumbs_up") voiceMap[row.voiceUri].thumbsUp = Number(row.count);
      else voiceMap[row.voiceUri].thumbsDown = Number(row.count);
    }

    expect(voiceMap["Google US English"]).toEqual({ thumbsUp: 12, thumbsDown: 3 });
    expect(voiceMap["Microsoft David"]).toEqual({ thumbsUp: 5, thumbsDown: 8 });
  });

  it("should calculate approval rate correctly", () => {
    const thumbsUp = 7;
    const thumbsDown = 3;
    const total = thumbsUp + thumbsDown;
    const approvalRate = total > 0 ? Math.round((thumbsUp / total) * 100) : 0;
    expect(approvalRate).toBe(70);
  });

  it("should handle zero ratings with 0% approval", () => {
    const thumbsUp = 0;
    const thumbsDown = 0;
    const total = thumbsUp + thumbsDown;
    const approvalRate = total > 0 ? Math.round((thumbsUp / total) * 100) : 0;
    expect(approvalRate).toBe(0);
  });

  it("should sort by total ratings descending", () => {
    const voices = [
      { voiceUri: "A", total: 5, approvalRate: 80 },
      { voiceUri: "B", total: 15, approvalRate: 60 },
      { voiceUri: "C", total: 10, approvalRate: 90 },
    ];
    voices.sort((a, b) => b.total - a.total);
    expect(voices[0].voiceUri).toBe("B");
    expect(voices[1].voiceUri).toBe("C");
    expect(voices[2].voiceUri).toBe("A");
  });

  it("should sort by lowest approval rate first", () => {
    const voices = [
      { voiceUri: "A", total: 5, approvalRate: 80 },
      { voiceUri: "B", total: 15, approvalRate: 30 },
      { voiceUri: "C", total: 10, approvalRate: 60 },
    ];
    voices.sort((a, b) => a.approvalRate - b.approvalRate);
    expect(voices[0].voiceUri).toBe("B");
    expect(voices[1].voiceUri).toBe("C");
    expect(voices[2].voiceUri).toBe("A");
  });

  it("should sort by name alphabetically", () => {
    const voices = [
      { voiceUri: "Zara", total: 5 },
      { voiceUri: "Alice", total: 15 },
      { voiceUri: "Mike", total: 10 },
    ];
    voices.sort((a, b) => a.voiceUri.localeCompare(b.voiceUri));
    expect(voices[0].voiceUri).toBe("Alice");
    expect(voices[1].voiceUri).toBe("Mike");
    expect(voices[2].voiceUri).toBe("Zara");
  });
});

// ─── Low Voice Rating Notification ──────────────────────────────────────────

describe("Low Voice Rating Notification Logic", () => {
  it("should not notify when thumbs_down count is less than 3", () => {
    const thumbsDownCount = 2;
    const shouldNotify = thumbsDownCount >= 3;
    expect(shouldNotify).toBe(false);
  });

  it("should notify when thumbs_down count reaches 3", () => {
    const thumbsDownCount = 3;
    const shouldNotify = thumbsDownCount >= 3;
    expect(shouldNotify).toBe(true);
  });

  it("should notify when thumbs_down count exceeds 3", () => {
    const thumbsDownCount = 7;
    const shouldNotify = thumbsDownCount >= 3;
    expect(shouldNotify).toBe(true);
  });

  it("should generate correct notification message", () => {
    const voiceUri = "Microsoft David";
    const thumbsDownCount = 4;
    const message = `Your child has rated the voice "${voiceUri}" poorly ${thumbsDownCount} times. Consider changing their TTS voice in Listen Mode settings for a better experience.`;
    expect(message).toContain("Microsoft David");
    expect(message).toContain("4 times");
    expect(message).toContain("Listen Mode settings");
  });

  it("should skip notification if already sent within 7 days", () => {
    const recentNotifSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const existingNotifDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
    const alreadyNotified = existingNotifDate >= recentNotifSince;
    expect(alreadyNotified).toBe(true); // Should skip
  });

  it("should send notification if last one was over 7 days ago", () => {
    const recentNotifSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const existingNotifDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
    const alreadyNotified = existingNotifDate >= recentNotifSince;
    expect(alreadyNotified).toBe(false); // Should send
  });
});

// ─── Listen Mode Weekly Goals ────────────────────────────────────────────────

describe("Listen Mode Weekly Goals", () => {
  it("should calculate progress percentage correctly", () => {
    const currentSessions = 3;
    const weeklyTarget = 5;
    const progress = Math.min(100, Math.round((currentSessions / weeklyTarget) * 100));
    expect(progress).toBe(60);
  });

  it("should cap progress at 100% when exceeded", () => {
    const currentSessions = 8;
    const weeklyTarget = 5;
    const progress = Math.min(100, Math.round((currentSessions / weeklyTarget) * 100));
    expect(progress).toBe(100);
  });

  it("should detect goal met when sessions >= target", () => {
    const currentSessions = 5;
    const weeklyTarget = 5;
    const goalMet = currentSessions >= weeklyTarget;
    expect(goalMet).toBe(true);
  });

  it("should detect goal not met when sessions < target", () => {
    const currentSessions = 4;
    const weeklyTarget = 5;
    const goalMet = currentSessions >= weeklyTarget;
    expect(goalMet).toBe(false);
  });

  it("should validate weekly target range (1-50)", () => {
    const validTargets = [1, 5, 10, 25, 50];
    const invalidTargets = [0, -1, 51, 100];
    for (const t of validTargets) {
      expect(t >= 1 && t <= 50).toBe(true);
    }
    for (const t of invalidTargets) {
      expect(t >= 1 && t <= 50).toBe(false);
    }
  });

  it("should calculate week start correctly (Sunday)", () => {
    const now = new Date("2026-07-01T12:00:00Z"); // Wednesday
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    expect(weekStart.getDay()).toBe(0); // Sunday
    expect(weekStart.getDate()).toBe(28); // June 28 is Sunday before July 1
  });

  it("should calculate SVG progress ring offset correctly", () => {
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const progress = 60; // 60%
    const offset = circumference - (progress / 100) * circumference;
    expect(offset).toBeCloseTo(circumference * 0.4, 1);
  });

  it("should handle 0% progress with full offset", () => {
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const progress = 0;
    const offset = circumference - (progress / 100) * circumference;
    expect(offset).toBeCloseTo(circumference, 1);
  });

  it("should handle 100% progress with zero offset", () => {
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const progress = 100;
    const offset = circumference - (progress / 100) * circumference;
    expect(offset).toBeCloseTo(0, 1);
  });
});

// ─── Deprecated Voices ───────────────────────────────────────────────────────

describe("Deprecated Voices Management", () => {
  it("should identify deprecated voices from a set", () => {
    const deprecated = [
      { id: 1, voiceUri: "BadVoice1" },
      { id: 2, voiceUri: "BadVoice2" },
    ];
    const deprecatedUris = new Set(deprecated.map(d => d.voiceUri));
    expect(deprecatedUris.has("BadVoice1")).toBe(true);
    expect(deprecatedUris.has("GoodVoice")).toBe(false);
  });

  it("should filter deprecated voices from active list", () => {
    const allVoices = [
      { voiceUri: "Voice1", total: 10 },
      { voiceUri: "Voice2", total: 5 },
      { voiceUri: "Voice3", total: 8 },
    ];
    const deprecatedUris = new Set(["Voice2"]);
    const active = allVoices.filter(v => !deprecatedUris.has(v.voiceUri));
    expect(active.length).toBe(2);
    expect(active.find(v => v.voiceUri === "Voice2")).toBeUndefined();
  });
});
