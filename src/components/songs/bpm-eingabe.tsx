"use client";

import { useState, useCallback } from "react";
import { istGueltigerBpm } from "@/lib/beat-detection/bpm-validierung";

interface BpmEingabeProps {
  onBpmBestaetigt: (bpm: number) => void;
  initialBpm?: number | null;
}

/**
 * BPM-Eingabe-Komponente.
 * Numerisches Eingabefeld für BPM-Wert.
 * Validierung: Ganzzahl im Bereich [20, 300].
 * Fehlermeldung bei ungültigen Werten.
 * Bestätigungs-Button.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
export default function BpmEingabe({
  onBpmBestaetigt,
  initialBpm,
}: BpmEingabeProps) {
  const [inputValue, setInputValue] = useState(
    initialBpm != null ? String(initialBpm) : "",
  );
  const [error, setError] = useState<string | null>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
      if (error) setError(null);
    },
    [error],
  );

  const handleBestaetigen = useCallback(() => {
    const trimmed = inputValue.trim();

    if (trimmed === "") {
      setError("Bitte einen BPM-Wert eingeben");
      return;
    }

    const parsed = Number(trimmed);

    if (!istGueltigerBpm(parsed)) {
      setError("BPM muss eine Ganzzahl zwischen 20 und 300 sein");
      return;
    }

    setError(null);
    onBpmBestaetigt(parsed);
  }, [inputValue, onBpmBestaetigt]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleBestaetigen();
      }
    },
    [handleBestaetigen],
  );

  return (
    <div className="space-y-2">
      <label
        htmlFor="bpm-eingabe"
        className="text-sm font-medium text-neutral-700"
      >
        BPM-Wert
      </label>
      <div className="flex items-center gap-2">
        <input
          id="bpm-eingabe"
          type="number"
          min={20}
          max={300}
          step={1}
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="z.B. 120"
          aria-invalid={error !== null}
          aria-describedby={error ? "bpm-eingabe-error" : undefined}
          className={`w-24 rounded-md border px-2 py-1.5 text-sm tabular-nums shadow-sm focus:outline-none focus:ring-2 focus:ring-newsong-500 ${
            error ? "border-error-500" : "border-neutral-300"
          }`}
        />
        <button
          type="button"
          onClick={handleBestaetigen}
          className="rounded-md bg-newsong-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-newsong-700"
        >
          Bestätigen
        </button>
      </div>
      {error && (
        <p
          id="bpm-eingabe-error"
          className="text-xs text-error-600"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
