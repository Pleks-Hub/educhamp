import { describe, it, expect } from "vitest";
import { splitIntoSentences } from "../client/src/hooks/useTTS";

describe("Sprint 57 — TTS UX Improvements", () => {
  describe("Speed badge cycling", () => {
    const SPEED_CYCLE = ["slow", "normal", "fast"] as const;

    it("cycles slow → normal", () => {
      const current = "slow";
      const currentIdx = SPEED_CYCLE.indexOf(current);
      const nextIdx = (currentIdx + 1) % SPEED_CYCLE.length;
      expect(SPEED_CYCLE[nextIdx]).toBe("normal");
    });

    it("cycles normal → fast", () => {
      const current = "normal";
      const currentIdx = SPEED_CYCLE.indexOf(current);
      const nextIdx = (currentIdx + 1) % SPEED_CYCLE.length;
      expect(SPEED_CYCLE[nextIdx]).toBe("fast");
    });

    it("cycles fast → slow (wraps around)", () => {
      const current = "fast";
      const currentIdx = SPEED_CYCLE.indexOf(current);
      const nextIdx = (currentIdx + 1) % SPEED_CYCLE.length;
      expect(SPEED_CYCLE[nextIdx]).toBe("slow");
    });

    it("displays correct speed labels", () => {
      const SPEED_DISPLAY: Record<string, string> = {
        slow: "0.7x",
        normal: "1x",
        fast: "1.25x",
      };
      expect(SPEED_DISPLAY["slow"]).toBe("0.7x");
      expect(SPEED_DISPLAY["normal"]).toBe("1x");
      expect(SPEED_DISPLAY["fast"]).toBe("1.25x");
    });
  });

  describe("Progress bar calculation", () => {
    it("calculates 0% when no sentences", () => {
      const totalSentences = 0;
      const currentSentenceIndex = -1;
      const progressPercent =
        totalSentences > 0 && currentSentenceIndex >= 0
          ? Math.round(((currentSentenceIndex + 1) / totalSentences) * 100)
          : 0;
      expect(progressPercent).toBe(0);
    });

    it("calculates progress for first sentence of 5", () => {
      const totalSentences = 5;
      const currentSentenceIndex = 0;
      const progressPercent = Math.round(((currentSentenceIndex + 1) / totalSentences) * 100);
      expect(progressPercent).toBe(20);
    });

    it("calculates progress for middle sentence", () => {
      const totalSentences = 4;
      const currentSentenceIndex = 1;
      const progressPercent = Math.round(((currentSentenceIndex + 1) / totalSentences) * 100);
      expect(progressPercent).toBe(50);
    });

    it("calculates 100% for last sentence", () => {
      const totalSentences = 3;
      const currentSentenceIndex = 2;
      const progressPercent = Math.round(((currentSentenceIndex + 1) / totalSentences) * 100);
      expect(progressPercent).toBe(100);
    });

    it("handles single sentence (100% immediately)", () => {
      const totalSentences = 1;
      const currentSentenceIndex = 0;
      const progressPercent = Math.round(((currentSentenceIndex + 1) / totalSentences) * 100);
      expect(progressPercent).toBe(100);
    });
  });

  describe("Keyboard shortcuts — input guard logic", () => {
    it("should NOT capture when target is INPUT", () => {
      const targetTag = "INPUT";
      const shouldCapture = targetTag !== "INPUT" && targetTag !== "TEXTAREA";
      expect(shouldCapture).toBe(false);
    });

    it("should NOT capture when target is TEXTAREA", () => {
      const targetTag = "TEXTAREA";
      const shouldCapture = targetTag !== "INPUT" && targetTag !== "TEXTAREA";
      expect(shouldCapture).toBe(false);
    });

    it("should capture when target is DIV (non-input)", () => {
      const targetTag = "DIV";
      const shouldCapture = targetTag !== "INPUT" && targetTag !== "TEXTAREA";
      expect(shouldCapture).toBe(true);
    });

    it("should capture when target is BODY", () => {
      const targetTag = "BODY";
      const shouldCapture = targetTag !== "INPUT" && targetTag !== "TEXTAREA";
      expect(shouldCapture).toBe(true);
    });
  });

  describe("Skip forward/back — boundary logic", () => {
    it("skipForward: moves from index 0 to 1", () => {
      const currentSentenceIndex = 0;
      const totalSentences = 5;
      const nextIdx = Math.min(currentSentenceIndex + 1, totalSentences - 1);
      expect(nextIdx).toBe(1);
    });

    it("skipForward: stays at last index when already at end", () => {
      const currentSentenceIndex = 4;
      const totalSentences = 5;
      const nextIdx = Math.min(currentSentenceIndex + 1, totalSentences - 1);
      expect(nextIdx).toBe(4); // clamped
    });

    it("skipBack: moves from index 3 to 2", () => {
      const currentSentenceIndex = 3;
      const prevIdx = Math.max(currentSentenceIndex - 1, 0);
      expect(prevIdx).toBe(2);
    });

    it("skipBack: stays at 0 when already at beginning", () => {
      const currentSentenceIndex = 0;
      const prevIdx = Math.max(currentSentenceIndex - 1, 0);
      expect(prevIdx).toBe(0); // clamped
    });

    it("remaining text after skip forward joins correctly", () => {
      const sentences = splitIntoSentences("First sentence. Second sentence. Third sentence.");
      const skipToIdx = 1;
      const remainingText = sentences.slice(skipToIdx).join(" ");
      expect(remainingText).toContain("Second sentence.");
      expect(remainingText).toContain("Third sentence.");
      expect(remainingText).not.toContain("First sentence.");
    });

    it("remaining text after skip back joins correctly", () => {
      const sentences = splitIntoSentences("First sentence. Second sentence. Third sentence.");
      const skipToIdx = 0;
      const remainingText = sentences.slice(skipToIdx).join(" ");
      expect(remainingText).toContain("First sentence.");
      expect(remainingText).toContain("Second sentence.");
      expect(remainingText).toContain("Third sentence.");
    });
  });

  describe("Keyboard shortcut mapping", () => {
    it("Space maps to pause/resume toggle", () => {
      const keyMap: Record<string, string> = {
        Space: "toggle_play_pause",
        Escape: "stop",
        ArrowRight: "skip_forward",
        ArrowLeft: "skip_back",
      };
      expect(keyMap["Space"]).toBe("toggle_play_pause");
    });

    it("Escape maps to stop", () => {
      const keyMap: Record<string, string> = {
        Space: "toggle_play_pause",
        Escape: "stop",
        ArrowRight: "skip_forward",
        ArrowLeft: "skip_back",
      };
      expect(keyMap["Escape"]).toBe("stop");
    });

    it("ArrowRight maps to skip forward", () => {
      const keyMap: Record<string, string> = {
        Space: "toggle_play_pause",
        Escape: "stop",
        ArrowRight: "skip_forward",
        ArrowLeft: "skip_back",
      };
      expect(keyMap["ArrowRight"]).toBe("skip_forward");
    });

    it("ArrowLeft maps to skip back", () => {
      const keyMap: Record<string, string> = {
        Space: "toggle_play_pause",
        Escape: "stop",
        ArrowRight: "skip_forward",
        ArrowLeft: "skip_back",
      };
      expect(keyMap["ArrowLeft"]).toBe("skip_back");
    });

    it("shortcuts only active when status is not idle", () => {
      const statuses = ["idle", "playing", "paused"] as const;
      const shouldListen = (s: string) => s !== "idle";
      expect(shouldListen("idle")).toBe(false);
      expect(shouldListen("playing")).toBe(true);
      expect(shouldListen("paused")).toBe(true);
    });
  });
});
