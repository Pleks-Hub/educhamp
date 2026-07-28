/**
 * useReadAloud — Server-side Edge Neural TTS hook for lesson narration.
 * Replaces the old Web Speech API implementation with high-quality neural voices.
 * Features: play/pause/stop/replay, speed control, word highlighting
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";

export interface ReadAloudOptions {
  rate?: number;   // Default 0.85 (slower for young learners)
  lang?: string;   // Default "en-US"
  onEnd?: () => void;
}

export interface ReadAloudState {
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  wordIndex: number;   // index of currently spoken word in `words` array
  words: string[];     // text split into tokens for highlighting
  isSupported: boolean;
  rate: number;
  play: () => void;
  pause: () => void;
  stop: () => void;
  toggle: () => void;
  setRate: (r: number) => void;
}

function base64ToBlob(base64: string, contentType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNumbers)], { type: contentType });
}

/** Map numeric rate (0.6-1.6) to Edge TTS percentage string */
function rateToEdgePercent(rate: number): "slow" | "normal" | "fast" {
  if (rate <= 0.75) return "slow";
  if (rate >= 1.1) return "fast";
  return "normal";
}

export function useReadAloud(text: string, options: ReadAloudOptions = {}): ReadAloudState {
  const { onEnd } = options;
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [wordIndex, setWordIndex] = useState(-1);
  const [rate, setRateState] = useState(options.rate ?? 0.85);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const onEndRef = useRef(onEnd);
  const wordTimerRef = useRef<number | null>(null);

  // Keep onEnd ref in sync
  useEffect(() => { onEndRef.current = onEnd; }, [onEnd]);

  // Split into word tokens (preserving spaces for index mapping)
  const words = text ? text.split(/(\s+)/).filter(Boolean) : [];

  const synthesizeMutation = trpc.tts.synthesize.useMutation();

  /** Stop current playback and clean up */
  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    if (wordTimerRef.current) {
      cancelAnimationFrame(wordTimerRef.current);
      wordTimerRef.current = null;
    }
  }, []);

  // Cancel when text changes
  useEffect(() => {
    cleanup();
    setIsPlaying(false);
    setIsPaused(false);
    setWordIndex(-1);
  }, [text, cleanup]);

  // Cleanup on unmount
  useEffect(() => { return () => { cleanup(); }; }, [cleanup]);

  /** Start word-index tracking based on audio progress */
  const startWordTracking = useCallback(() => {
    const track = () => {
      if (!audioRef.current || audioRef.current.paused) return;
      if (audioRef.current.duration > 0 && words.length > 0) {
        const progress = audioRef.current.currentTime / audioRef.current.duration;
        const estimatedIdx = Math.min(Math.floor(progress * words.length), words.length - 1);
        setWordIndex(estimatedIdx);
      }
      wordTimerRef.current = requestAnimationFrame(track);
    };
    wordTimerRef.current = requestAnimationFrame(track);
  }, [words.length]);

  const play = useCallback(() => {
    cleanup();
    if (!text.trim()) return;

    setIsLoading(true);
    setWordIndex(-1);

    synthesizeMutation.mutate(
      {
        text,
        speed: rateToEdgePercent(rate),
      },
      {
        onSuccess: (data) => {
          setIsLoading(false);
          const blob = base64ToBlob(data.audioBase64, data.contentType);
          const url = URL.createObjectURL(blob);
          audioUrlRef.current = url;

          const audio = new Audio(url);
          audioRef.current = audio;

          audio.onplay = () => {
            setIsPlaying(true);
            setIsPaused(false);
            startWordTracking();
          };
          audio.onpause = () => {
            if (audio.currentTime < audio.duration) {
              setIsPlaying(false);
              setIsPaused(true);
              if (wordTimerRef.current) {
                cancelAnimationFrame(wordTimerRef.current);
                wordTimerRef.current = null;
              }
            }
          };
          audio.onended = () => {
            setIsPlaying(false);
            setIsPaused(false);
            setWordIndex(-1);
            if (wordTimerRef.current) {
              cancelAnimationFrame(wordTimerRef.current);
              wordTimerRef.current = null;
            }
            URL.revokeObjectURL(url);
            audioUrlRef.current = null;
            onEndRef.current?.();
          };
          audio.onerror = () => {
            setIsPlaying(false);
            setIsPaused(false);
            setWordIndex(-1);
            URL.revokeObjectURL(url);
            audioUrlRef.current = null;
          };

          audio.play().catch(() => {
            setIsPlaying(false);
            setIsLoading(false);
          });
        },
        onError: () => {
          setIsLoading(false);
        },
      }
    );
  }, [text, rate, cleanup, synthesizeMutation, startWordTracking]);

  const pause = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
    }
  }, []);

  const stop = useCallback(() => {
    cleanup();
    setIsPlaying(false);
    setIsPaused(false);
    setWordIndex(-1);
  }, [cleanup]);

  const toggle = useCallback(() => {
    if (isLoading) return;
    if (isPlaying) {
      pause();
    } else if (isPaused && audioRef.current) {
      audioRef.current.play().catch(() => {});
    } else {
      play();
    }
  }, [isPlaying, isPaused, isLoading, play, pause]);

  const setRate = useCallback((r: number) => {
    const clamped = Math.min(1.6, Math.max(0.6, r));
    setRateState(clamped);
    // If currently playing, restart with new rate
    if (isPlaying || isPaused) {
      cleanup();
      setIsPlaying(false);
      setIsPaused(false);
      setWordIndex(-1);
      // Re-synthesize with new rate after a brief delay
      setTimeout(() => {
        // Will be triggered by the next play() call
      }, 80);
    }
  }, [isPlaying, isPaused, cleanup]);

  return {
    isPlaying,
    isPaused,
    isLoading,
    wordIndex,
    words,
    isSupported: true, // Server-side TTS is always available
    rate,
    play,
    pause,
    stop,
    toggle,
    setRate,
  };
}
