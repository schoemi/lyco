"use client";

/**
 * StageEinstellungsDialog-Komponente
 *
 * Erweitert den bestehenden EinstellungsDialog um Stage-spezifische Einstellungen:
 * - Schriftgrößen-Auswahl (5 Stufen: 32, 40, 48, 56, 72)
 * - DisplayMode-Auswahl (einzelzeile, strophe, song)
 * - Scroll-Geschwindigkeit (1–10)
 * - Highlighting an/aus
 * - Highlighting-Schwellwerte (low: 0–100, high: 0–100)
 *
 * Änderungen werden sofort via onSettingsChange angewendet und via saveStageSettings() persistiert.
 *
 * Anforderungen: 12.1, 12.2, 12.3, 12.4
 */

import { useEffect, useRef, useCallback } from "react";
import { saveStageSettings } from "@/lib/stage/storage";
import { VALID_FONT_SIZES } from "@/types/stage";
import type { StageSettings } from "@/types/stage";
import type { DisplayMode } from "@/types/karaoke";

export interface StageEinstellungsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StageSettings;
  onSettingsChange: (settings: Partial<StageSettings>) => void;
}

const DISPLAY_MODES: { value: DisplayMode; label: string }[] = [
  { value: "einzelzeile", label: "Einzelzeile" },
  { value: "strophe", label: "Strophe" },
  { value: "song", label: "Song" },
];

export function StageEinstellungsDialog({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
}: StageEinstellungsDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown]);

  function applyChange(partial: Partial<StageSettings>) {
    const updated = { ...settings, ...partial };
    onSettingsChange(partial);
    saveStageSettings(updated);
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Stage-Einstellungen"
        className="fixed left-1/2 top-1/2 z-50 w-80 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-neutral-900 p-6 shadow-2xl overflow-y-auto max-h-[90vh]"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Stage-Einstellungen</h2>
          <button
            onClick={onClose}
            aria-label="Dialog schließen"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Schriftgröße (Req 12.3, 6.3) */}
        <div className="mb-5">
          <label
            htmlFor="stage-font-size"
            className="mb-2 block text-sm text-white/70"
          >
            Schriftgröße
          </label>
          <select
            id="stage-font-size"
            value={settings.fontSize}
            onChange={(e) => applyChange({ fontSize: Number(e.target.value) })}
            aria-label="Schriftgröße auswählen"
            className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            {VALID_FONT_SIZES.map((size) => (
              <option key={size} value={size} className="bg-neutral-900 text-white">
                {size}px
              </option>
            ))}
          </select>
        </div>

        {/* DisplayMode (Req 6.2) */}
        <div className="mb-5">
          <label
            htmlFor="stage-display-mode"
            className="mb-2 block text-sm text-white/70"
          >
            Anzeigemodus
          </label>
          <select
            id="stage-display-mode"
            value={settings.displayMode}
            onChange={(e) =>
              applyChange({ displayMode: e.target.value as DisplayMode })
            }
            aria-label="Anzeigemodus auswählen"
            className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            {DISPLAY_MODES.map(({ value, label }) => (
              <option key={value} value={value} className="bg-neutral-900 text-white">
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Scroll-Geschwindigkeit (Req 7.4) */}
        <div className="mb-5">
          <label className="mb-2 block text-sm text-white/70">
            Scroll-Geschwindigkeit
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={settings.scrollSpeed}
              onChange={(e) =>
                applyChange({ scrollSpeed: Number(e.target.value) })
              }
              aria-label="Scroll-Geschwindigkeit in Sekunden"
              aria-valuemin={1}
              aria-valuemax={10}
              aria-valuenow={settings.scrollSpeed}
              className="flex-1 cursor-pointer accent-white"
            />
            <span className="min-w-[2.5rem] text-right text-sm font-medium text-white">
              {settings.scrollSpeed}s
            </span>
          </div>
        </div>

        {/* Highlighting an/aus (Req 8.6) */}
        <div className="mb-5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="stage-highlighting-toggle"
              className="text-sm text-white/70"
            >
              Lernfortschritt-Highlighting
            </label>
            <button
              id="stage-highlighting-toggle"
              role="switch"
              aria-checked={settings.highlightingEnabled}
              aria-label="Lernfortschritt-Highlighting umschalten"
              onClick={() =>
                applyChange({ highlightingEnabled: !settings.highlightingEnabled })
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 ${
                settings.highlightingEnabled ? "bg-amber-500" : "bg-white/20"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.highlightingEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Highlighting-Schwellwerte (Req 8.7) */}
        {settings.highlightingEnabled && (
          <div className="mb-2">
            <div className="mb-3">
              <label className="mb-2 block text-sm text-white/70">
                Schwellwert niedrig (Amber)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={settings.highlightThresholdLow}
                  onChange={(e) =>
                    applyChange({
                      highlightThresholdLow: Number(e.target.value),
                    })
                  }
                  aria-label="Schwellwert niedrig in Prozent"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={settings.highlightThresholdLow}
                  className="flex-1 cursor-pointer accent-amber-500"
                />
                <span className="min-w-[2.5rem] text-right text-sm font-medium text-white">
                  {settings.highlightThresholdLow}%
                </span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/70">
                Schwellwert hoch (Weiß)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={settings.highlightThresholdHigh}
                  onChange={(e) =>
                    applyChange({
                      highlightThresholdHigh: Number(e.target.value),
                    })
                  }
                  aria-label="Schwellwert hoch in Prozent"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={settings.highlightThresholdHigh}
                  className="flex-1 cursor-pointer accent-white"
                />
                <span className="min-w-[2.5rem] text-right text-sm font-medium text-white">
                  {settings.highlightThresholdHigh}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
