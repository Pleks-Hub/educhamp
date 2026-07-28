/**
 * Server-side TTS synthesis using Microsoft Edge Neural TTS (edge-tts-universal).
 * Provides high-quality neural voices without requiring any API keys.
 */
import { EdgeTTS, VoicesManager } from "edge-tts-universal";

export interface TtsSynthesizeOptions {
  text: string;
  voice?: string;
  rate?: string; // e.g. "+10%", "-20%", "default"
  pitch?: string; // e.g. "+5Hz", "-2Hz", "default"
  volume?: string; // e.g. "+10%", "-10%", "default"
}

export interface WordBoundary {
  word: string;
  start: number; // milliseconds
  end: number; // milliseconds
}

export interface TtsSynthesizeResult {
  audio: Buffer;
  wordBoundaries: WordBoundary[];
  contentType: string;
}

/** Default voice for English content */
export const DEFAULT_VOICE = "en-US-EmmaMultilingualNeural";

/**
 * Curated list of high-quality voices for EduChamp.
 * These are the best-sounding neural voices across supported languages.
 */
export const CURATED_VOICES = [
  // English (US)
  { id: "en-US-EmmaMultilingualNeural", name: "Emma", language: "English (US)", gender: "Female", description: "Clear, friendly — great for tutoring" },
  { id: "en-US-JennyNeural", name: "Jenny", language: "English (US)", gender: "Female", description: "Warm, conversational" },
  { id: "en-US-AriaNeural", name: "Aria", language: "English (US)", gender: "Female", description: "Expressive, engaging" },
  { id: "en-US-GuyNeural", name: "Guy", language: "English (US)", gender: "Male", description: "Friendly, natural" },
  { id: "en-US-AndrewMultilingualNeural", name: "Andrew", language: "English (US)", gender: "Male", description: "Clear, professional" },
  { id: "en-US-BrianMultilingualNeural", name: "Brian", language: "English (US)", gender: "Male", description: "Calm, steady" },
  // English (UK)
  { id: "en-GB-SoniaNeural", name: "Sonia", language: "English (UK)", gender: "Female", description: "British, polished" },
  { id: "en-GB-RyanNeural", name: "Ryan", language: "English (UK)", gender: "Male", description: "British, friendly" },
  // Spanish
  { id: "es-MX-DaliaNeural", name: "Dalia", language: "Spanish (Mexico)", gender: "Female", description: "Clear, natural" },
  { id: "es-MX-JorgeNeural", name: "Jorge", language: "Spanish (Mexico)", gender: "Male", description: "Friendly, conversational" },
  { id: "es-ES-ElviraNeural", name: "Elvira", language: "Spanish (Spain)", gender: "Female", description: "Expressive, warm" },
  // French
  { id: "fr-FR-DeniseNeural", name: "Denise", language: "French", gender: "Female", description: "Natural, clear" },
  { id: "fr-FR-HenriNeural", name: "Henri", language: "French", gender: "Male", description: "Warm, engaging" },
  // German
  { id: "de-DE-KatjaNeural", name: "Katja", language: "German", gender: "Female", description: "Clear, professional" },
  { id: "de-DE-ConradNeural", name: "Conrad", language: "German", gender: "Male", description: "Friendly, natural" },
  // Portuguese
  { id: "pt-BR-FranciscaNeural", name: "Francisca", language: "Portuguese (Brazil)", gender: "Female", description: "Warm, expressive" },
  { id: "pt-BR-AntonioNeural", name: "Antonio", language: "Portuguese (Brazil)", gender: "Male", description: "Clear, steady" },
  // Chinese
  { id: "zh-CN-XiaoxiaoNeural", name: "Xiaoxiao", language: "Chinese (Mandarin)", gender: "Female", description: "Natural, friendly" },
  { id: "zh-CN-YunxiNeural", name: "Yunxi", language: "Chinese (Mandarin)", gender: "Male", description: "Clear, professional" },
  // Japanese
  { id: "ja-JP-NanamiNeural", name: "Nanami", language: "Japanese", gender: "Female", description: "Natural, polite" },
  // Korean
  { id: "ko-KR-SunHiNeural", name: "Sun-Hi", language: "Korean", gender: "Female", description: "Clear, friendly" },
  // Arabic
  { id: "ar-SA-ZariyahNeural", name: "Zariyah", language: "Arabic", gender: "Female", description: "Clear, natural" },
  // Hindi
  { id: "hi-IN-SwaraNeural", name: "Swara", language: "Hindi", gender: "Female", description: "Warm, expressive" },
];

/**
 * Map speed names to rate percentage strings for Edge TTS.
 */
export function speedToRate(speed: "slow" | "normal" | "fast"): string {
  switch (speed) {
    case "slow": return "-25%";
    case "normal": return "+0%";
    case "fast": return "+30%";
  }
}

/**
 * Synthesize text to speech using Microsoft Edge Neural TTS.
 * Returns MP3 audio buffer and word boundary timestamps.
 */
export async function synthesizeSpeech(options: TtsSynthesizeOptions): Promise<TtsSynthesizeResult> {
  const {
    text,
    voice = DEFAULT_VOICE,
    rate = "+0%",
    pitch = "+0Hz",
    volume = "+0%",
  } = options;

  if (!text || text.trim().length === 0) {
    throw new Error("Text is required for TTS synthesis");
  }

  // Limit text length to prevent abuse (max ~5000 chars per request)
  const truncatedText = text.slice(0, 5000);

  const tts = new EdgeTTS(truncatedText, voice, {
    rate,
    pitch,
    volume,
  });

  const result = await tts.synthesize();

  // Convert audio Blob to Buffer
  const audioArrayBuffer = await result.audio.arrayBuffer();
  const audioBuffer = Buffer.from(audioArrayBuffer);

  // Convert subtitle data to word boundaries
  const wordBoundaries: WordBoundary[] = (result.subtitle || []).map((item: any) => ({
    word: item.text || item.part || "",
    start: item.offset ?? item.start ?? 0,
    end: (item.offset ?? item.start ?? 0) + (item.duration ?? (item.end ? item.end - item.start : 200)),
  }));

  return {
    audio: audioBuffer,
    wordBoundaries,
    contentType: "audio/mpeg",
  };
}

/**
 * Get all available voices from Microsoft Edge TTS service.
 * Cached for performance.
 */
let voicesCache: any[] | null = null;
let voicesCacheTime = 0;
const VOICES_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function getAvailableVoices() {
  const now = Date.now();
  if (voicesCache && now - voicesCacheTime < VOICES_CACHE_TTL) {
    return voicesCache;
  }

  try {
    const manager = await VoicesManager.create();
    const voices = manager.find({});
    voicesCache = voices.map((v: any) => ({
      id: v.ShortName,
      name: v.FriendlyName || v.ShortName,
      locale: v.Locale,
      gender: v.Gender,
      language: v.LocaleName || v.Locale,
    }));
    voicesCacheTime = now;
    return voicesCache;
  } catch (error) {
    console.error("[TTS] Failed to fetch voices:", error);
    // Return curated list as fallback
    return CURATED_VOICES.map(v => ({
      id: v.id,
      name: v.name,
      locale: v.id.split("-").slice(0, 2).join("-"),
      gender: v.gender,
      language: v.language,
    }));
  }
}
