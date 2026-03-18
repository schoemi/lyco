"use client";

/**
 * Theming-Editor-Seite – Admin-Oberfläche zum visuellen Bearbeiten
 * und Vorschauen der Theme-Konfiguration.
 *
 * Anforderungen: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 9.5,
 *                10.1, 11.1, 12.1, 13.1, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6
 */

import { useEffect, useState, useCallback } from "react";
import type { ThemeConfig } from "@/lib/theme/types";
import { getDefaultTheme } from "@/lib/theme/serializer";
import ThemePreview from "@/components/admin/theme-preview";

// ---------------------------------------------------------------------------
// Font options
// ---------------------------------------------------------------------------

const FONT_FAMILIES = [
  "'Inter', system-ui, sans-serif",
  "'Arial', sans-serif",
  "'Georgia', serif",
  "'Times New Roman', serif",
  "'Courier New', monospace",
  "system-ui, sans-serif",
];

const FONT_WEIGHTS = ["100", "200", "300", "400", "500", "600", "700", "800", "900"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simple deep clone via JSON round-trip. */
function cloneTheme(t: ThemeConfig): ThemeConfig {
  return JSON.parse(JSON.stringify(t));
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="rounded-lg border border-gray-200 bg-white shadow-sm" open>
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-gray-900">
        {title}
      </summary>
      <div className="grid grid-cols-1 gap-4 px-4 pb-4 pt-2 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>
    </details>
  );
}

// ---------------------------------------------------------------------------
// Field components
// ---------------------------------------------------------------------------

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-700">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-8 cursor-pointer rounded border border-gray-300"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-24 rounded border border-gray-300 px-2 py-1 text-xs font-mono"
          maxLength={7}
        />
      </div>
    </label>
  );
}

function FontSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-700">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-gray-300 px-2 py-1.5 text-xs"
      >
        {FONT_FAMILIES.map((f) => (
          <option key={f} value={f}>
            {f.split(",")[0].replace(/'/g, "")}
          </option>
        ))}
      </select>
    </label>
  );
}

function WeightSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-700">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-gray-300 px-2 py-1.5 text-xs"
      >
        {FONT_WEIGHTS.map((w) => (
          <option key={w} value={w}>
            {w}
          </option>
        ))}
      </select>
    </label>
  );
}

