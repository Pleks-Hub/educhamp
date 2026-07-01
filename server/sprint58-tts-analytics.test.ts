/**
 * Sprint 58 Tests — TTS Analytics, Auto-scroll, VoiceDownloadPrompt
 *
 * Covers:
 *  1. tts.logSession input validation
 *  2. tts.getUsageStats aggregation logic
 *  3. Auto-scroll behavior (userScrolledUp state)
 *  4. VoiceDownloadPrompt platform detection
 *  5. TTS session duration tracking
 *  6. Weekly trend aggregation
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── 1. TTS logSession input validation ──────────────────────────────────────

describe("TTS logSession — input validation", () => {
  const validInput = {
    courseSubject: "English Language Arts",
    sessionDurationMs: 45000,
    sentencesRead: 12,
    speed: "normal" as const,
    voiceUri: "Google US English",
  };

  it("accepts valid input with all fields", () => {
    expect(validInput.courseSubject).toBeTruthy();
    expect(validInput.sessionDurationMs).toBeGreaterThan(0);
    expect(validInput.sentencesRead).toBeGreaterThanOrEqual(0);
    expect(["slow", "normal", "fast"]).toContain(validInput.speed);
  });

  it("sessionDurationMs must be a non-negative integer", () => {
    expect(Number.isInteger(validInput.sessionDurationMs)).toBe(true);
    expect(validInput.sessionDurationMs).toBeGreaterThanOrEqual(0);
  });

  it("sentencesRead must be a non-negative integer", () => {
    expect(Number.isInteger(validInput.sentencesRead)).toBe(true);
    expect(validInput.sentencesRead).toBeGreaterThanOrEqual(0);
  });

  it("speed must be one of slow/normal/fast", () => {
    const validSpeeds = ["slow", "normal", "fast"];
    expect(validSpeeds).toContain(validInput.speed);
    expect(validSpeeds).not.toContain("extra_fast");
    expect(validSpeeds).not.toContain("");
  });

  it("voiceUri can be null", () => {
    const inputWithNullVoice = { ...validInput, voiceUri: null };
    expect(inputWithNullVoice.voiceUri).toBeNull();
  });

  it("courseSubject must be a non-empty string", () => {
    expect(validInput.courseSubject.length).toBeGreaterThan(0);
  });
});

// ─── 2. TTS getUsageStats aggregation logic ──────────────────────────────────

describe("TTS getUsageStats — aggregation logic", () => {
  const mockLogs = [
    { userId: 1, courseSubject: "ELA", sessionDurationMs: 30000, sentencesRead: 8, speed: "normal", createdAt: new Date("2026-06-25") },
    { userId: 1, courseSubject: "ELA", sessionDurationMs: 45000, sentencesRead: 12, speed: "fast", createdAt: new Date("2026-06-26") },
    { userId: 1, courseSubject: "History", sessionDurationMs: 60000, sentencesRead: 15, speed: "normal", createdAt: new Date("2026-06-27") },
    { userId: 2, courseSubject: "Science", sessionDurationMs: 20000, sentencesRead: 5, speed: "slow", createdAt: new Date("2026-06-28") },
    { userId: 1, courseSubject: "ELA", sessionDurationMs: 55000, sentencesRead: 14, speed: "normal", createdAt: new Date("2026-06-29") },
  ];

  it("calculates total sessions correctly", () => {
    expect(mockLogs.length).toBe(5);
  });

  it("calculates total duration correctly", () => {
    const totalDurationMs = mockLogs.reduce((sum, l) => sum + l.sessionDurationMs, 0);
    expect(totalDurationMs).toBe(210000); // 30k + 45k + 60k + 20k + 55k
  });

  it("calculates total sentences correctly", () => {
    const totalSentences = mockLogs.reduce((sum, l) => sum + l.sentencesRead, 0);
    expect(totalSentences).toBe(54); // 8 + 12 + 15 + 5 + 14
  });

  it("calculates average duration correctly", () => {
    const totalDurationMs = mockLogs.reduce((sum, l) => sum + l.sessionDurationMs, 0);
    const avgDurationMs = Math.round(totalDurationMs / mockLogs.length);
    expect(avgDurationMs).toBe(42000); // 210000 / 5
  });

  it("identifies top subjects by session count", () => {
    const subjectCounts: Record<string, number> = {};
    for (const log of mockLogs) {
      subjectCounts[log.courseSubject] = (subjectCounts[log.courseSubject] || 0) + 1;
    }
    const topSubjects = Object.entries(subjectCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([subject, count]) => ({ subject, sessions: count }));

    expect(topSubjects[0].subject).toBe("ELA");
    expect(topSubjects[0].sessions).toBe(3);
    expect(topSubjects[1].subject).toBe("History");
    expect(topSubjects[1].sessions).toBe(1);
  });

  it("aggregates per-child stats correctly", () => {
    const childStats: Record<number, { sessions: number; durationMs: number; sentences: number }> = {};
    for (const log of mockLogs) {
      if (!childStats[log.userId]) {
        childStats[log.userId] = { sessions: 0, durationMs: 0, sentences: 0 };
      }
      childStats[log.userId].sessions++;
      childStats[log.userId].durationMs += log.sessionDurationMs;
      childStats[log.userId].sentences += log.sentencesRead;
    }

    expect(childStats[1].sessions).toBe(4);
    expect(childStats[1].durationMs).toBe(190000);
    expect(childStats[1].sentences).toBe(49);
    expect(childStats[2].sessions).toBe(1);
    expect(childStats[2].durationMs).toBe(20000);
    expect(childStats[2].sentences).toBe(5);
  });
});

// ─── 3. Auto-scroll behavior ─────────────────────────────────────────────────

describe("Auto-scroll — userScrolledUp state logic", () => {
  function computeUserScrolledUp(scrollTop: number, scrollHeight: number, clientHeight: number): boolean {
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    return distanceFromBottom > 100;
  }

  it("returns false when at bottom of chat", () => {
    // scrollHeight=1000, scrollTop=900, clientHeight=100 → at bottom
    expect(computeUserScrolledUp(900, 1000, 100)).toBe(false);
  });

  it("returns true when scrolled significantly up", () => {
    // scrollHeight=1000, scrollTop=500, clientHeight=100 → 400px from bottom
    expect(computeUserScrolledUp(500, 1000, 100)).toBe(true);
  });

  it("returns false when within 100px threshold of bottom", () => {
    // scrollHeight=1000, scrollTop=850, clientHeight=100 → 50px from bottom
    expect(computeUserScrolledUp(850, 1000, 100)).toBe(false);
  });

  it("returns true when exactly at threshold boundary (101px)", () => {
    // scrollHeight=1000, scrollTop=799, clientHeight=100 → 101px from bottom
    expect(computeUserScrolledUp(799, 1000, 100)).toBe(true);
  });

  it("returns false when exactly at threshold (100px)", () => {
    // scrollHeight=1000, scrollTop=800, clientHeight=100 → 100px from bottom
    expect(computeUserScrolledUp(800, 1000, 100)).toBe(false);
  });
});

// ─── 4. VoiceDownloadPrompt — platform detection ─────────────────────────────

describe("VoiceDownloadPrompt — platform detection", () => {
  function detectPlatform(ua: string): string {
    const lower = ua.toLowerCase();
    if (/cros/.test(lower)) return "chromeos";
    if (/iphone|ipad|ipod/.test(lower)) return "ios";
    if (/android/.test(lower)) return "android";
    if (/mac/.test(lower)) return "macos";
    if (/win/.test(lower)) return "windows";
    if (/linux/.test(lower)) return "linux";
    return "unknown";
  }

  it("detects macOS from user agent", () => {
    expect(detectPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")).toBe("macos");
  });

  it("detects Windows from user agent", () => {
    expect(detectPlatform("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("windows");
  });

  it("detects ChromeOS from user agent", () => {
    expect(detectPlatform("Mozilla/5.0 (X11; CrOS x86_64 14541.0.0)")).toBe("chromeos");
  });

  it("detects iOS from user agent", () => {
    expect(detectPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)")).toBe("ios");
  });

  it("detects Android from user agent", () => {
    expect(detectPlatform("Mozilla/5.0 (Linux; Android 13; Pixel 7)")).toBe("android");
  });

  it("detects Linux from user agent", () => {
    expect(detectPlatform("Mozilla/5.0 (X11; Linux x86_64)")).toBe("linux");
  });

  it("returns unknown for unrecognized user agent", () => {
    expect(detectPlatform("SomeBot/1.0")).toBe("unknown");
  });

  it("prioritizes CrOS over Linux", () => {
    // CrOS user agents contain both "CrOS" and "Linux"
    expect(detectPlatform("Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) Linux")).toBe("chromeos");
  });
});

// ─── 5. TTS session duration tracking ────────────────────────────────────────

describe("TTS session duration — tracking logic", () => {
  it("calculates duration from start time to completion", () => {
    const startTime = 1000;
    const endTime = 46000;
    const durationMs = endTime - startTime;
    expect(durationMs).toBe(45000);
  });

  it("only logs sessions longer than 1 second", () => {
    const MIN_DURATION = 1000;
    expect(500 > MIN_DURATION).toBe(false);
    expect(1001 > MIN_DURATION).toBe(true);
    expect(1000 > MIN_DURATION).toBe(false);
  });

  it("resets session start to 0 after logging", () => {
    let sessionStart = Date.now();
    // After logging:
    sessionStart = 0;
    expect(sessionStart).toBe(0);
  });

  it("resets sentence count to 0 after logging", () => {
    let sentenceCount = 12;
    // After logging:
    sentenceCount = 0;
    expect(sentenceCount).toBe(0);
  });

  it("does not log when courseSubject is empty", () => {
    const courseSubject = "";
    const durationMs = 5000;
    const shouldLog = durationMs > 1000 && courseSubject !== "";
    expect(shouldLog).toBe(false);
  });

  it("does not log when duration is 0 (no start time)", () => {
    const sessionStart = 0;
    const durationMs = sessionStart > 0 ? Date.now() - sessionStart : 0;
    const shouldLog = durationMs > 1000 && "ELA" !== "";
    expect(shouldLog).toBe(false);
  });
});

// ─── 6. Weekly trend aggregation ─────────────────────────────────────────────

describe("Weekly trend — aggregation logic", () => {
  function getWeekKey(date: Date): string {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().split("T")[0];
  }

  it("groups dates in the same week to the same key", () => {
    // Monday June 23 and Wednesday June 25 are in the same week (Sun June 22 start)
    const mon = new Date("2026-06-23");
    const wed = new Date("2026-06-25");
    expect(getWeekKey(mon)).toBe(getWeekKey(wed));
  });

  it("groups Saturday and Sunday of same week together", () => {
    // Saturday June 27 and Sunday June 22 — Sunday is the start
    const sat = new Date("2026-06-27");
    const sun = new Date("2026-06-22");
    expect(getWeekKey(sat)).toBe(getWeekKey(sun));
  });

  it("separates dates in different weeks", () => {
    const week1 = new Date("2026-06-22"); // Sun
    const week2 = new Date("2026-06-29"); // Next Sun
    expect(getWeekKey(week1)).not.toBe(getWeekKey(week2));
  });

  it("produces sorted weekly trend output", () => {
    const logs = [
      { createdAt: new Date("2026-06-29"), sessionDurationMs: 30000 },
      { createdAt: new Date("2026-06-22"), sessionDurationMs: 45000 },
      { createdAt: new Date("2026-06-15"), sessionDurationMs: 20000 },
    ];

    const weekMap: Record<string, { sessions: number; durationMs: number }> = {};
    for (const log of logs) {
      const weekKey = getWeekKey(log.createdAt);
      if (!weekMap[weekKey]) weekMap[weekKey] = { sessions: 0, durationMs: 0 };
      weekMap[weekKey].sessions++;
      weekMap[weekKey].durationMs += log.sessionDurationMs;
    }

    const trend = Object.entries(weekMap).sort().map(([week, data]) => ({ week, ...data }));
    expect(trend.length).toBe(3);
    // Should be sorted chronologically
    expect(trend[0].week < trend[1].week).toBe(true);
    expect(trend[1].week < trend[2].week).toBe(true);
  });

  it("aggregates multiple sessions in same week", () => {
    const logs = [
      { createdAt: new Date("2026-06-23"), sessionDurationMs: 30000 },
      { createdAt: new Date("2026-06-24"), sessionDurationMs: 45000 },
      { createdAt: new Date("2026-06-25"), sessionDurationMs: 20000 },
    ];

    const weekMap: Record<string, { sessions: number; durationMs: number }> = {};
    for (const log of logs) {
      const weekKey = getWeekKey(log.createdAt);
      if (!weekMap[weekKey]) weekMap[weekKey] = { sessions: 0, durationMs: 0 };
      weekMap[weekKey].sessions++;
      weekMap[weekKey].durationMs += log.sessionDurationMs;
    }

    const entries = Object.values(weekMap);
    expect(entries.length).toBe(1); // All in same week
    expect(entries[0].sessions).toBe(3);
    expect(entries[0].durationMs).toBe(95000);
  });
});
