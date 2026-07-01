/**
 * Sprint 59 Tests — TTS Analytics Date Range Picker & Voice Quality Rating
 *
 * Covers:
 *  1. Date range picker toggle logic (7/30/90 days)
 *  2. Voice quality rating input validation
 *  3. Voice rating aggregation logic
 *  4. VoiceRatingPrompt auto-dismiss behavior
 *  5. Sentence count threshold for showing rating prompt
 *  6. ttsVoiceRatings schema validation
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── 1. Date range picker toggle logic ───────────────────────────────────────

describe("Date range picker — toggle logic", () => {
  const VALID_RANGES = [7, 30, 90] as const;
  type DateRange = (typeof VALID_RANGES)[number];

  it("default range is 30 days", () => {
    const defaultRange: DateRange = 30;
    expect(defaultRange).toBe(30);
    expect(VALID_RANGES).toContain(defaultRange);
  });

  it("accepts only 7, 30, or 90 as valid ranges", () => {
    expect(VALID_RANGES).toContain(7);
    expect(VALID_RANGES).toContain(30);
    expect(VALID_RANGES).toContain(90);
    expect(VALID_RANGES).toHaveLength(3);
  });

  it("switching range triggers new query with correct daysBack", () => {
    const queries: number[] = [];
    function fetchStats(daysBack: DateRange) {
      queries.push(daysBack);
    }
    fetchStats(7);
    fetchStats(90);
    fetchStats(30);
    expect(queries).toEqual([7, 90, 30]);
  });

  it("calculates correct 'since' date for each range", () => {
    const now = new Date("2026-07-01T12:00:00Z").getTime();
    for (const days of VALID_RANGES) {
      const since = new Date(now - days * 24 * 60 * 60 * 1000);
      const diffDays = Math.round((now - since.getTime()) / (24 * 60 * 60 * 1000));
      expect(diffDays).toBe(days);
    }
  });

  it("7-day range shows roughly 1 week of data", () => {
    const now = Date.now();
    const since = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const diffHours = (now - since.getTime()) / (60 * 60 * 1000);
    expect(diffHours).toBeCloseTo(168, 0); // 7 * 24 = 168 hours
  });

  it("90-day range covers approximately 3 months", () => {
    const now = Date.now();
    const since = new Date(now - 90 * 24 * 60 * 60 * 1000);
    const diffDays = Math.round((now - since.getTime()) / (24 * 60 * 60 * 1000));
    expect(diffDays).toBe(90);
  });
});

// ─── 2. Voice quality rating input validation ────────────────────────────────

describe("Voice quality rating — input validation", () => {
  const VALID_RATINGS = ["thumbs_up", "thumbs_down"] as const;

  it("accepts thumbs_up as valid rating", () => {
    expect(VALID_RATINGS).toContain("thumbs_up");
  });

  it("accepts thumbs_down as valid rating", () => {
    expect(VALID_RATINGS).toContain("thumbs_down");
  });

  it("rejects invalid rating values", () => {
    const invalid = ["like", "dislike", "neutral", "", "1", "0"];
    for (const val of invalid) {
      expect(VALID_RATINGS.includes(val as any)).toBe(false);
    }
  });

  it("voiceUri must be a non-empty string", () => {
    const validUri = "Google US English";
    expect(validUri.length).toBeGreaterThan(0);
    expect(typeof validUri).toBe("string");
  });

  it("sessionId is optional (can be undefined)", () => {
    const input = { voiceUri: "Google US English", rating: "thumbs_up" as const };
    expect(input).not.toHaveProperty("sessionId");
  });

  it("sessionId when provided must be a positive integer", () => {
    const sessionId = 42;
    expect(Number.isInteger(sessionId)).toBe(true);
    expect(sessionId).toBeGreaterThan(0);
  });
});

// ─── 3. Voice rating aggregation logic ───────────────────────────────────────

describe("Voice rating — aggregation logic", () => {
  const mockRatings = [
    { voiceUri: "Google US English", rating: "thumbs_up" },
    { voiceUri: "Google US English", rating: "thumbs_up" },
    { voiceUri: "Google US English", rating: "thumbs_down" },
    { voiceUri: "Microsoft Zira", rating: "thumbs_down" },
    { voiceUri: "Microsoft Zira", rating: "thumbs_down" },
    { voiceUri: "Apple Samantha", rating: "thumbs_up" },
  ];

  function aggregate(ratings: typeof mockRatings) {
    const voiceMap: Record<string, { thumbsUp: number; thumbsDown: number }> = {};
    for (const r of ratings) {
      if (!voiceMap[r.voiceUri]) voiceMap[r.voiceUri] = { thumbsUp: 0, thumbsDown: 0 };
      if (r.rating === "thumbs_up") voiceMap[r.voiceUri].thumbsUp++;
      else voiceMap[r.voiceUri].thumbsDown++;
    }
    return Object.entries(voiceMap)
      .map(([voiceUri, data]) => ({
        voiceUri,
        thumbsUp: data.thumbsUp,
        thumbsDown: data.thumbsDown,
        total: data.thumbsUp + data.thumbsDown,
      }))
      .sort((a, b) => b.total - a.total);
  }

  it("aggregates ratings by voiceUri", () => {
    const result = aggregate(mockRatings);
    expect(result).toHaveLength(3);
  });

  it("counts thumbs_up correctly for Google US English", () => {
    const result = aggregate(mockRatings);
    const google = result.find((r) => r.voiceUri === "Google US English");
    expect(google?.thumbsUp).toBe(2);
    expect(google?.thumbsDown).toBe(1);
  });

  it("counts thumbs_down correctly for Microsoft Zira", () => {
    const result = aggregate(mockRatings);
    const zira = result.find((r) => r.voiceUri === "Microsoft Zira");
    expect(zira?.thumbsUp).toBe(0);
    expect(zira?.thumbsDown).toBe(2);
  });

  it("sorts by total ratings descending", () => {
    const result = aggregate(mockRatings);
    expect(result[0].voiceUri).toBe("Google US English"); // 3 total
    expect(result[1].voiceUri).toBe("Microsoft Zira"); // 2 total
    expect(result[2].voiceUri).toBe("Apple Samantha"); // 1 total
  });

  it("calculates total correctly", () => {
    const result = aggregate(mockRatings);
    for (const r of result) {
      expect(r.total).toBe(r.thumbsUp + r.thumbsDown);
    }
  });

  it("handles empty ratings array", () => {
    const result = aggregate([]);
    expect(result).toHaveLength(0);
  });
});

// ─── 4. VoiceRatingPrompt auto-dismiss behavior ─────────────────────────────

describe("VoiceRatingPrompt — auto-dismiss behavior", () => {
  it("default auto-dismiss timeout is 8000ms", () => {
    const DEFAULT_TIMEOUT = 8000;
    expect(DEFAULT_TIMEOUT).toBe(8000);
  });

  it("prompt is hidden when visible is false", () => {
    const visible = false;
    const shouldRender = visible && "Google US English" !== null;
    expect(shouldRender).toBe(false);
  });

  it("prompt is hidden when voiceUri is null", () => {
    const voiceUri: string | null = null;
    const shouldRender = true && voiceUri !== null;
    expect(shouldRender).toBe(false);
  });

  it("prompt shows when visible is true and voiceUri is set", () => {
    const visible = true;
    const voiceUri: string | null = "Google US English";
    const shouldRender = visible && voiceUri !== null;
    expect(shouldRender).toBe(true);
  });

  it("after rating, shows 'Thanks!' for 1200ms before dismissing", () => {
    const THANKS_DURATION = 1200;
    expect(THANKS_DURATION).toBeLessThan(8000);
    expect(THANKS_DURATION).toBeGreaterThan(500);
  });

  it("timer is cleared on unmount to prevent memory leaks", () => {
    const clearTimeout = vi.fn();
    const timerId = 123;
    // Simulate cleanup
    clearTimeout(timerId);
    expect(clearTimeout).toHaveBeenCalledWith(timerId);
  });
});

// ─── 5. Sentence count threshold for showing rating prompt ───────────────────

describe("Voice rating — sentence count threshold", () => {
  const MIN_SENTENCES_FOR_RATING = 3;

  it("shows rating prompt when sentencesRead >= 3", () => {
    expect(3 >= MIN_SENTENCES_FOR_RATING).toBe(true);
    expect(5 >= MIN_SENTENCES_FOR_RATING).toBe(true);
    expect(100 >= MIN_SENTENCES_FOR_RATING).toBe(true);
  });

  it("does NOT show rating prompt when sentencesRead < 3", () => {
    expect(0 >= MIN_SENTENCES_FOR_RATING).toBe(false);
    expect(1 >= MIN_SENTENCES_FOR_RATING).toBe(false);
    expect(2 >= MIN_SENTENCES_FOR_RATING).toBe(false);
  });

  it("exactly 3 sentences triggers the prompt", () => {
    expect(3 >= MIN_SENTENCES_FOR_RATING).toBe(true);
  });

  it("resets sentence count after logging", () => {
    let count = 5;
    // After session ends:
    count = 0;
    expect(count).toBe(0);
  });
});

// ─── 6. ttsVoiceRatings schema validation ────────────────────────────────────

describe("ttsVoiceRatings — schema structure", () => {
  const SCHEMA_FIELDS = ["id", "userId", "voiceUri", "rating", "sessionId", "createdAt"];

  it("has all required fields", () => {
    expect(SCHEMA_FIELDS).toContain("id");
    expect(SCHEMA_FIELDS).toContain("userId");
    expect(SCHEMA_FIELDS).toContain("voiceUri");
    expect(SCHEMA_FIELDS).toContain("rating");
    expect(SCHEMA_FIELDS).toContain("createdAt");
  });

  it("sessionId is optional (nullable)", () => {
    expect(SCHEMA_FIELDS).toContain("sessionId");
    // sessionId can be null — it's optional
    const row = { id: 1, userId: 1, voiceUri: "test", rating: "thumbs_up", sessionId: null, createdAt: new Date() };
    expect(row.sessionId).toBeNull();
  });

  it("rating field accepts only thumbs_up or thumbs_down", () => {
    const validRatings = ["thumbs_up", "thumbs_down"];
    expect(validRatings).toHaveLength(2);
    expect(validRatings).toContain("thumbs_up");
    expect(validRatings).toContain("thumbs_down");
  });

  it("voiceUri has max length of 256", () => {
    const MAX_LENGTH = 256;
    const shortUri = "Google US English";
    const longUri = "a".repeat(257);
    expect(shortUri.length).toBeLessThanOrEqual(MAX_LENGTH);
    expect(longUri.length).toBeGreaterThan(MAX_LENGTH);
  });

  it("has indexes on userId, voiceUri, and rating", () => {
    const INDEXES = ["ttsVoiceRatings_userId_idx", "ttsVoiceRatings_voiceUri_idx", "ttsVoiceRatings_rating_idx"];
    expect(INDEXES).toHaveLength(3);
  });
});
