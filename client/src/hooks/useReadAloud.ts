/**
 * useReadAloud — Web Speech API hook for lesson narration
 * Features: play/pause/stop/replay, speed control, word highlighting, fallback
 */
import { useCallback, useEffect, useRef, useState } from "react";

export interface ReadAloudOptions {
  rate?: number;   // Default 0.85 (slower for young learners)
  lang?: string;   // Default "en-US"
  onEnd?: () => void;
}

export interface ReadAloudState {
  isPlaying: boolean;
  isPaused: boolean;
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

const SUPPORTED = typeof window !== "undefined" && "speechSynthesis" in window;

export function useReadAloud(text: string, options: ReadAloudOptions = {}): ReadAloudState {
  const { lang = "en-US", onEnd } = options;
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [wordIndex, setWordIndex] = useState(-1);
  const [rate, setRateState] = useState(options.rate ?? 0.85);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Split into word tokens (preserving spaces for index mapping)
  const words = text ? text.split(/(\s+)/).filter(Boolean) : [];

  const buildUtterance = useCallback(() => {
    if (!text.trim()) return null;
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = lang;
    utt.rate = rate;

    utt.onboundary = (e) => {
      if (e.name !== "word") return;
      let cumulative = 0;
      for (let i = 0; i < words.length; i++) {
        cumulative += words[i].length;
        if (cumulative > e.charIndex) { setWordIndex(i); break; }
      }
    };
    utt.onstart  = () => { setIsPlaying(true);  setIsPaused(false); };
    utt.onpause  = () => { setIsPlaying(false); setIsPaused(true);  };
    utt.onresume = () => { setIsPlaying(true);  setIsPaused(false); };
    utt.onend    = () => { setIsPlaying(false); setIsPaused(false); setWordIndex(-1); onEnd?.(); };
    utt.onerror  = () => { setIsPlaying(false); setIsPaused(false); setWordIndex(-1); };
    return utt;
  }, [text, lang, rate, words, onEnd]);

  // Cancel when text changes
  useEffect(() => {
    if (!SUPPORTED) return;
    window.speechSynthesis.cancel();
    setIsPlaying(false); setIsPaused(false); setWordIndex(-1);
  }, [text]);

  // Cleanup on unmount
  useEffect(() => { return () => { if (SUPPORTED) window.speechSynthesis.cancel(); }; }, []);

  const play = useCallback(() => {
    if (!SUPPORTED) return;
    window.speechSynthesis.cancel();
    const utt = buildUtterance();
    if (!utt) return;
    utteranceRef.current = utt;
    setWordIndex(-1);
    window.speechSynthesis.speak(utt);
  }, [buildUtterance]);

  const pause = useCallback(() => {
    if (!SUPPORTED) return;
    window.speechSynthesis.pause();
    setIsPlaying(false); setIsPaused(true);
  }, []);

  const stop = useCallback(() => {
    if (!SUPPORTED) return;
    window.speechSynthesis.cancel();
    setIsPlaying(false); setIsPaused(false); setWordIndex(-1);
  }, []);

  const toggle = useCallback(() => {
    if (!SUPPORTED) return;
    if (isPlaying) {
      pause();
    } else if (isPaused) {
      // Safari doesn't support resume() reliably — restart instead
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      if (isSafari) { play(); }
      else { window.speechSynthesis.resume(); setIsPlaying(true); setIsPaused(false); }
    } else {
      play();
    }
  }, [isPlaying, isPaused, play, pause]);

  const setRate = useCallback((r: number) => {
    const clamped = Math.min(1.6, Math.max(0.6, r));
    setRateState(clamped);
    if (isPlaying || isPaused) {
      window.speechSynthesis.cancel();
      setIsPlaying(false); setIsPaused(false); setWordIndex(-1);
      setTimeout(() => {
        const utt = buildUtterance();
        if (utt) { utt.rate = clamped; utteranceRef.current = utt; window.speechSynthesis.speak(utt); }
      }, 80);
    }
  }, [isPlaying, isPaused, buildUtterance]);

  return { isPlaying, isPaused, wordIndex, words, isSupported: SUPPORTED, rate, play, pause, stop, toggle, setRate };
}
