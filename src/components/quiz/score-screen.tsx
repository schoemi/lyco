"use client";

import Link from "next/link";
import { getEmpfehlung } from "@/lib/quiz/score";

interface ScoreScreenProps {
  correct: number;
  total: number;
  songId: string;
  onRepeat: () => void;
}

export function ScoreScreen({ correct, total, songId, onRepeat }: ScoreScreenProps) {
  const prozent = total === 0 ? 0 : Math.round((correct / total) * 100);
  const empfehlung = getEmpfehlung(prozent);

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div aria-live="polite" className="flex flex-col items-center gap-3 text-center">
        <p className="text-3xl font-bold text-neutral-900">
          {correct} / {total} korrekt
        </p>
        <p className="text-lg text-neutral-600">
          {empfehlung === "nochmal"
            ? "Nochmal üben"
            : "Weiter zur nächsten Methode"}
        </p>
      </div>

      <div className="flex w-full flex-col gap-3">
        <button
          type="button"
          onClick={onRepeat}
          className="w-full rounded-lg bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          Quiz wiederholen
        </button>
        <Link
          href={`/songs/${songId}`}
          className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-center text-sm font-semibold text-neutral-900 transition-colors hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          Zurück zur Song-Seite
        </Link>
      </div>
    </div>
  );
}
