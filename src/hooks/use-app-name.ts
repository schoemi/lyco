"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const DEFAULT_NAME = "Lyco";

function getAppName(): string {
  if (typeof document === "undefined") return DEFAULT_NAME;
  return document.documentElement.getAttribute("data-app-name") || DEFAULT_NAME;
}

/**
 * Returns the current application name from the theme.
 * Reacts to theme updates dispatched by ThemeHydrator.
 */
export function useAppName(): string {
  const name = useSyncExternalStore(
    (cb) => {
      window.addEventListener("theme-updated", cb);
      return () => window.removeEventListener("theme-updated", cb);
    },
    getAppName,
    () => DEFAULT_NAME,
  );
  return name;
}
