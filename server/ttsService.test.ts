import { describe, it, expect, vi } from "vitest";
import { speedToRate, CURATED_VOICES, DEFAULT_VOICE } from "./ttsService";

describe("ttsService", () => {
  describe("speedToRate", () => {
    it("returns -25% for slow speed", () => {
      expect(speedToRate("slow")).toBe("-25%");
    });

    it("returns +0% for normal speed", () => {
      expect(speedToRate("normal")).toBe("+0%");
    });

    it("returns +30% for fast speed", () => {
      expect(speedToRate("fast")).toBe("+30%");
    });
  });

  describe("CURATED_VOICES", () => {
    it("contains at least 10 voices", () => {
      expect(CURATED_VOICES.length).toBeGreaterThanOrEqual(10);
    });

    it("each voice has required fields", () => {
      for (const voice of CURATED_VOICES) {
        expect(voice.id).toBeTruthy();
        expect(voice.name).toBeTruthy();
        expect(voice.language).toBeTruthy();
        expect(voice.gender).toMatch(/^(Male|Female)$/);
        expect(voice.description).toBeTruthy();
      }
    });

    it("includes English voices", () => {
      const enVoices = CURATED_VOICES.filter(v => v.id.startsWith("en-"));
      expect(enVoices.length).toBeGreaterThanOrEqual(4);
    });

    it("includes Spanish voices", () => {
      const esVoices = CURATED_VOICES.filter(v => v.id.startsWith("es-"));
      expect(esVoices.length).toBeGreaterThanOrEqual(2);
    });

    it("includes French voices", () => {
      const frVoices = CURATED_VOICES.filter(v => v.id.startsWith("fr-"));
      expect(frVoices.length).toBeGreaterThanOrEqual(2);
    });

    it("includes voices for all major languages", () => {
      const langPrefixes = ["en-", "es-", "fr-", "de-", "pt-", "zh-", "ja-", "ko-", "ar-", "hi-"];
      for (const prefix of langPrefixes) {
        const voices = CURATED_VOICES.filter(v => v.id.startsWith(prefix));
        expect(voices.length).toBeGreaterThanOrEqual(1);
      }
    });

    it("voice IDs follow the Edge TTS naming convention", () => {
      for (const voice of CURATED_VOICES) {
        // Pattern: xx-XX-NameNeural or xx-XX-NameMultilingualNeural
        expect(voice.id).toMatch(/^[a-z]{2}-[A-Z]{2}-\w+Neural$/);
      }
    });
  });

  describe("DEFAULT_VOICE", () => {
    it("is a valid voice ID from the curated list", () => {
      const found = CURATED_VOICES.find(v => v.id === DEFAULT_VOICE);
      expect(found).toBeTruthy();
    });

    it("is an English voice", () => {
      expect(DEFAULT_VOICE).toMatch(/^en-/);
    });
  });

  describe("synthesizeSpeech", () => {
    it("throws when text is empty", async () => {
      const { synthesizeSpeech } = await import("./ttsService");
      await expect(synthesizeSpeech({ text: "" })).rejects.toThrow("Text is required");
    });

    it("throws when text is whitespace only", async () => {
      const { synthesizeSpeech } = await import("./ttsService");
      await expect(synthesizeSpeech({ text: "   " })).rejects.toThrow("Text is required");
    });
  });
});
