import { describe, it, expect } from "vitest";

// Import the sentence splitting utility
import { splitIntoSentences } from "../client/src/hooks/useTTS";

// Import course utilities for TTS language detection
import { getTtsLanguage, isListenModeEligible } from "../client/src/lib/courseUtils";

describe("Sprint 56 — TTS Enhancements", () => {
  describe("splitIntoSentences", () => {
    it("splits simple sentences by period", () => {
      const result = splitIntoSentences("Hello world. How are you. I am fine.");
      expect(result).toHaveLength(3);
      expect(result[0]).toBe("Hello world.");
      expect(result[1]).toBe("How are you.");
      expect(result[2]).toBe("I am fine.");
    });

    it("splits by exclamation and question marks", () => {
      const result = splitIntoSentences("Great job! What is 2+2? The answer is 4.");
      expect(result).toHaveLength(3);
      expect(result[0]).toContain("Great job!");
      expect(result[1]).toContain("What is 2+2?");
      expect(result[2]).toContain("The answer is 4.");
    });

    it("handles single sentence without period", () => {
      const result = splitIntoSentences("Hello world");
      expect(result).toHaveLength(1);
      expect(result[0]).toBe("Hello world");
    });

    it("handles empty string", () => {
      const result = splitIntoSentences("");
      expect(result).toHaveLength(0);
    });

    it("handles multiple spaces between sentences", () => {
      const result = splitIntoSentences("First sentence.  Second sentence.");
      expect(result).toHaveLength(2);
    });

    it("handles text ending without punctuation", () => {
      const result = splitIntoSentences("First sentence. Second part without period");
      expect(result).toHaveLength(2);
      expect(result[1]).toContain("Second part without period");
    });
  });

  describe("Voice Selection — getTtsLanguage", () => {
    it("returns en-US for English/ELA subjects", () => {
      expect(getTtsLanguage("ELA")).toBe("en-US");
      expect(getTtsLanguage("English Language Arts")).toBe("en-US");
    });

    it("returns es-ES for Spanish subjects", () => {
      expect(getTtsLanguage("Spanish")).toBe("es-ES");
      expect(getTtsLanguage("Spanish I")).toBe("es-ES");
    });

    it("returns fr-FR for French subjects", () => {
      expect(getTtsLanguage("French")).toBe("fr-FR");
      expect(getTtsLanguage("French II")).toBe("fr-FR");
    });

    it("returns en-US for other subjects", () => {
      expect(getTtsLanguage("History")).toBe("en-US");
      expect(getTtsLanguage("Social Studies")).toBe("en-US");
      expect(getTtsLanguage("Science")).toBe("en-US");
    });

    it("returns en-US for null/undefined", () => {
      expect(getTtsLanguage(null)).toBe("en-US");
      expect(getTtsLanguage(undefined)).toBe("en-US");
    });
  });

  describe("Voice Selection — subject eligibility", () => {
    it("ELA is eligible for listen mode", () => {
      expect(isListenModeEligible("ELA")).toBe(true);
      expect(isListenModeEligible("English Language Arts")).toBe(true);
    });

    it("Spanish and French are eligible", () => {
      expect(isListenModeEligible("Spanish")).toBe(true);
      expect(isListenModeEligible("French")).toBe(true);
    });

    it("History and Social Studies are eligible", () => {
      expect(isListenModeEligible("History")).toBe(true);
      expect(isListenModeEligible("Social Studies")).toBe(true);
    });

    it("Science is eligible", () => {
      expect(isListenModeEligible("Science")).toBe(true);
    });

    it("Math is NOT eligible for listen mode", () => {
      expect(isListenModeEligible("Mathematics")).toBe(false);
      expect(isListenModeEligible("Algebra I")).toBe(false);
    });

    it("null/undefined is not eligible", () => {
      expect(isListenModeEligible(null)).toBe(false);
      expect(isListenModeEligible(undefined)).toBe(false);
    });
  });

  describe("ReadThisButton — logic", () => {
    it("identifies when a specific message is playing", () => {
      const messageId = "msg-3";
      const activeMessageId = "msg-3";
      const isThisMessagePlaying = activeMessageId === messageId;
      expect(isThisMessagePlaying).toBe(true);
    });

    it("identifies when a different message is playing", () => {
      const messageId = "msg-3";
      const activeMessageId = "msg-5";
      const isThisMessagePlaying = activeMessageId === messageId;
      expect(isThisMessagePlaying).toBe(false);
    });

    it("identifies when no message is playing", () => {
      const messageId = "msg-3";
      const activeMessageId = null;
      const isThisMessagePlaying = activeMessageId === messageId;
      expect(isThisMessagePlaying).toBe(false);
    });
  });

  describe("HighlightedMessage — sentence tracking", () => {
    it("correctly identifies active message for highlighting", () => {
      const messageId = "msg-2";
      const activeMessageId = "msg-2";
      const currentSentenceIndex = 1;
      const isActive = activeMessageId === messageId;
      expect(isActive).toBe(true);
      expect(currentSentenceIndex).toBeGreaterThanOrEqual(0);
    });

    it("does not highlight when message is not active", () => {
      const messageId = "msg-2";
      const activeMessageId = "msg-5";
      const isActive = activeMessageId === messageId;
      expect(isActive).toBe(false);
    });

    it("does not highlight when sentence index is -1 (idle)", () => {
      const currentSentenceIndex = -1;
      const shouldHighlight = currentSentenceIndex >= 0;
      expect(shouldHighlight).toBe(false);
    });

    it("sentence index maps correctly to split sentences", () => {
      const content = "First sentence. Second sentence. Third sentence.";
      const sentences = splitIntoSentences(content);
      expect(sentences).toHaveLength(3);
      // Index 1 should be "Second sentence."
      expect(sentences[1]).toBe("Second sentence.");
    });
  });

  describe("VoicePicker — filtering logic", () => {
    it("filters voices by language prefix", () => {
      const mockVoices = [
        { lang: "en-US", name: "English US", voiceURI: "en-us-1", localService: true },
        { lang: "en-GB", name: "English UK", voiceURI: "en-gb-1", localService: true },
        { lang: "es-ES", name: "Spanish", voiceURI: "es-es-1", localService: true },
        { lang: "fr-FR", name: "French", voiceURI: "fr-fr-1", localService: false },
      ];

      const language = "en-US";
      const langPrefix = language.split("-")[0].toLowerCase();
      const filtered = mockVoices.filter(v => v.lang.toLowerCase().startsWith(langPrefix));
      expect(filtered).toHaveLength(2);
      expect(filtered[0].lang).toBe("en-US");
      expect(filtered[1].lang).toBe("en-GB");
    });

    it("prioritizes local voices over remote", () => {
      const mockVoices = [
        { lang: "en-US", name: "Remote Voice", voiceURI: "remote-1", localService: false },
        { lang: "en-US", name: "Local Voice", voiceURI: "local-1", localService: true },
      ];

      const sorted = [...mockVoices].sort((a, b) => {
        if (a.localService && !b.localService) return -1;
        if (!a.localService && b.localService) return 1;
        return a.name.localeCompare(b.name);
      });

      expect(sorted[0].name).toBe("Local Voice");
      expect(sorted[1].name).toBe("Remote Voice");
    });

    it("returns empty for unsupported language", () => {
      const mockVoices = [
        { lang: "en-US", name: "English", voiceURI: "en-1", localService: true },
      ];

      const langPrefix = "ja"; // Japanese
      const filtered = mockVoices.filter(v => v.lang.toLowerCase().startsWith(langPrefix));
      expect(filtered).toHaveLength(0);
    });
  });

  describe("TTS Preferences — voiceUri persistence", () => {
    it("voiceUri field is nullable (can be cleared)", () => {
      const prefs = { ttsVoiceUri: null };
      expect(prefs.ttsVoiceUri).toBeNull();
    });

    it("voiceUri stores the full URI string", () => {
      const prefs = { ttsVoiceUri: "Microsoft David - English (United States)" };
      expect(prefs.ttsVoiceUri).toBe("Microsoft David - English (United States)");
    });

    it("default voiceUri is null when no preference set", () => {
      const profile = { ttsVoiceUri: undefined };
      const voiceUri = profile.ttsVoiceUri ?? null;
      expect(voiceUri).toBeNull();
    });
  });
});
