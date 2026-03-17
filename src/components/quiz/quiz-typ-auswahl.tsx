"use client";

import type { QuizTyp } from "@/types/quiz";

interface QuizTypAuswahlProps {
  onSelect: (typ: QuizTyp) => void;
}

const quizTypen: { typ: QuizTyp; name: string; beschreibung: string }[] = [
  {
    typ: "multiple-choice",
    name: "Multiple Choice",
    beschreibung: "Wähle die richtige Antwort aus vier Optionen",
  },
  {
    typ: "reihenfolge",
    name: "Reihenfolge",
    beschreibung: "Bringe die Zeilen in die richtige Reihenfolge",
  },
  {
    typ: "diktat",
    name: "Diktat",
    beschreibung: "Schreibe die Zeile aus dem Gedächtnis",
  },
];

export function QuizTypAuswahl({ onSelect }: QuizTypAuswahlProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {quizTypen.map(({ typ, name, beschreibung }) => (
        <button
          key={typ}
          type="button"
          onClick={() => onSelect(typ)}
          className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm transition-colors hover:border-purple-400 hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        >
          <span className="text-lg font-semibold text-gray-900">{name}</span>
          <span className="text-sm text-gray-600">{beschreibung}</span>
        </button>
      ))}
    </div>
  );
}
