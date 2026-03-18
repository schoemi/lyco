"use client";

import { useEffect, useRef } from "react";

export interface UseKaraokeSwipeOptions {
  onNext: () => void;
  onPrev: () => void;
}

const SWIPE_THRESHOLD = 30; // Minimum px to count as a swipe

/**
 * Erkennt vertikale Swipe-Gesten (Touch) für die mobile Karaoke-Navigation.
 * Swipe nach oben = nächste Zeile, Swipe nach unten = vorherige Zeile.
 */
export function useKaraokeSwipe(options: UseKaraokeSwipeOptions): void {
  const onNextRef = useRef(options.onNext);
  const onPrevRef = useRef(options.onPrev);

  useEffect(() => {
    onNextRef.current = options.onNext;
  }, [options.onNext]);

  useEffect(() => {
    onPrevRef.current = options.onPrev;
  }, [options.onPrev]);

  useEffect(() => {
    let startY: number | null = null;
    let handled = false;

    function handleTouchStart(e: TouchEvent) {
      if (e.touches.length === 1) {
        startY = e.touches[0].clientY;
        handled = false;
      }
    }

    function handleTouchMove(e: TouchEvent) {
      if (startY === null || handled) return;

      const deltaY = startY - e.touches[0].clientY;

      if (Math.abs(deltaY) >= SWIPE_THRESHOLD) {
        // Prevent native scroll while swiping in karaoke
        e.preventDefault();

        if (deltaY > 0) {
          // Swiped up → next line
          onNextRef.current();
        } else {
          // Swiped down → previous line
          onPrevRef.current();
        }
        handled = true;
      }
    }

    function handleTouchEnd() {
      startY = null;
      handled = false;
    }

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);
}