function SizeField({
  label,
  value,
  onChange,
  min = 10,
  max = 72,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: number;
  max?: number;
}) {
  const num = parseInt(value, 10) || min;
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-700">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={num}
          min={min}
          max={max}
          onChange={(e) => onChange(`${e.target.value}px`)}
          className="w-20 rounded border border-gray-300 px-2 py-1 text-xs"
        />
        <span className="text-xs text-gray-500">px</span>
      </div>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function ThemingEditorPage() {
  const [theme, setTheme] = useState<ThemeConfig>(getDefaultTheme());
  const [savedTheme, setSavedTheme] = useState<ThemeConfig>(getDefaultTheme());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isDirty = JSON.stringify(theme) !== JSON.stringify(savedTheme);

  // ---- Load theme on mount ----
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings/theme");
        if (!res.ok) throw new Error("Fehler beim Laden");
        const data: ThemeConfig = await res.json();
        setTheme(data);
        setSavedTheme(data);
        setError(null);
      } catch {
        setError("Theme konnte nicht geladen werden. Standardwerte werden verwendet.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ---- Unsaved changes warning ----
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // ---- Updaters ----
  const updateColor = useCallback(
    (key: keyof ThemeConfig["colors"], value: string) => {
      setTheme((prev) => {
        const next = cloneTheme(prev);
        (next.colors as Record<string, unknown>)[key] = value;
        return next;
      });
    },
    [],
  );

  const updateTypography = useCallback(
    (key: keyof ThemeConfig["typography"], value: string) => {
      setTheme((prev) => {
        const next = cloneTheme(prev);
        next.typography[key] = value;
        return next;
      });
    },
    [],
  );

  const updateKaraoke = useCallback(
    (key: keyof ThemeConfig["karaoke"], value: string) => {
      setTheme((prev) => {
        const next = cloneTheme(prev);
        next.karaoke[key] = value;
        return next;
      });
    },
    [],
  );

  // ---- Save ----
  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/settings/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(theme),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Fehler beim Speichern");
      }
      setSavedTheme(cloneTheme(theme));
      setSuccess("Theme erfolgreich gespeichert.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  }

  // ---- Reset ----
  function handleReset() {
    const defaults = getDefaultTheme();
    setTheme(defaults);
  }

  // ---- Render ----
  if (loading) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Theming</h1>
        <p className="text-sm text-gray-500">Lade Theme-Einstellungen...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Theming</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Zurücksetzen
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {saving ? "Speichert..." : "Speichern"}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}
      {isDirty && (
        <p className="text-xs text-amber-600">
          Ungespeicherte Änderungen vorhanden.
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_400px]">
        {/* Left: Settings */}
        <div className="space-y-4">
          {/* App name */}
          <Section title="Anwendungsname">
            <label className="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
              <span className="text-xs font-medium text-gray-700">Name</span>
              <input
                type="text"
                value={theme.appName}
                maxLength={50}
                onChange={(e) =>
                  setTheme((prev) => ({ ...prev, appName: e.target.value }))
                }
                className="w-full max-w-md rounded border border-gray-300 px-3 py-1.5 text-sm"
                placeholder="Lyco"
              />
              <span className="text-xs text-gray-400">
                {theme.appName.length}/50 Zeichen
              </span>
            </label>
          </Section>

          {/* Primary & Accent */}
          <Section title="Primär- & Akzentfarben">
            <ColorField
              label="Primärfarbe"
              value={theme.colors.primary}
              onChange={(v) => updateColor("primary", v)}
            />
            <ColorField
              label="Akzentfarbe"
              value={theme.colors.accent ?? theme.colors.primary}
              onChange={(v) => updateColor("accent", v)}
            />
          </Section>

          {/* Backgrounds */}
          <Section title="Hintergrundfarben">
            <ColorField
              label="Seiten-Hintergrund"
              value={theme.colors.pageBg}
              onChange={(v) => updateColor("pageBg", v)}
            />
            <ColorField
              label="Card-Hintergrund"
              value={theme.colors.cardBg}
              onChange={(v) => updateColor("cardBg", v)}
            />
            <ColorField
              label="Rahmenfarbe"
              value={theme.colors.border}
              onChange={(v) => updateColor("border", v)}
            />
          </Section>

          {/* Tabs & Controls */}
          <Section title="Tabs & Controls">
            <ColorField
              label="Tab aktiv"
              value={theme.colors.tabActiveBg}
              onChange={(v) => updateColor("tabActiveBg", v)}
            />
            <ColorField
              label="Tab inaktiv"
              value={theme.colors.tabInactiveBg}
              onChange={(v) => updateColor("tabInactiveBg", v)}
            />
            <ColorField
              label="Control-Hintergrund"
              value={theme.colors.controlBg}
              onChange={(v) => updateColor("controlBg", v)}
            />
          </Section>

          {/* Signal colors */}
          <Section title="Signalfarben">
            <ColorField
              label="Erfolg"
              value={theme.colors.success}
              onChange={(v) => updateColor("success", v)}
            />
            <ColorField
              label="Warnung"
              value={theme.colors.warning}
              onChange={(v) => updateColor("warning", v)}
            />
            <ColorField
              label="Fehler"
              value={theme.colors.error}
              onChange={(v) => updateColor("error", v)}
            />
          </Section>

          {/* Button colors */}
          <Section title="Button-Farben">
            <ColorField
              label="Primärer Button"
              value={theme.colors.primaryButton}
              onChange={(v) => updateColor("primaryButton", v)}
            />
            <ColorField
              label="Sekundärer Button"
              value={theme.colors.secondaryButton}
              onChange={(v) => updateColor("secondaryButton", v)}
            />
            <ColorField
              label="Neuer Song Button"
              value={theme.colors.newSongButton}
              onChange={(v) => updateColor("newSongButton", v)}
            />
            <ColorField
              label="Übersetzungs-Toggle"
              value={theme.colors.translationToggle}
              onChange={(v) => updateColor("translationToggle", v)}
            />
          </Section>

          {/* Karaoke colors */}
          <Section title="Karaoke-Farben">
            <ColorField
              label="Aktive Zeile"
              value={theme.karaoke.activeLineColor}
              onChange={(v) => updateKaraoke("activeLineColor", v)}
            />
            <ColorField
              label="Gelesene Zeile"
              value={theme.karaoke.readLineColor}
              onChange={(v) => updateKaraoke("readLineColor", v)}
            />
            <ColorField
              label="Ungelesene Zeile"
              value={theme.karaoke.unreadLineColor}
              onChange={(v) => updateKaraoke("unreadLineColor", v)}
            />
            <ColorField
              label="Hintergrund Von"
              value={theme.karaoke.bgFrom}
              onChange={(v) => updateKaraoke("bgFrom", v)}
            />
            <ColorField
              label="Hintergrund Mitte"
              value={theme.karaoke.bgVia}
              onChange={(v) => updateKaraoke("bgVia", v)}
            />
            <ColorField
              label="Hintergrund Bis"
              value={theme.karaoke.bgTo}
              onChange={(v) => updateKaraoke("bgTo", v)}
            />
          </Section>

          {/* Typography: Headline, Copy, Label */}
          <Section title="Typografie – Überschriften, Fließtext, Labels">
            <FontSelect
              label="Headline Schriftart"
              value={theme.typography.headlineFont}
              onChange={(v) => updateTypography("headlineFont", v)}
            />
            <WeightSelect
              label="Headline Gewichtung"
              value={theme.typography.headlineWeight}
              onChange={(v) => updateTypography("headlineWeight", v)}
            />
            <div /> {/* spacer */}
            <FontSelect
              label="Copy Schriftart"
              value={theme.typography.copyFont}
              onChange={(v) => updateTypography("copyFont", v)}
            />
            <WeightSelect
              label="Copy Gewichtung"
              value={theme.typography.copyWeight}
              onChange={(v) => updateTypography("copyWeight", v)}
            />
            <div /> {/* spacer */}
            <FontSelect
              label="Label Schriftart"
              value={theme.typography.labelFont}
              onChange={(v) => updateTypography("labelFont", v)}
            />
            <WeightSelect
              label="Label Gewichtung"
              value={theme.typography.labelWeight}
              onChange={(v) => updateTypography("labelWeight", v)}
            />
          </Section>

          {/* Typography: Song lines & Translation lines */}
          <Section title="Typografie – Song- & Übersetzungszeilen">
            <FontSelect
              label="Song-Zeilen Schriftart"
              value={theme.typography.songLineFont}
              onChange={(v) => updateTypography("songLineFont", v)}
            />
            <WeightSelect
              label="Song-Zeilen Gewichtung"
              value={theme.typography.songLineWeight}
              onChange={(v) => updateTypography("songLineWeight", v)}
            />
            <SizeField
              label="Song-Zeilen Größe"
              value={theme.typography.songLineSize}
              onChange={(v) => updateTypography("songLineSize", v)}
            />
            <FontSelect
              label="Übersetzung Schriftart"
              value={theme.typography.translationLineFont}
              onChange={(v) => updateTypography("translationLineFont", v)}
            />
            <WeightSelect
              label="Übersetzung Gewichtung"
              value={theme.typography.translationLineWeight}
              onChange={(v) => updateTypography("translationLineWeight", v)}
            />
            <SizeField
              label="Übersetzung Größe"
              value={theme.typography.translationLineSize}
              onChange={(v) => updateTypography("translationLineSize", v)}
            />
          </Section>

          {/* Karaoke font sizes */}
          <Section title="Karaoke-Schriftgrößen">
            <SizeField
              label="Aktive Zeile"
              value={theme.karaoke.activeLineSize}
              onChange={(v) => updateKaraoke("activeLineSize", v)}
              min={14}
              max={48}
            />
            <SizeField
              label="Gelesene Zeile"
              value={theme.karaoke.readLineSize}
              onChange={(v) => updateKaraoke("readLineSize", v)}
              min={14}
              max={48}
            />
            <SizeField
              label="Ungelesene Zeile"
              value={theme.karaoke.unreadLineSize}
              onChange={(v) => updateKaraoke("unreadLineSize", v)}
              min={14}
              max={48}
            />
          </Section>
        </div>

        {/* Right: Preview */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-900">Vorschau</h2>
          <div className="sticky top-4">
            <ThemePreview themeConfig={theme} />
          </div>
        </div>
      </div>
    </div>
  );
}
