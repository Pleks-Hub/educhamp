import { useState, useCallback, useRef, useEffect } from "react";
import { stripMarkdownForTts, getTtsLanguage, detectLanguageFromContent } from "@/lib/courseUtils";
import { trpc } from "@/lib/trpc";

// ─── LRU Audio Cache ─────────────────────────────────────────────────────────

interface CachedAudio {
  audioBase64: string;
  contentType: string;
  wordBoundaries: { word: string; start: number; end: number }[];
  accessedAt: number;
}

const MAX_CACHE_SIZE = 20;
const audioCache = new Map<string, CachedAudio>();

/** Generate a cache key from synthesis parameters */
function getCacheKey(text: string, voice: string | null, speed: string, lang: string | null): string {
  return `${text}|${voice || "default"}|${speed}|${lang || "auto"}`;
}

/** Get from cache (updates access time) */
function cacheGet(key: string): CachedAudio | undefined {
  const entry = audioCache.get(key);
  if (entry) {
    entry.accessedAt = Date.now();
  }
  return entry;
}

/** Put into cache (evicts LRU if full) */
function cachePut(key: string, value: Omit<CachedAudio, "accessedAt">): void {
  if (audioCache.size >= MAX_CACHE_SIZE) {
    // Evict least recently accessed entry
    let oldestKey = "";
    let oldestTime = Infinity;
    Array.from(audioCache.entries()).forEach(([k, v]) => {
      if (v.accessedAt < oldestTime) {
        oldestTime = v.accessedAt;
        oldestKey = k;
      }
    });
    if (oldestKey) audioCache.delete(oldestKey);
  }
  audioCache.set(key, { ...value, accessedAt: Date.now() });
}

/** Get current cache size (for testing/debugging) */
export function getAudioCacheSize(): number {
  return audioCache.size;
}

/** Clear the audio cache (for testing) */
export function clearAudioCache(): void {
  audioCache.clear();
}

export type TtsSpeed = "slow" | "normal" | "fast";
export type TtsStatus = "idle" | "playing" | "paused" | "loading";

/** Split text into sentences for highlight-as-you-read */
export function splitIntoSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by whitespace or end of string
  const raw = text.match(/[^.!?]*[.!?]+[\s]?|[^.!?]+$/g);
  if (!raw) return text.trim() ? [text.trim()] : [];
  return raw.map(s => s.trim()).filter(Boolean);
}

/** Returns true if the language is non-English (foreign language learning) */
function isForeignLanguage(lang: string): boolean {
  return !!lang && !lang.startsWith("en");
}

interface UseTTSOptions {
  /** Course subject for language detection */
  subject?: string | null;
  /** Course title for language detection (used when subject is generic like "language") */
  courseTitle?: string | null;
  /** Manual language override (BCP 47 tag, e.g. "es-ES") — takes priority over auto-detection */
  languageOverride?: string | null;
  /** Playback speed */
  speed?: TtsSpeed;
  /** Preferred voice ID (persisted from server) — now an Edge Neural voice ID like "en-US-EmmaMultilingualNeural" */
  voiceUri?: string | null;
  /** Callback when playback completes */
  onComplete?: () => void;
  /** Callback when an error occurs */
  onError?: (error: string) => void;
}

