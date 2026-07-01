import { useState, useEffect, useCallback, useRef } from "react";
import { stripMarkdownForTts, getTtsLanguage } from "@/lib/courseUtils";

export type TtsSpeed = "slow" | "normal" | "fast";
export type TtsStatus = "idle" | "playing" | "paused";

const SPEED_MAP: Record<TtsSpeed, number> = {
  slow: 0.7,
  normal: 0.9,
  fast: 1.25,
};

interface UseTTSOptions {
  /** Course subject for language detection */
  subject?: string | null;
  /** Playback speed */
  speed?: TtsSpeed;
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
  speak: (text: string, label?: string) => void;
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
}

export function useTTS(options: UseTTSOptions = {}): UseTTSReturn {
  const { subject, speed: initialSpeed = "normal", onComplete, onError } = options;

  const [isSupported] = useState(() => typeof window !== "undefined" && "speechSynthesis" in window);
  const [status, setStatus] = useState<TtsStatus>("idle");
  const [currentSpeed, setCurrentSpeed] = useState<TtsSpeed>(initialSpeed);
  const [currentLabel, setCurrentLabel] = useState("");

  const lastTextRef = useRef<string>("");
  const lastLabelRef = useRef<string>("");
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);

  // Keep refs in sync
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

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

  const speak = useCallback((text: string, label?: string) => {
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
    setCurrentLabel(label || "Content");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = getTtsLanguage(subject);
    utterance.rate = SPEED_MAP[currentSpeed];
    utterance.pitch = 1.0;

    utterance.onstart = () => setStatus("playing");
    utterance.onend = () => {
      setStatus("idle");
      setCurrentLabel("");
      onCompleteRef.current?.();
    };
    utterance.onerror = (event) => {
      // "interrupted" and "canceled" are not real errors
      if (event.error === "interrupted" || event.error === "canceled") return;
      setStatus("idle");
      setCurrentLabel("");
      onErrorRef.current?.(`Speech error: ${event.error}`);
    };
    utterance.onpause = () => setStatus("paused");
    utterance.onresume = () => setStatus("playing");

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isSupported, subject, currentSpeed]);

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
  }, [isSupported]);

  const replay = useCallback(() => {
    if (!isSupported || !lastTextRef.current) return;
    speak(lastTextRef.current, lastLabelRef.current);
  }, [isSupported, speak]);

  const setSpeed = useCallback((newSpeed: TtsSpeed) => {
    setCurrentSpeed(newSpeed);
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
  };
}
