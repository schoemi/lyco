"use client";

import type { AnalyseErgebnis } from "@/types/vocal-trainer";
import { VergleichsGraph } from "@/components/vocal-trainer/vergleichs-graph";

interface FeedbackAnsichtProps {
  ergebnis: AnalyseErgebnis;
  onNeueAufnahme: () => void;
  onZurueck: () => void;
}

export function FeedbackAnsicht({
  ergebnis,
  onNeueAufnahme,
  onZurueck,
}: FeedbackAnsichtProps) {
  const { pitchScore, timingScore, gesamtScore, referenzKurve, nutzerKurve } =
    ergebnis;

  return (
    <div className="flex flex-col gap-6">
      {/* Gesamt-Score – prominent */}
      <div className="text-center">
        <p className="text-sm font-medium text-neutral-500">Gesamt-Score</p>
        <p
          className="text-5xl font-bold text-neutral-900"
          aria-label={`Gesamt-Score: ${Math.round(gesamtScore)} Prozent`}
        >
          {Math.round(gesamtScore)}%
        </p>
      </div>

      {/* Pitch-Score und Timing-Score */}
      <div className="flex justify-center gap-8">
        <div className="text-center">
          <p className="text-sm font-medium text-neutral-500">Pitch-Score</p>
          <p
            className="text-2xl font-semibold text-neutral-800"
            aria-label={`Pitch-Score: ${Math.round(pitchScore)} Prozent`}
          >
            {Math.round(pitchScore)}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-neutral-500">Timing-Score</p>
          <p
            className="text-2xl font-semibold text-neutral-800"
            aria-label={`Timing-Score: ${Math.round(timingScore)} Prozent`}
          >
            {Math.round(timingScore)}%
          </p>
        </div>
      </div>

      {/* Vergleichs-Graph */}
      <VergleichsGraph
        referenzKurve={referenzKurve}
        nutzerKurve={nutzerKurve}
      />

      {/* Buttons */}
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={onNeueAufnahme}
          className="min-h-[44px] min-w-[44px] rounded bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Neue Aufnahme
        </button>
        <button
          type="button"
          onClick={onZurueck}
          className="min-h-[44px] min-w-[44px] rounded border border-neutral-300 px-5 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Zurück zur Song-Seite
        </button>
      </div>
    </div>
  );
}
