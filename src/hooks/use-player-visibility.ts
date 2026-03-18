"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Tracks whether a target element is visible in the viewport
 * using IntersectionObserver. Uses a callback ref so the observer
 * is set up when the element actually mounts (even if delayed).
 */
export function usePlayerVisibility<T extends HTMLElement = HTMLDivElement>() {
  const [node, setNode] = useState<T | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  const ref = useCallback((el: T | null) => {
    setNode(el);
  }, []);

  useEffect(() => {
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);

  return { ref, isVisible };
}
