"use client";

import { useCallback } from "react";
import { erzwingeFrequenzConstraints } from "@/lib/beat-detection/beat-utils";

interface FrequenzbereichReglerProps {
  untergrenze: number;
  obergrenze: number;
  onUntergrenzeChange: (wert: number) => void;
  onObergrenzeChange: (wert: number) => void;
}

/**
 * Frequenzbereich-Regler-Komponente.
 * Zwei Slider für Untergrenze und Obergrenze (Bereich 20–20.000 Hz).
 * Initialwerte: 60 Hz (Untergrenze), 200 Hz (Obergrenze).
 * Constraint-Logik: Untergrenze < Obergrenze erzwingen.
 * Numerische Anzeige der aktuellen Werte neben den Slidern.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */
export default function FrequenzbereichRegler({
  untergrenze,
  obergrenze,
  onUntergrenzeChange,
  onObergrenzeChange,
}: FrequenzbereichReglerProps) {
  const handleUntergrenzeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const neuerWert = Number(e.target.value);
      const korrigiert = erzwingeFrequenzConstraints(neuerWert, obergrenze);
      onUntergrenzeChange(korrigiert.untergrenze);
      if (korrigiert.obergrenze !== obergrenze) {
        onObergrenzeChange(korrigiert.obergrenze);
      }
    },
    [obergrenze, onUntergrenzeChange, onObergrenzeChange],
  );

  const handleObergrenzeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const neuerWert = Number(e.target.value);
      const korrigiert = erzwingeFrequenzConstraints(untergrenze, neuerWert);
      onObergrenzeChange(korrigiert.obergrenze);
      if (korrigiert.untergrenze !== untergrenze) {
        onUntergrenzeChange(korrigiert.untergrenze);
      }
    },
    [untergrenze, onUntergrenzeChange, onObergrenzeChange],
  );

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-neutral-700">
        Frequenzbereich (Hz)
      </p>

      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <label
            htmlFor="freq-untergrenze"
            className="w-24 text-xs text-neutral-600"
          >
            Untergrenze
          </label>
          <input
            id="freq-untergrenze"
            type="range"
            min={20}
            max={20000}
            value={untergrenze}
            onChange={handleUntergrenzeChange}
            className="flex-1"
            aria-label="Frequenz-Untergrenze"
          />
          <span className="w-16 text-right text-xs tabular-nums text-neutral-700">
            {untergrenze} Hz
          </span>
        </div>

        <div className="flex items-center gap-3">
          <label
            htmlFor="freq-obergrenze"
            className="w-24 text-xs text-neutral-600"
          >
            Obergrenze
          </label>
          <input
            id="freq-obergrenze"
            type="range"
            min={20}
            max={20000}
            value={obergrenze}
            onChange={handleObergrenzeChange}
            className="flex-1"
            aria-label="Frequenz-Obergrenze"
          />
          <span className="w-16 text-right text-xs tabular-nums text-neutral-700">
            {obergrenze} Hz
          </span>
        </div>
      </div>
    </div>
  );
}
