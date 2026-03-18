"use client";

import { useEffect } from "react";
import { themeToCssVars } from "@/lib/theme/serializer";
import type { ThemeConfig } from "@/lib/theme/types";

/**
 * Client component that fetches the current theme from the public API
 * and applies CSS custom properties to the <html> element.
 *
 * This ensures the theme is always up-to-date after an admin saves changes,
 * without requiring a full page reload or server re-render.
 */
export default function ThemeHydrator() {
  useEffect(() => {
    let cancelled = false;

    async function applyTheme() {
      try {
        const res = await fetch("/api/theme");
        if (!res.ok) return;
        const config: ThemeConfig = await res.json();
        if (cancelled) return;

        const cssVars = themeToCssVars(config);
        // Parse and apply each CSS variable to <html>
        const regex = /(--.+?):\s*(.+?);/g;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(cssVars)) !== null) {
          document.documentElement.style.setProperty(match[1], match[2]);
        }

        // Keep data-app-name in sync for client components
        if (config.appName) {
          document.documentElement.setAttribute("data-app-name", config.appName);
          window.dispatchEvent(new CustomEvent("theme-updated"));
        }
      } catch {
        // Silently fall back to server-rendered theme
      }
    }

    applyTheme();
    return () => { cancelled = true; };
  }, []);

  return null;
}
