"use client";

import type { BeatMethode } from "@/types/beat-detection";

interface BeatAnzeigeProps {
  bpm: number;
  methode: BeatMethode;
  konfidenz: number | null;
}

/**
 * Beat-Anzeige-Komponente.
 * Zeigt BPM-Wert prominent an.
 * Konfidenz als Prozentwert (nur bei AUTOMATISCH).
 * Warnung bei Konfidenz < 50%.
 * Erkennungsmethode als Label.
 *
 * Requirements: 8.1, 8.2, 8.5, 2.4, 2.5
 */
export default function BeatAnzeige({
  bpm,
  methode,
  konfidenz,
}: BeatAnzeigeProps) {
  const istAutomatisch = methode === "AUTOMATISCH";
  const niedrigeKonfidenz = istAutomatisch && konfidenz != null && konfidenz < 50;

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 space-y-2">
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-bold tabular-nums text-neutral-900">
          {bpm} BPM
        </span>
        <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-600">
          {istAutomatisch ? "Automatisch" : "Manuell"}
        </span>
      </div>

      {istAutomatisch && konfidenz != null && (
        <p className="text-sm text-neutral-600">
          Konfidenz: {konfidenz}%
        </p>
      )}

      {niedrigeKonfidenz && (
        <div
          className="rounded-lg border border-warning-200 bg-warning-50 px-3 py-2"
          role="alert"
        >
          <p className="text-xs text-warning-700">
            ⚠ Die Erkennungssicherheit ist niedrig. Versuche den Frequenzbereich
            anzupassen oder gib den BPM-Wert manuell ein.
          </p>
        </div>
      )}
    </div>
  );
}