interface UseTTSReturn {
  /** Always true — server-side TTS is always available */
  isSupported: boolean;
  /** Current playback status */
  status: TtsStatus;
  /** Speak the given text */
  speak: (text: string, label?: string, messageId?: string) => void;
  /** Pause current speech */
  pause: () => void;
  /** Resume paused speech */
  resume: () => void;
  /** Stop and cancel speech */
  stop: () => void;
  /** Replay the last spoken text */
  replay: () => void;
  /** Change speed (takes effect on next speak/replay) */
  setSpeed: (speed: TtsSpeed) => void;
  /** Cycle to next speed (for badge click) */
  cycleSpeed: () => TtsSpeed;
  /** Current speed */
  currentSpeed: TtsSpeed;
  /** Label of what's currently being read */
  currentLabel: string;
  /** Available neural voices (from server curated list) */
  voices: { id: string; name: string; language: string; gender: string; description: string }[];
  /** Set preferred voice by ID */
  setVoice: (voiceId: string | null) => void;
  /** Currently selected voice ID */
  selectedVoiceUri: string | null;
  /** Current sentence index being read (for highlight-as-you-read) */
  currentSentenceIndex: number;
  /** All sentences of the current text (for highlight rendering) */
  sentences: string[];
  /** The message ID currently being read (for per-message highlight) */
  activeMessageId: string | null;
  /** Skip to the next sentence */
  skipForward: () => void;
  /** Skip to the previous sentence */
  skipBack: () => void;
  /** Total number of sentences in current text */
  totalSentences: number;
  /** The detected/resolved language code currently in use (e.g. "es-ES", "fr-FR", "en-US") */
  detectedLanguage: string;
  /** Set a manual language override */
  setLanguageOverride: (lang: string | null) => void;
}

