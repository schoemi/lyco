"use client";

import type { AufnahmeZustand } from "@/types/vocal-trainer";

interface AufnahmeControlsProps {
  zustand: AufnahmeZustand;
  onStart: () => void;
  onStop: () => void;
  onAbbrechen: () => void;
  onNeueAufnahme: () => void;
  disabled?: boolean;
}

export function AufnahmeControls({
  zustand,
  onStart,
  onStop,
  onAbbrechen,
  onNeueAufnahme,
  disabled = false,
}: AufnahmeControlsProps) {
  if (zustand === "ANALYSE") {
    return null;
  }

  if (zustand === "BEREIT") {
    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onStart}
          disabled={disabled}
          aria-label="Aufnahme starten"
          className="min-h-[44px] min-w-[44px] rounded bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Aufnahme starten
        </button>
      </div>
    );
  }

  if (zustand === "AUFNAHME") {
    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onStop}
          aria-label="Aufnahme stoppen"
          className="min-h-[44px] min-w-[44px] rounded bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Aufnahme stoppen
        </button>
        <button
          type="button"
          onClick={onAbbrechen}
          aria-label="Aufnahme abbrechen"
          className="min-h-[44px] min-w-[44px] rounded border border-neutral-300 px-5 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Abbrechen
        </button>
      </div>
    );
  }

  // ERGEBNIS
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onNeueAufnahme}
        aria-label="Neue Aufnahme starten"
        className="min-h-[44px] min-w-[44px] rounded bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700"
      >
        Neue Aufnahme starten
      </button>
    </div>
  );
}
