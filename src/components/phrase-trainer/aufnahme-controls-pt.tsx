"use client";

import type { PhrasenTrainerZustand } from "@/types/phrase-trainer";

interface AufnahmeControlsPTProps {
  zustand: PhrasenTrainerZustand;
  onStart: () => void;
  onStop: () => void;
  onAbbrechen: () => void;
  disabled?: boolean;
}

/**
 * Aufnahme-Steuerung für den Phrasen-Trainer.
 *
 * Zeigt kontextabhängige Buttons basierend auf dem aktuellen Zustand:
 * - BEREIT: "Aufnahme starten"-Button
 * - AUFNAHME: "Aufnahme stoppen"- und "Abbrechen"-Buttons
 * - AUSWAHL / WIEDERGABE: keine Anzeige (wird von anderen Komponenten gesteuert)
 */
export function AufnahmeControlsPT({
  zustand,
  onStart,
  onStop,
  onAbbrechen,
  disabled = false,
}: AufnahmeControlsPTProps) {
  if (zustand === "BEREIT") {
    return (
      <div className="flex items-center gap-3" role="group" aria-label="Aufnahme-Steuerung">
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
      <div className="flex items-center gap-3" role="group" aria-label="Aufnahme-Steuerung">
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

  // AUSWAHL and WIEDERGABE — no recording controls shown
  return null;
}