export function useTTS(options: UseTTSOptions = {}): UseTTSReturn {
  const { subject, courseTitle, languageOverride: initialLangOverride, speed: initialSpeed = "normal", voiceUri: initialVoiceUri, onComplete, onError } = options;

  const [status, setStatus] = useState<TtsStatus>("idle");
  const [currentSpeed, setCurrentSpeed] = useState<TtsSpeed>(initialSpeed);
  const [langOverride, setLangOverride] = useState<string | null>(initialLangOverride ?? null);
  const [detectedLanguage, setDetectedLanguage] = useState<string>("en-US");
  const [currentLabel, setCurrentLabel] = useState("");
  const [selectedVoiceUri, setSelectedVoiceUri] = useState<string | null>(initialVoiceUri ?? null);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(-1);
  const [sentences, setSentences] = useState<string[]>([]);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);

  const lastTextRef = useRef<string>("");
  const lastLabelRef = useRef<string>("");
  const lastMessageIdRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  const sentencesRef = useRef<string[]>([]);
  const wordBoundariesRef = useRef<{ word: string; start: number; end: number }[]>([]);
  const sentenceTimerRef = useRef<number | null>(null);
  const playFromSentenceRef = useRef<number>(0);

  // Keep refs in sync
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  // Sync voiceUri from server when it changes
  useEffect(() => {
    if (initialVoiceUri !== undefined) {
      setSelectedVoiceUri(initialVoiceUri ?? null);
    }
  }, [initialVoiceUri]);

  // Fetch curated voices from server
  const { data: voicesData } = trpc.tts.listVoices.useQuery(undefined, {
    staleTime: 24 * 60 * 60 * 1000, // cache for 24h
  });
  const voices = voicesData?.voices ?? [];

  // TTS synthesis mutation
  const synthesizeMutation = trpc.tts.synthesize.useMutation();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
      if (sentenceTimerRef.current) {
        cancelAnimationFrame(sentenceTimerRef.current);
      }
    };
  }, []);

  // Pause on tab hidden, resume on visible
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && status === "playing" && audioRef.current) {
        audioRef.current.pause();
        setStatus("paused");
      } else if (!document.hidden && status === "paused" && audioRef.current) {
        audioRef.current.play().catch(() => {});
        setStatus("playing");
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [status]);

  /** Track current sentence based on audio time and word boundaries */
  const startSentenceTracking = useCallback(() => {
    const track = () => {
      if (!audioRef.current || audioRef.current.paused) return;
      const currentTimeMs = audioRef.current.currentTime * 1000;
      const boundaries = wordBoundariesRef.current;
      const sents = sentencesRef.current;
      const offset = playFromSentenceRef.current;

      if (boundaries.length > 0 && sents.length > 0) {
        // Use word boundaries to determine which sentence we're in
        let charAccumulated = 0;
        for (let i = offset; i < sents.length; i++) {
          charAccumulated += sents[i].length + 1;
          // Find the boundary closest to this sentence start
          const sentStart = charAccumulated - sents[i].length - 1;
          const matchingBoundary = boundaries.find(b => b.start >= sentStart * 10); // rough heuristic
          if (matchingBoundary && currentTimeMs < matchingBoundary.start) {
            setCurrentSentenceIndex(Math.max(offset, i - 1));
            break;
          }
          if (i === sents.length - 1) {
            setCurrentSentenceIndex(i);
          }
        }
      } else if (sents.length > 0 && audioRef.current.duration > 0) {
        // Fallback: estimate sentence by time proportion
        const progress = audioRef.current.currentTime / audioRef.current.duration;
        const estimatedIdx = Math.min(
          Math.floor(progress * sents.length) + offset,
          sents.length - 1
        );
        setCurrentSentenceIndex(estimatedIdx);
      }

      sentenceTimerRef.current = requestAnimationFrame(track);
    };
    sentenceTimerRef.current = requestAnimationFrame(track);
  }, []);

  const stopSentenceTracking = useCallback(() => {
    if (sentenceTimerRef.current) {
      cancelAnimationFrame(sentenceTimerRef.current);
      sentenceTimerRef.current = null;
    }
  }, []);

  /** Core speak function: synthesize on server, play audio locally */
  const speak = useCallback((text: string, label?: string, messageId?: string) => {
    // Stop any current playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    stopSentenceTracking();

    const cleanText = stripMarkdownForTts(text);
    if (!cleanText.trim()) return;

    lastTextRef.current = cleanText;
    lastLabelRef.current = label || "Content";
    lastMessageIdRef.current = messageId || null;
    setCurrentLabel(label || "Content");
    setActiveMessageId(messageId || null);

    // Split into sentences for highlight tracking
    const sents = splitIntoSentences(cleanText);
    sentencesRef.current = sents;
    setSentences(sents);
    setCurrentSentenceIndex(0);
    playFromSentenceRef.current = 0;

    // Determine language
    const subjectLang = getTtsLanguage(subject, courseTitle);
    const autoLang = subjectLang === "en-US" ? detectLanguageFromContent(cleanText) : null;
    const resolvedLang = langOverride || autoLang || subjectLang;
    setDetectedLanguage(resolvedLang);

    // Show loading state
    setStatus("loading");

    // Check cache first
    const cacheKey = getCacheKey(cleanText, selectedVoiceUri, currentSpeed, isForeignLanguage(resolvedLang) ? resolvedLang : null);
    const cached = cacheGet(cacheKey);

    if (cached) {
      // Cache hit — play directly without server round-trip
      const audioBlob = base64ToBlob(cached.audioBase64, cached.contentType);
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      wordBoundariesRef.current = cached.wordBoundaries || [];

      audio.onplay = () => { setStatus("playing"); startSentenceTracking(); };
      audio.onpause = () => { if (audio.currentTime < audio.duration) { setStatus("paused"); stopSentenceTracking(); } };
      audio.onended = () => {
        setStatus("idle"); setCurrentLabel(""); setCurrentSentenceIndex(-1);
        setSentences([]); setActiveMessageId(null); stopSentenceTracking();
        URL.revokeObjectURL(audioUrl); onCompleteRef.current?.();
      };
      audio.onerror = () => {
        setStatus("idle"); setCurrentLabel(""); setCurrentSentenceIndex(-1);
        setSentences([]); setActiveMessageId(null); stopSentenceTracking();
        URL.revokeObjectURL(audioUrl); onErrorRef.current?.("Audio playback error");
      };

      audio.play().catch((err) => {
        setStatus("idle");
        onErrorRef.current?.(`Playback failed: ${err.message}`);
      });
      return;
    }

    // Cache miss — call server-side synthesis
    synthesizeMutation.mutate(
      {
        text: cleanText,
        voice: selectedVoiceUri || undefined,
        speed: currentSpeed,
        languageOverride: isForeignLanguage(resolvedLang) ? resolvedLang : null,
      },
      {
        onSuccess: (data) => {
          // Store in cache for future replays
          cachePut(cacheKey, {
            audioBase64: data.audioBase64,
            contentType: data.contentType,
            wordBoundaries: data.wordBoundaries || [],
          });

          // Create audio from base64
          const audioBlob = base64ToBlob(data.audioBase64, data.contentType);
          const audioUrl = URL.createObjectURL(audioBlob);

          const audio = new Audio(audioUrl);
          audioRef.current = audio;
          wordBoundariesRef.current = data.wordBoundaries || [];

          audio.onplay = () => {
            setStatus("playing");
            startSentenceTracking();
          };

          audio.onpause = () => {
            if (audio.currentTime < audio.duration) {
              setStatus("paused");
              stopSentenceTracking();
            }
          };

          audio.onended = () => {
            setStatus("idle");
            setCurrentLabel("");
            setCurrentSentenceIndex(-1);
            setSentences([]);
            setActiveMessageId(null);
            stopSentenceTracking();
            URL.revokeObjectURL(audioUrl);
            onCompleteRef.current?.();
          };

          audio.onerror = () => {
            setStatus("idle");
            setCurrentLabel("");
            setCurrentSentenceIndex(-1);
            setSentences([]);
            setActiveMessageId(null);
            stopSentenceTracking();
            URL.revokeObjectURL(audioUrl);
            onErrorRef.current?.("Audio playback error");
          };

          audio.play().catch((err) => {
            setStatus("idle");
            onErrorRef.current?.(`Playback failed: ${err.message}`);
          });
        },
        onError: (error) => {
          setStatus("idle");
          setCurrentLabel("");
          setCurrentSentenceIndex(-1);
          setSentences([]);
          setActiveMessageId(null);
          onErrorRef.current?.(error.message || "Failed to synthesize speech");
        },
      }
    );
  }, [subject, courseTitle, currentSpeed, selectedVoiceUri, langOverride, synthesizeMutation, startSentenceTracking, stopSentenceTracking]);

  const pause = useCallback(() => {
    if (audioRef.current && status === "playing") {
      audioRef.current.pause();
    }
  }, [status]);

  const resume = useCallback(() => {
    if (audioRef.current && status === "paused") {
      audioRef.current.play().catch(() => {});
    }
  }, [status]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    stopSentenceTracking();
    setStatus("idle");
    setCurrentLabel("");
    setCurrentSentenceIndex(-1);
    setSentences([]);
    setActiveMessageId(null);
  }, [stopSentenceTracking]);

  const replay = useCallback(() => {
    if (!lastTextRef.current) return;
    speak(lastTextRef.current, lastLabelRef.current, lastMessageIdRef.current || undefined);
  }, [speak]);

  const setSpeed = useCallback((newSpeed: TtsSpeed) => {
    setCurrentSpeed(newSpeed);
  }, []);

  const SPEED_CYCLE: TtsSpeed[] = ["slow", "normal", "fast"];

  const cycleSpeed = useCallback((): TtsSpeed => {
    const currentIdx = SPEED_CYCLE.indexOf(currentSpeed);
    const nextIdx = (currentIdx + 1) % SPEED_CYCLE.length;
    const nextSpeed = SPEED_CYCLE[nextIdx];
    setCurrentSpeed(nextSpeed);
    return nextSpeed;
  }, [currentSpeed]);

  /** Skip forward to the next sentence by re-synthesizing from that point */
  const skipForward = useCallback(() => {
    if (sentencesRef.current.length === 0) return;
    const nextIdx = Math.min(currentSentenceIndex + 1, sentencesRef.current.length - 1);
    if (nextIdx === currentSentenceIndex) return;

    // Stop current audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    stopSentenceTracking();

    // Synthesize from the next sentence onward
    const remainingText = sentencesRef.current.slice(nextIdx).join(" ");
    setCurrentSentenceIndex(nextIdx);
    playFromSentenceRef.current = nextIdx;
    setStatus("loading");

    const resolvedLang = langOverride || getTtsLanguage(subject, courseTitle);

    synthesizeMutation.mutate(
      {
        text: remainingText,
        voice: selectedVoiceUri || undefined,
        speed: currentSpeed,
        languageOverride: isForeignLanguage(resolvedLang) ? resolvedLang : null,
      },
      {
        onSuccess: (data) => {
          const audioBlob = base64ToBlob(data.audioBase64, data.contentType);
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          audioRef.current = audio;
          wordBoundariesRef.current = data.wordBoundaries || [];

          audio.onplay = () => { setStatus("playing"); startSentenceTracking(); };
          audio.onpause = () => { if (audio.currentTime < audio.duration) { setStatus("paused"); stopSentenceTracking(); } };
          audio.onended = () => {
            setStatus("idle"); setCurrentLabel(""); setCurrentSentenceIndex(-1);
            setSentences([]); setActiveMessageId(null); stopSentenceTracking();
            URL.revokeObjectURL(audioUrl); onCompleteRef.current?.();
          };
          audio.onerror = () => {
            setStatus("idle"); stopSentenceTracking(); URL.revokeObjectURL(audioUrl);
            onErrorRef.current?.("Audio playback error");
          };

          audio.play().catch(() => setStatus("idle"));
        },
        onError: () => {
          setStatus("idle");
          onErrorRef.current?.("Failed to skip forward");
        },
      }
    );
  }, [currentSentenceIndex, subject, courseTitle, currentSpeed, selectedVoiceUri, langOverride, synthesizeMutation, startSentenceTracking, stopSentenceTracking]);

  /** Skip back to the previous sentence */
  const skipBack = useCallback(() => {
    if (sentencesRef.current.length === 0) return;
    const prevIdx = Math.max(currentSentenceIndex - 1, 0);

    // Stop current audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    stopSentenceTracking();

    // Synthesize from the previous sentence onward
    const remainingText = sentencesRef.current.slice(prevIdx).join(" ");
    setCurrentSentenceIndex(prevIdx);
    playFromSentenceRef.current = prevIdx;
    setStatus("loading");

    const resolvedLang = langOverride || getTtsLanguage(subject, courseTitle);

    synthesizeMutation.mutate(
      {
        text: remainingText,
        voice: selectedVoiceUri || undefined,
        speed: currentSpeed,
        languageOverride: isForeignLanguage(resolvedLang) ? resolvedLang : null,
      },
      {
        onSuccess: (data) => {
          const audioBlob = base64ToBlob(data.audioBase64, data.contentType);
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          audioRef.current = audio;
          wordBoundariesRef.current = data.wordBoundaries || [];

          audio.onplay = () => { setStatus("playing"); startSentenceTracking(); };
          audio.onpause = () => { if (audio.currentTime < audio.duration) { setStatus("paused"); stopSentenceTracking(); } };
          audio.onended = () => {
            setStatus("idle"); setCurrentLabel(""); setCurrentSentenceIndex(-1);
            setSentences([]); setActiveMessageId(null); stopSentenceTracking();
            URL.revokeObjectURL(audioUrl); onCompleteRef.current?.();
          };
          audio.onerror = () => {
            setStatus("idle"); stopSentenceTracking(); URL.revokeObjectURL(audioUrl);
            onErrorRef.current?.("Audio playback error");
          };

          audio.play().catch(() => setStatus("idle"));
        },
        onError: () => {
          setStatus("idle");
          onErrorRef.current?.("Failed to skip back");
        },
      }
    );
  }, [currentSentenceIndex, subject, courseTitle, currentSpeed, selectedVoiceUri, langOverride, synthesizeMutation, startSentenceTracking, stopSentenceTracking]);

  const setVoice = useCallback((uri: string | null) => {
    setSelectedVoiceUri(uri);
  }, []);

  return {
    isSupported: true, // Server-side TTS is always available
    status,
    speak,
    pause,
    resume,
    stop,
    replay,
    setSpeed,
    cycleSpeed,
    currentSpeed,
    currentLabel,
    voices,
    setVoice,
    selectedVoiceUri,
    currentSentenceIndex,
    sentences,
    activeMessageId,
    skipForward,
    skipBack,
    totalSentences: sentences.length,
    detectedLanguage,
    setLanguageOverride: setLangOverride,
  };
}

/** Convert base64 string to Blob */
function base64ToBlob(base64: string, contentType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType });
}
