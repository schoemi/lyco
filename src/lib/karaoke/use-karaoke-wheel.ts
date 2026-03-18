"use client";

import { useEffect, useRef } from "react";

export interface UseKaraokeWheelOptions {
  onNext: () => void;
  onPrev: () => void;
}

/**
 * Navigiert per Mausrad / Touchpad-Scroll durch die Karaoke-Zeilen.
 * Debounced auf ~200 ms, damit ein einzelner Scroll-Impuls genau eine Zeile weiterscrollt.
 */
export function useKaraokeWheel(options: UseKaraokeWheelOptions): void {
  const onNextRef = useRef(options.onNext);
  const onPrevRef = useRef(options.onPrev);

  useEffect(() => {
    onNextRef.current = options.onNext;
  }, [options.onNext]);

  useEffect(() => {
    onPrevRef.current = options.onPrev;
  }, [options.onPrev]);

  useEffect(() => {
    let cooldown = false;

    function handleWheel(e: WheelEvent) {
      // Prevent native scroll on the fullscreen karaoke view
      e.preventDefault();

      if (cooldown) return;

      // deltaY > 0 = scroll down = next line
      if (e.deltaY > 0) {
        onNextRef.current();
      } else if (e.deltaY < 0) {
        onPrevRef.current();
      }

      cooldown = true;
      setTimeout(() => {
        cooldown = false;
      }, 200);
    }

    // passive: false is required so we can call preventDefault()
    document.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      document.removeEventListener("wheel", handleWheel);
    };
  }, []);
}
