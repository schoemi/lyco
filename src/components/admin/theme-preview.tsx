"use client";

/**
 * Theme-Vorschau-Komponente – Isolierter Container mit CSS-Scope,
 * der alle Referenz-Komponenten mit den aktuellen Theme-Einstellungen rendert.
 *
 * Anforderungen: 13.1, 13.2, 13.3, 13.4, 14.1
 */

import type { ThemeConfig } from "@/lib/theme/types";
import { themeToCssVars, cssVarsToStyleObject } from "@/lib/theme/serializer";

interface ThemePreviewProps {
  themeConfig: ThemeConfig;
}

export default function ThemePreview({ themeConfig }: ThemePreviewProps) {
  const cssVars = themeToCssVars(themeConfig);
  const styleObject = cssVarsToStyleObject(cssVars);

  const hl = {
    fontFamily: "var(--font-headline)",
    fontWeight: "var(--font-headline-weight)",
    color: "var(--color-headline-text)",
  };

  return (
    <div
      style={{
        ...styleObject,
        backgroundColor: "var(--color-page-bg)",
        color: "var(--color-copy-text)",
      }}
      className="rounded-lg border p-6 space-y-6 overflow-auto"
    >
      {/* Buttons */}
      <section>
        <h3 style={hl} className="text-sm mb-2">Buttons</h3>
        <div className="flex flex-wrap gap-2">
          <button
            style={{ backgroundColor: "var(--color-btn-primary)", color: "var(--color-button-text)" }}
            className="px-4 py-2 rounded text-sm font-medium"
          >
            Primär
          </button>
          <button
            style={{ backgroundColor: "var(--color-btn-secondary)", color: "var(--color-button-text)" }}
            className="px-4 py-2 rounded text-sm font-medium"
          >
            Sekundär
          </button>
          <button
            style={{ backgroundColor: "var(--color-btn-new-song)", color: "var(--color-button-text)" }}
            className="px-4 py-2 rounded text-sm font-medium"
          >
            + Neuer Song
          </button>
        </div>
      </section>

      {/* Card */}
      <section>
        <h3 style={hl} className="text-sm mb-2">Card</h3>
        <div
          style={{ backgroundColor: "var(--color-card-bg)", borderColor: "var(--color-border)" }}
          className="rounded-lg border p-4 text-sm"
        >
          <p style={{ fontFamily: "var(--font-copy)", fontWeight: "var(--font-copy-weight)", color: "var(--color-copy-text)" }}>
            Beispiel-Card mit Rahmen und Hintergrund.
          </p>
          <p style={{ color: "var(--color-link-text)" }} className="text-sm mt-1 underline cursor-pointer">
            Beispiel-Link
          </p>
          <p style={{ color: "var(--color-muted-text)" }} className="text-xs mt-1">
            Sekundärer Hinweistext
          </p>
        </div>
      </section>

      {/* Tabs */}
      <section>
        <h3 style={hl} className="text-sm mb-2">Tabs</h3>
        <div className="flex gap-1">
          <span
            style={{ backgroundColor: "var(--color-tab-active-bg)", color: "var(--color-button-text)" }}
            className="px-3 py-1.5 rounded text-xs font-medium"
          >
            Aktiv
          </span>
          <span
            style={{ backgroundColor: "var(--color-tab-inactive-bg)", color: "var(--color-muted-text)" }}
            className="px-3 py-1.5 rounded text-xs font-medium"
          >
            Inaktiv
          </span>
        </div>
      </section>

      {/* Progressbar */}
      <section>
        <h3 style={hl} className="text-sm mb-2">Progressbar</h3>
        <div className="w-full h-3 rounded-full bg-gray-200 overflow-hidden">
          <div style={{ backgroundColor: "var(--color-success)", width: "65%" }} className="h-full rounded-full" />
        </div>
      </section>

      {/* Status dots */}
      <section>
        <h3 style={hl} className="text-sm mb-2">Status-Punkte</h3>
        <div className="flex gap-3 items-center">
          <span style={{ color: "var(--color-copy-text)" }} className="flex items-center gap-1 text-xs">
            <span style={{ backgroundColor: "var(--color-success)" }} className="inline-block w-2.5 h-2.5 rounded-full" />
            Erfolg
          </span>
          <span style={{ color: "var(--color-copy-text)" }} className="flex items-center gap-1 text-xs">
            <span style={{ backgroundColor: "var(--color-warning)" }} className="inline-block w-2.5 h-2.5 rounded-full" />
            Warnung
          </span>
          <span style={{ color: "var(--color-copy-text)" }} className="flex items-center gap-1 text-xs">
            <span style={{ backgroundColor: "var(--color-error)" }} className="inline-block w-2.5 h-2.5 rounded-full" />
            Fehler
          </span>
        </div>
      </section>

      {/* Song lines */}
      <section>
        <h3 style={hl} className="text-sm mb-2">Song-Zeilen</h3>
        <div className="space-y-0.5">
          <p style={{ fontFamily: "var(--font-song-line)", fontWeight: "var(--font-song-line-weight)", fontSize: "var(--font-song-line-size)", color: "var(--color-copy-text)" }}>
            Don&apos;t wanna be an American idiot
          </p>
          <p style={{ fontFamily: "var(--font-translation-line)", fontWeight: "var(--font-translation-line-weight)", fontSize: "var(--font-translation-line-size)", color: "var(--color-muted-text)" }}>
            Will kein amerikanischer Idiot sein
          </p>
        </div>
      </section>

      {/* Karaoke lines */}
      <section>
        <h3 style={hl} className="text-sm mb-2">Karaoke-Zeilen</h3>
        <div
          className="rounded-lg p-4 space-y-1"
          style={{ background: "linear-gradient(to bottom right, var(--karaoke-bg-from, #312e81), var(--karaoke-bg-via, #581c87), var(--karaoke-bg-to, #0f172a))" }}
        >
          <p style={{ color: "var(--karaoke-read-color)", fontSize: "var(--karaoke-read-size)" }}>
            Welcome to a new kind of tension
          </p>
          <p style={{ color: "var(--karaoke-active-color)", fontSize: "var(--karaoke-active-size)", fontWeight: 700 }}>
            All across the alien nation
          </p>
          <p style={{ color: "var(--karaoke-unread-color)", fontSize: "var(--karaoke-unread-size)" }}>
            Where everything isn&apos;t meant to be okay
          </p>
        </div>
      </section>

      {/* Toggle */}
      <section>
        <h3 style={hl} className="text-sm mb-2">Toggle</h3>
        <div className="flex items-center gap-2">
          <div style={{ backgroundColor: "var(--color-translation-toggle)" }} className="relative w-10 h-5 rounded-full">
            <div className="absolute top-0.5 left-5 w-4 h-4 rounded-full bg-white shadow" />
          </div>
          <span style={{ fontFamily: "var(--font-label)", fontWeight: "var(--font-label-weight)", color: "var(--color-label-text)" }} className="text-xs">
            Übersetzung
          </span>
        </div>
      </section>

      {/* Input field */}
      <section>
        <h3 style={hl} className="text-sm mb-2">Eingabefeld</h3>
        <label style={{ fontFamily: "var(--font-label)", fontWeight: "var(--font-label-weight)", color: "var(--color-label-text)" }} className="block text-xs mb-1">
          Beispiel-Label
        </label>
        <input
          type="text"
          readOnly
          placeholder="Beispiel-Eingabe..."
          style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-control-bg)", fontFamily: "var(--font-copy)", color: "var(--color-copy-text)" }}
          className="w-full px-3 py-2 rounded border text-sm outline-none"
        />
      </section>

      {/* Score pill */}
      <section>
        <h3 style={hl} className="text-sm mb-2">Score-Pill</h3>
        <span
          style={{ backgroundColor: "var(--color-success)", color: "var(--color-button-text)" }}
          className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
        >
          85 %
        </span>
      </section>

      {/* Pill / Tag preview */}
      <section>
        <h3 style={hl} className="text-sm mb-2">Pills &amp; Tags</h3>
        <div className="flex flex-wrap gap-2">
          <span
            style={{ backgroundColor: "var(--color-pill-50)", color: "var(--color-pill-700)" }}
            className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
          >
            Set-Beispiel
          </span>
          <span
            style={{ backgroundColor: "var(--color-pill-50)", color: "var(--color-pill-700)" }}
            className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
          >
            Emotion-Tag
          </span>
        </div>
      </section>
    </div>
  );
}
