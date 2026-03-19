"use client";

/**
 * ThemeEditPage – Bearbeitungsansicht für ein einzelnes Theme.
 *
 * Anforderungen: 2.1, 2.2, 2.3, 2.4, 5.2, 5.3, 5.4
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { ThemeConfig, ThemeColors, ThemeTypography, KaraokeTheme } from "@/lib/theme/types";
import { getDefaultTheme } from "@/lib/theme/serializer";
import ThemePreview from "@/components/admin/theme-preview";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ThemeRecord {
  id: string;
  name: string;
  lightConfig: string;
  darkConfig: string;
  isDefault: boolean;
}

type Variant = "light" | "dark";

// ---------------------------------------------------------------------------
// Editor field components
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
    <label className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-8 cursor-pointer rounded border border-gray-300 p-0"
      />
      <span className="text-xs text-gray-700">{label}</span>
      <span className="ml-auto text-xs text-gray-400 font-mono">{value}</span>
    </label>
  );
}

const FONT_OPTIONS = [
  "'Inter', system-ui, sans-serif",
  "'Georgia', serif",
  "'Courier New', monospace",
  "'Arial', sans-serif",
  "'Verdana', sans-serif",
  "'Times New Roman', serif",
  "'Trebuchet MS', sans-serif",
];

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
      <span className="text-xs text-gray-700">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
      >
        {FONT_OPTIONS.map((f) => (
          <option key={f} value={f}>
            {f.split(",")[0].replace(/'/g, "")}
          </option>
        ))}
        {/* If current value is not in the list, show it too */}
        {!FONT_OPTIONS.includes(value) && (
          <option value={value}>
            {value.split(",")[0].replace(/'/g, "")}
          </option>
        )}
      </select>
    </label>
  );
}

