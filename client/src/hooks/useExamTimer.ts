import { useState, useEffect, useRef, useCallback } from "react";

export type TimerStatus = "idle" | "running" | "warning" | "critical" | "expired";

export interface ExamTimerState {
  secondsRemaining: number;
  totalSeconds: number;
  status: TimerStatus;
  percentRemaining: number;
  formattedTime: string;
  isExpired: boolean;
  start: () => void;
  pause: () => void;
  reset: () => void;
}

/**
 * useExamTimer — countdown timer for timed exam mode.
 *
 * @param timeLimitMinutes  Total time in minutes (null = no timer)
 * @param onExpire          Callback fired when time runs out (auto-submit)
 * @param autoStart         Start immediately when mounted (default: false)
 */
export function useExamTimer(
  timeLimitMinutes: number | null | undefined,
  onExpire?: () => void,
  autoStart = false
): ExamTimerState {
  const totalSeconds = (timeLimitMinutes ?? 0) * 60;
  const [secondsRemaining, setSecondsRemaining] = useState(totalSeconds);
  const [running, setRunning] = useState(autoStart);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  // Reset when timeLimitMinutes changes (e.g. navigating between units)
  useEffect(() => {
    setSecondsRemaining((timeLimitMinutes ?? 0) * 60);
    setRunning(autoStart);
  }, [timeLimitMinutes, autoStart]);

  useEffect(() => {
    if (!running || !timeLimitMinutes) return;
    if (secondsRemaining <= 0) {
      setRunning(false);
      onExpireRef.current?.();
      return;
    }
    const id = setInterval(() => {
      setSecondsRemaining((s) => {
        if (s <= 1) {
          clearInterval(id);
          setRunning(false);
          onExpireRef.current?.();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, timeLimitMinutes, secondsRemaining]);

  const start = useCallback(() => setRunning(true), []);
  const pause = useCallback(() => setRunning(false), []);
  const reset = useCallback(() => {
    setSecondsRemaining((timeLimitMinutes ?? 0) * 60);
    setRunning(false);
  }, [timeLimitMinutes]);

  const percentRemaining = totalSeconds > 0 ? (secondsRemaining / totalSeconds) * 100 : 100;

  let status: TimerStatus = "idle";
  if (!timeLimitMinutes) {
    status = "idle";
  } else if (secondsRemaining <= 0) {
    status = "expired";
  } else if (secondsRemaining <= 60) {
    status = "critical";
  } else if (secondsRemaining <= totalSeconds * 0.25) {
    status = "warning";
  } else if (running) {
    status = "running";
  }

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return {
    secondsRemaining,
    totalSeconds,
    status,
    percentRemaining,
    formattedTime,
    isExpired: secondsRemaining <= 0 && !!timeLimitMinutes,
    start,
    pause,
    reset,
  };
}
