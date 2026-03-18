"use client";

import { useEffect, useCallback } from "react";
import { themeToCssVars } from "@/lib/theme/serializer";
import type { ThemeConfig } from "@/lib/theme/types";

/**
 * Client component that fetches the current theme from the public API
 * and applies CSS custom properties to the <html> element.
 *
 * This ensures the theme is always up-to-date after an admin saves changes,
 * without requiring a full page reload or server re-render.
 *
 * Listens for the custom "theme-variant-changed" event so that the
 * VariantToggle (user-menu) and ThemeSelector (profile) can trigger
 * a re-fetch and re-application of CSS vars.
 *
 * Anforderungen: 6.4, 6.5, 7.4, 7.5
 */
export default function ThemeHydrator() {
  const applyTheme = useCallback(async () => {
    try {
      const res = await fetch("/api/theme");
      if (!res.ok) return;
      const config: ThemeConfig = await res.json();

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
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Initial theme application
    if (!cancelled) {
      applyTheme();
    }

    // Listen for variant/theme changes from VariantToggle or ThemeSelector
    function handleVariantChanged() {
      if (!cancelled) {
        applyTheme();
      }
    }

    window.addEventListener("theme-variant-changed", handleVariantChanged);

    return () => {
      cancelled = true;
      window.removeEventListener("theme-variant-changed", handleVariantChanged);
    };
  }, [applyTheme]);

  return null;
}
