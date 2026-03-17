"use client";

import { useEffect, useRef } from "react";

export interface UseKaraokeKeyboardOptions {
  onNext: () => void;
  onPrev: () => void;
  onToggleAutoScroll: () => void;
  onEscape: () => void;
}

export function useKaraokeKeyboard(options: UseKaraokeKeyboardOptions): void {
  const onNextRef = useRef(options.onNext);
  const onPrevRef = useRef(options.onPrev);
  const onToggleAutoScrollRef = useRef(options.onToggleAutoScroll);
  const onEscapeRef = useRef(options.onEscape);

  // Keep refs current to avoid stale closures
  useEffect(() => {
    onNextRef.current = options.onNext;
  }, [options.onNext]);

  useEffect(() => {
    onPrevRef.current = options.onPrev;
  }, [options.onPrev]);

  useEffect(() => {
    onToggleAutoScrollRef.current = options.onToggleAutoScroll;
  }, [options.onToggleAutoScroll]);

  useEffect(() => {
    onEscapeRef.current = options.onEscape;
  }, [options.onEscape]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      switch (event.key) {
        case "ArrowDown":
          onNextRef.current();
          break;
        case "ArrowUp":
          onPrevRef.current();
          break;
        case " ":
          event.preventDefault();
          onToggleAutoScrollRef.current();
          break;
        case "Escape":
          onEscapeRef.current();
          break;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
}
