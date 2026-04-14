"use client";

import { useEffect, useRef } from "react";

export interface UseStageKeyboardOptions {
  onNext: () => void;
  onPrev: () => void;
  onToggleAutoScroll: () => void;
  onNextSong: () => void;
  onPrevSong: () => void;
  onEscape: () => void;
}

/**
 * Maps a keyboard key to the corresponding stage action.
 * Extracted as a pure function for testability.
 */
export function mapKeyToAction(
  key: string,
  options: UseStageKeyboardOptions
): void {
  switch (key) {
    case "ArrowDown":
    case "PageDown":
      options.onNext();
      break;
    case "ArrowUp":
    case "PageUp":
      options.onPrev();
      break;
    case " ":
      options.onToggleAutoScroll();
      break;
    case "Escape":
      options.onEscape();
      break;
  }
}

/**
 * Extends useKaraokeKeyboard with PageUp/PageDown support and song navigation.
 * - ArrowDown / PageDown → onNext (next line)
 * - ArrowUp / PageUp → onPrev (previous line)
 * - Space → onToggleAutoScroll
 * - Escape → onEscape
 * - onNextSong / onPrevSong are available for swipe/programmatic use
 */
export function useStageKeyboard(options: UseStageKeyboardOptions): void {
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === " ") {
        event.preventDefault();
      }
      mapKeyToAction(event.key, optionsRef.current);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
}
