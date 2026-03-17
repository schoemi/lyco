"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface UseAutoScrollOptions {
  speed: number; // Seconds per line
  isLastLine: boolean;
  onAdvance: () => void; // Callback to advance to next line
}

export interface UseAutoScrollReturn {
  isPlaying: boolean;
  play: () => void;
  pause: () => void;
  toggle: () => void;
}

export function useAutoScroll(
  options: UseAutoScrollOptions
): UseAutoScrollReturn {
  const { speed, isLastLine, onAdvance } = options;
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onAdvanceRef = useRef(onAdvance);

  // Keep onAdvance ref current to avoid stale closures
  useEffect(() => {
    onAdvanceRef.current = onAdvance;
  }, [onAdvance]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const pause = useCallback(() => {
    clearTimer();
    setIsPlaying(false);
  }, [clearTimer]);

  const play = useCallback(() => {
    if (isLastLine) return;
    clearTimer();
    intervalRef.current = setInterval(() => {
      onAdvanceRef.current();
    }, speed * 1000);
    setIsPlaying(true);
  }, [speed, isLastLine, clearTimer]);

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, pause, play]);

  // Auto-stop when reaching the last line
  useEffect(() => {
    if (isLastLine && isPlaying) {
      pause();
    }
  }, [isLastLine, isPlaying, pause]);

  // Restart interval when speed changes while playing
  useEffect(() => {
    if (isPlaying) {
      clearTimer();
      intervalRef.current = setInterval(() => {
        onAdvanceRef.current();
      }, speed * 1000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speed]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return { isPlaying, play, pause, toggle };
}