const WEIGHT_OPTIONS = ["100", "200", "300", "400", "500", "600", "700", "800", "900"];

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
      <span className="text-xs text-gray-700">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
      >
        {WEIGHT_OPTIONS.map((w) => (
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const numericValue = parseInt(value, 10) || 16;
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-gray-700">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={8}
          max={72}
          value={numericValue}
          onChange={(e) => onChange(`${e.target.value}px`)}
          className="w-16 rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
        <span className="text-xs text-gray-400">px</span>
      </div>
    </label>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold text-gray-900">{title}</legend>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function TextField({
  label,
  value,
  onChange,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-gray-700">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        className="rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
      />
    </label>
  );
}

// ---------------------------------------------------------------------------
// Color editor section
// ---------------------------------------------------------------------------

function ColorsEditor({
  colors,
  onChange,
}: {
  colors: ThemeColors;
  onChange: (colors: ThemeColors) => void;
}) {
  const set = (key: keyof ThemeColors, value: string) =>
    onChange({ ...colors, [key]: value });

  return (
    <Section title="Farben">
      <ColorField label="Primärfarbe" value={colors.primary} onChange={(v) => set("primary", v)} />
      <ColorField label="Akzentfarbe" value={colors.accent ?? colors.primary} onChange={(v) => set("accent", v)} />
      <ColorField label="Seitenhintergrund" value={colors.pageBg} onChange={(v) => set("pageBg", v)} />
      <ColorField label="Card-Hintergrund" value={colors.cardBg} onChange={(v) => set("cardBg", v)} />
      <ColorField label="Rahmenfarbe" value={colors.border} onChange={(v) => set("border", v)} />
      <ColorField label="Tab aktiv" value={colors.tabActiveBg} onChange={(v) => set("tabActiveBg", v)} />
      <ColorField label="Tab inaktiv" value={colors.tabInactiveBg} onChange={(v) => set("tabInactiveBg", v)} />
      <ColorField label="Steuerelemente" value={colors.controlBg} onChange={(v) => set("controlBg", v)} />
      <ColorField label="Erfolg" value={colors.success} onChange={(v) => set("success", v)} />
      <ColorField label="Warnung" value={colors.warning} onChange={(v) => set("warning", v)} />
      <ColorField label="Fehler" value={colors.error} onChange={(v) => set("error", v)} />
      <ColorField label="Primär-Button" value={colors.primaryButton} onChange={(v) => set("primaryButton", v)} />
      <ColorField label="Sekundär-Button" value={colors.secondaryButton} onChange={(v) => set("secondaryButton", v)} />
      <ColorField label="Neuer-Song-Button" value={colors.newSongButton} onChange={(v) => set("newSongButton", v)} />
      <ColorField label="Übersetzungs-Toggle" value={colors.translationToggle} onChange={(v) => set("translationToggle", v)} />
      <ColorField label="Info" value={colors.info} onChange={(v) => set("info", v)} />
      <ColorField label="Neutral" value={colors.neutral} onChange={(v) => set("neutral", v)} />
      <ColorField label="Überschrift-Text" value={colors.headlineColor ?? "#111827"} onChange={(v) => set("headlineColor", v)} />
      <ColorField label="Fließtext" value={colors.copyColor ?? "#374151"} onChange={(v) => set("copyColor", v)} />
      <ColorField label="Label-Text" value={colors.labelColor ?? "#4b5563"} onChange={(v) => set("labelColor", v)} />
      <ColorField label="Link-Text" value={colors.linkColor ?? "#7c3aed"} onChange={(v) => set("linkColor", v)} />
      <ColorField label="Gedämpfter Text" value={colors.mutedColor ?? "#6b7280"} onChange={(v) => set("mutedColor", v)} />
      <ColorField label="Button-Text" value={colors.buttonTextColor ?? "#ffffff"} onChange={(v) => set("buttonTextColor", v)} />
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Typography editor section
// ---------------------------------------------------------------------------

function TypographyEditor({
  typography,
  onChange,
}: {
  typography: ThemeTypography;
  onChange: (t: ThemeTypography) => void;
}) {
  const set = (key: keyof ThemeTypography, value: string) =>
    onChange({ ...typography, [key]: value });

  return (
    <Section title="Typografie">
      <FontSelect label="Überschrift-Schrift" value={typography.headlineFont} onChange={(v) => set("headlineFont", v)} />
      <WeightSelect label="Überschrift-Gewicht" value={typography.headlineWeight} onChange={(v) => set("headlineWeight", v)} />
      <FontSelect label="Fließtext-Schrift" value={typography.copyFont} onChange={(v) => set("copyFont", v)} />
      <WeightSelect label="Fließtext-Gewicht" value={typography.copyWeight} onChange={(v) => set("copyWeight", v)} />
      <FontSelect label="Label-Schrift" value={typography.labelFont} onChange={(v) => set("labelFont", v)} />
      <WeightSelect label="Label-Gewicht" value={typography.labelWeight} onChange={(v) => set("labelWeight", v)} />
      <FontSelect label="Song-Zeile-Schrift" value={typography.songLineFont} onChange={(v) => set("songLineFont", v)} />
      <WeightSelect label="Song-Zeile-Gewicht" value={typography.songLineWeight} onChange={(v) => set("songLineWeight", v)} />
      <SizeField label="Song-Zeile-Größe" value={typography.songLineSize} onChange={(v) => set("songLineSize", v)} />
      <FontSelect label="Übersetzung-Schrift" value={typography.translationLineFont} onChange={(v) => set("translationLineFont", v)} />
      <WeightSelect label="Übersetzung-Gewicht" value={typography.translationLineWeight} onChange={(v) => set("translationLineWeight", v)} />
      <SizeField label="Übersetzung-Größe" value={typography.translationLineSize} onChange={(v) => set("translationLineSize", v)} />
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Karaoke editor section
// ---------------------------------------------------------------------------

function KaraokeEditor({
  karaoke,
  onChange,
}: {
  karaoke: KaraokeTheme;
  onChange: (k: KaraokeTheme) => void;
}) {
  const set = (key: keyof KaraokeTheme, value: string) =>
    onChange({ ...karaoke, [key]: value });

  return (
    <Section title="Karaoke">
      <ColorField label="Aktive Zeile" value={karaoke.activeLineColor} onChange={(v) => set("activeLineColor", v)} />
      <ColorField label="Gelesene Zeile" value={karaoke.readLineColor} onChange={(v) => set("readLineColor", v)} />
      <ColorField label="Ungelesene Zeile" value={karaoke.unreadLineColor} onChange={(v) => set("unreadLineColor", v)} />
      <SizeField label="Aktive Größe" value={karaoke.activeLineSize} onChange={(v) => set("activeLineSize", v)} />
      <SizeField label="Gelesene Größe" value={karaoke.readLineSize} onChange={(v) => set("readLineSize", v)} />
      <SizeField label="Ungelesene Größe" value={karaoke.unreadLineSize} onChange={(v) => set("unreadLineSize", v)} />
      <ColorField label="Hintergrund Von" value={karaoke.bgFrom} onChange={(v) => set("bgFrom", v)} />
      <ColorField label="Hintergrund Über" value={karaoke.bgVia} onChange={(v) => set("bgVia", v)} />
      <ColorField label="Hintergrund Bis" value={karaoke.bgTo} onChange={(v) => set("bgTo", v)} />
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function ThemeEditPage() {
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [themeName, setThemeName] = useState("");

  // Both variants stored independently
  const [lightConfig, setLightConfig] = useState<ThemeConfig>(getDefaultTheme());
  const [darkConfig, setDarkConfig] = useState<ThemeConfig>(getDefaultTheme());

  // Currently selected variant for editing
  const [activeVariant, setActiveVariant] = useState<Variant>("light");

  // Track unsaved changes
  const [dirty, setDirty] = useState(false);
  const savedLightRef = useRef<string>("");
  const savedDarkRef = useRef<string>("");

  // ---- Fetch theme ----
  const fetchTheme = useCallback(async () => {
    try {
      const res = await fetch(`/api/settings/themes/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError("Theme nicht gefunden.");
          setLoading(false);
          return;
        }
        throw new Error("Fehler beim Laden");
      }
      const data: ThemeRecord = await res.json();
      setThemeName(data.name);

      const light: ThemeConfig = JSON.parse(data.lightConfig);
      const dark: ThemeConfig = JSON.parse(data.darkConfig);
      setLightConfig(light);
      setDarkConfig(dark);

      savedLightRef.current = JSON.stringify(light);
      savedDarkRef.current = JSON.stringify(dark);
      setDirty(false);
      setError(null);
    } catch {
      setError("Theme konnte nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTheme();
  }, [fetchTheme]);

  // ---- Track dirty state ----
  useEffect(() => {
    const currentLight = JSON.stringify(lightConfig);
    const currentDark = JSON.stringify(darkConfig);
    setDirty(
      currentLight !== savedLightRef.current ||
      currentDark !== savedDarkRef.current
    );
  }, [lightConfig, darkConfig]);

  // ---- Warn on leave with unsaved changes ----
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // ---- Active config helpers ----
  const activeConfig = activeVariant === "light" ? lightConfig : darkConfig;
  const setActiveConfig = activeVariant === "light" ? setLightConfig : setDarkConfig;

  function updateColors(colors: ThemeColors) {
    setActiveConfig((prev) => ({ ...prev, colors }));
  }

  function updateTypography(typography: ThemeTypography) {
    setActiveConfig((prev) => ({ ...prev, typography }));
  }

  function updateKaraoke(karaoke: KaraokeTheme) {
    setActiveConfig((prev) => ({ ...prev, karaoke }));
  }

  function updateAppName(appName: string) {
    setActiveConfig((prev) => ({ ...prev, appName }));
  }

  // ---- Save ----
  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/settings/themes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lightConfig,
          darkConfig,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Fehler beim Speichern");
      }
      savedLightRef.current = JSON.stringify(lightConfig);
      savedDarkRef.current = JSON.stringify(darkConfig);
      setDirty(false);
      setSuccess("Theme wurde gespeichert.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  }

  // ---- Render ----

  if (loading) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Theme bearbeiten</h1>
        <p className="text-sm text-gray-500">Lade Theme...</p>
      </div>
    );
  }

  if (error && !themeName) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Theme bearbeiten</h1>
        <p className="mb-4 text-sm text-red-600">{error}</p>
        <Link
          href="/admin/theming"
          className="text-sm text-purple-600 hover:text-purple-700"
        >
          ← Zurück zur Übersicht
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/theming"
            className="text-sm text-purple-600 hover:text-purple-700"
          >
            ← Zurück
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{themeName}</h1>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !dirty}
          className="rounded bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Speichert..." : "Speichern"}
        </button>
      </div>

      {/* Messages */}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}
      {dirty && (
        <p className="text-xs text-amber-600">Ungespeicherte Änderungen vorhanden.</p>
      )}

      {/* Light/Dark toggle */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-700">Variante:</span>
        <div className="inline-flex rounded-md border border-gray-300">
          <button
            type="button"
            onClick={() => setActiveVariant("light")}
            className={`px-4 py-1.5 text-xs font-medium rounded-l-md ${
              activeVariant === "light"
                ? "bg-purple-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            Light
          </button>
          <button
            type="button"
            onClick={() => setActiveVariant("dark")}
            className={`px-4 py-1.5 text-xs font-medium rounded-r-md ${
              activeVariant === "dark"
                ? "bg-purple-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            Dark
          </button>
        </div>
      </div>

      {/* Editor + Preview layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Editor */}
        <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm overflow-auto max-h-[80vh]">
          <Section title="Allgemein">
            <TextField
              label="App-Name"
              value={activeConfig.appName}
              onChange={updateAppName}
              maxLength={50}
            />
          </Section>

          <ColorsEditor colors={activeConfig.colors} onChange={updateColors} />
          <TypographyEditor typography={activeConfig.typography} onChange={updateTypography} />
          <KaraokeEditor karaoke={activeConfig.karaoke} onChange={updateKaraoke} />
        </div>

        {/* Live preview */}
        <div className="sticky top-4 self-start">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">
            Vorschau ({activeVariant === "light" ? "Light" : "Dark"})
          </h2>
          <ThemePreview themeConfig={activeConfig} />
        </div>
      </div>
    </div>
  );
}
