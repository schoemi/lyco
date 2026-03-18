"use client";

import { useEffect, useState, useCallback } from "react";

interface ThemeOption {
  id: string;
  name: string;
  isDefault: boolean;
  lightConfig: string; // JSON string of ThemeConfig
}

interface ThemeSelectorProps {
  selectedThemeId: string | null;
  themeVariant: string | null;
  onThemeSelected?: () => void;
}

/** Extracts key colors from a lightConfig JSON string for the palette preview. */
function extractPreviewColors(lightConfigJson: string): string[] {
  try {
    const config = JSON.parse(lightConfigJson);
    const colors = config.colors ?? {};
    return [
      colors.primary,
      colors.pageBg,
      colors.cardBg,
      colors.success,
      colors.warning,
      colors.error,
    ].filter((c): c is string => typeof c === "string");
  } catch {
    return [];
  }
}

export default function ThemeSelector({
  selectedThemeId,
  themeVariant,
  onThemeSelected,
}: ThemeSelectorProps) {
  const [themes, setThemes] = useState<ThemeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(selectedThemeId);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchThemes() {
      try {
        const res = await fetch("/api/themes");
        if (!res.ok) return;
        const data: ThemeOption[] = await res.json();
        setThemes(data);
      } catch {
        // silently ignore
      } finally {
        setLoading(false);
      }
    }
    fetchThemes();
  }, []);

  const selectTheme = useCallback(
    async (themeId: string) => {
      if (saving) return;
      setSaving(themeId);
      setError(null);

      try {
        const res = await fetch("/api/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selectedThemeId: themeId,
            themeVariant: themeVariant ?? "light",
          }),
        });

        if (!res.ok) {
          const json = await res.json();
          setError(json.error ?? "Fehler beim Speichern");
          return;
        }

        setActiveId(themeId);

        // Trigger theme re-application
        window.dispatchEvent(new CustomEvent("theme-variant-changed"));
        onThemeSelected?.();
      } catch {
        setError("Ein unerwarteter Fehler ist aufgetreten.");
      } finally {
        setSaving(null);
      }
    },
    [saving, themeVariant, onThemeSelected]
  );

  if (loading) {
    return (
      <div className="text-sm text-neutral-500">Themes werden geladen…</div>
    );
  }

  if (themes.length === 0) return null;

  return (
    <div>
      {error && (
        <div className="mb-3 rounded-lg border border-error-200 bg-error-50 px-4 py-2 text-sm text-error-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {themes.map((theme) => {
          const colors = extractPreviewColors(theme.lightConfig);
          const isActive = activeId === theme.id;
          const isSaving = saving === theme.id;

          return (
            <button
              key={theme.id}
              type="button"
              disabled={!!saving}
              onClick={() => selectTheme(theme.id)}
              className={`relative flex flex-col gap-2 rounded-lg border-2 p-3 text-left transition-colors ${
                isActive
                  ? "border-newsong-500 bg-newsong-50"
                  : "border-neutral-200 bg-white hover:border-neutral-300"
              } ${saving ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
              aria-pressed={isActive}
              aria-label={`Theme ${theme.name}${theme.isDefault ? " (Standard)" : ""}${isActive ? " – ausgewählt" : ""}`}
            >
              {/* Color swatches */}
              <div className="flex gap-1">
                {colors.map((color, i) => (
                  <span
                    key={i}
                    className="inline-block h-5 w-5 rounded-sm border border-neutral-200"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                  />
                ))}
              </div>

              {/* Name + badge */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-neutral-900">
                  {theme.name}
                </span>
                {theme.isDefault && (
                  <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500">
                    Standard
                  </span>
                )}
              </div>

              {/* Active indicator */}
              {isActive && (
                <span className="absolute right-2 top-2 text-newsong-600">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              )}

              {isSaving && (
                <span className="absolute right-2 top-2 text-xs text-neutral-400">
                  Speichert…
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
