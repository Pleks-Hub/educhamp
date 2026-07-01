import { useState, useEffect, useCallback, useRef } from "react";
import { stripMarkdownForTts, getTtsLanguage } from "@/lib/courseUtils";

export type TtsSpeed = "slow" | "normal" | "fast";
export type TtsStatus = "idle" | "playing" | "paused";

const SPEED_MAP: Record<TtsSpeed, number> = {
  slow: 0.7,
  normal: 0.9,
  fast: 1.25,
};

/** Split text into sentences for highlight-as-you-read */
export function splitIntoSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by whitespace or end of string
  const raw = text.match(/[^.!?]*[.!?]+[\s]?|[^.!?]+$/g);
  if (!raw) return text.trim() ? [text.trim()] : [];
  return raw.map(s => s.trim()).filter(Boolean);
}

interface UseTTSOptions {
  /** Course subject for language detection */
  subject?: string | null;
  /** Playback speed */
  speed?: TtsSpeed;
  /** Preferred voice URI (persisted from server) */
  voiceUri?: string | null;
  /** Callback when playback completes */
  onComplete?: () => void;
  /** Callback when an error occurs */
  onError?: (error: string) => void;
}

interface UseTTSReturn {
  /** Whether the Web Speech API is available */
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
  /** Current speed */
  currentSpeed: TtsSpeed;
  /** Label of what's currently being read */
  currentLabel: string;
  /** Available system voices */
  voices: SpeechSynthesisVoice[];
  /** Set preferred voice by URI */
  setVoice: (voiceUri: string | null) => void;
  /** Currently selected voice URI */
  selectedVoiceUri: string | null;
  /** Current sentence index being read (for highlight-as-you-read) */
  currentSentenceIndex: number;
  /** All sentences of the current text (for highlight rendering) */
  sentences: string[];
  /** The message ID currently being read (for per-message highlight) */
  activeMessageId: string | null;
}

export function useTTS(options: UseTTSOptions = {}): UseTTSReturn {
  const { subject, speed: initialSpeed = "normal", voiceUri: initialVoiceUri, onComplete, onError } = options;

  const [isSupported] = useState(() => typeof window !== "undefined" && "speechSynthesis" in window);
  const [status, setStatus] = useState<TtsStatus>("idle");
  const [currentSpeed, setCurrentSpeed] = useState<TtsSpeed>(initialSpeed);
  const [currentLabel, setCurrentLabel] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState<string | null>(initialVoiceUri ?? null);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(-1);
  const [sentences, setSentences] = useState<string[]>([]);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);

  const lastTextRef = useRef<string>("");
  const lastLabelRef = useRef<string>("");
  const lastMessageIdRef = useRef<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  const sentencesRef = useRef<string[]>([]);

  // Keep refs in sync
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  // Sync voiceUri from server when it changes
  useEffect(() => {
    if (initialVoiceUri !== undefined) {
      setSelectedVoiceUri(initialVoiceUri ?? null);
    }
  }, [initialVoiceUri]);

  // Load available voices
  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (available.length > 0) {
        setVoices(available);
      }
    };

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, [isSupported]);

  // Cancel on unmount
  useEffect(() => {
    return () => {
      if (isSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSupported]);

  // Pause on tab hidden, resume on visible
  useEffect(() => {
    if (!isSupported) return;

    const handleVisibility = () => {
      if (document.hidden && status === "playing") {
        window.speechSynthesis.pause();
        setStatus("paused");
      } else if (!document.hidden && status === "paused") {
        window.speechSynthesis.resume();
        setStatus("playing");
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [isSupported, status]);

  const speak = useCallback((text: string, label?: string, messageId?: string) => {
    if (!isSupported) {
      onErrorRef.current?.("Listen Mode is not supported on this device.");
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

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

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = getTtsLanguage(subject);
    utterance.rate = SPEED_MAP[currentSpeed];
    utterance.pitch = 1.0;

    // Set selected voice if available
    if (selectedVoiceUri && voices.length > 0) {
      const voice = voices.find(v => v.voiceURI === selectedVoiceUri);
      if (voice) utterance.voice = voice;
    }

    // Track sentence boundaries via onboundary event
    utterance.onboundary = (event) => {
      if (event.name === "sentence") {
        // Find which sentence we're in based on charIndex
        const charIdx = event.charIndex;
        let accumulated = 0;
        for (let i = 0; i < sentencesRef.current.length; i++) {
          accumulated += sentencesRef.current[i].length + 1; // +1 for space
          if (charIdx < accumulated) {
            setCurrentSentenceIndex(i);
            break;
          }
        }
      }
    };

    utterance.onstart = () => setStatus("playing");
    utterance.onend = () => {
      setStatus("idle");
      setCurrentLabel("");
      setCurrentSentenceIndex(-1);
      setSentences([]);
      setActiveMessageId(null);
      onCompleteRef.current?.();
    };
    utterance.onerror = (event) => {
      if (event.error === "interrupted" || event.error === "canceled") return;
      setStatus("idle");
      setCurrentLabel("");
      setCurrentSentenceIndex(-1);
      setSentences([]);
      setActiveMessageId(null);
      onErrorRef.current?.(`Speech error: ${event.error}`);
    };
    utterance.onpause = () => setStatus("paused");
    utterance.onresume = () => setStatus("playing");

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isSupported, subject, currentSpeed, selectedVoiceUri, voices]);

  const pause = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.pause();
    setStatus("paused");
  }, [isSupported]);

  const resume = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.resume();
    setStatus("playing");
  }, [isSupported]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setStatus("idle");
    setCurrentLabel("");
    setCurrentSentenceIndex(-1);
    setSentences([]);
    setActiveMessageId(null);
  }, [isSupported]);

  const replay = useCallback(() => {
    if (!isSupported || !lastTextRef.current) return;
    speak(lastTextRef.current, lastLabelRef.current, lastMessageIdRef.current || undefined);
  }, [isSupported, speak]);

  const setSpeed = useCallback((newSpeed: TtsSpeed) => {
    setCurrentSpeed(newSpeed);
  }, []);

  const setVoice = useCallback((uri: string | null) => {
    setSelectedVoiceUri(uri);
  }, []);

  return {
    isSupported,
    status,
    speak,
    pause,
    resume,
    stop,
    replay,
    setSpeed,
    currentSpeed,
    currentLabel,
    voices,
    setVoice,
    selectedVoiceUri,
    currentSentenceIndex,
    sentences,
    activeMessageId,
  };
}
