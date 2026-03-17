"use client";

import { useState } from "react";
import type { DiktatQuestion, DiffSegment } from "@/types/quiz";
import { validateDiktat } from "@/lib/quiz/validate-answer";

interface DiktatCardProps {
  question: DiktatQuestion;
  onSubmit: (text: string) => void;
  onWeiter: () => void;
}

export function DiktatCard({ question, onSubmit, onWeiter }: DiktatCardProps) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<{
    correct: boolean;
    diff: DiffSegment[];
  } | null>(null);

  const handleSubmit = () => {
    const validation = validateDiktat(input, question.originalText);
    setResult(validation);
    onSubmit(input);
  };

  const getDiffClasses = (segment: DiffSegment): string => {
    switch (segment.type) {
      case "correct":
        return "text-green-700 bg-green-50";
      case "incorrect":
        return "text-red-700 bg-red-50";
      case "missing":
        return "text-red-700 bg-red-50 line-through";
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[14px] text-gray-700">
        Schreibe die Zeile aus{" "}
        <span className="font-semibold">{question.stropheName}</span> aus dem
        Gedächtnis:
      </p>

      {!result && (
        <>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label="Zeile aus dem Gedächtnis eingeben"
            className="w-full min-h-[120px] rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            placeholder="Tippe die Zeile hier ein…"
          />
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full rounded-lg bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          >
            Abgeben
          </button>
        </>
      )}

      <div aria-live="polite" className="min-h-[24px]">
        {result && (
          <div className="flex flex-col gap-3">
            <p
              className={`text-sm font-medium ${
                result.correct ? "text-green-700" : "text-red-700"
              }`}
            >
              {result.correct ? "Richtig!" : "Nicht ganz richtig."}
            </p>

            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">
                Dein Vergleich:
              </p>
              <p className="text-sm leading-relaxed">
                {result.diff.map((segment, i) => (
                  <span key={i} className={`rounded px-1 ${getDiffClasses(segment)}`}>
                    {segment.text}
                  </span>
                ))}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">
                Original:
              </p>
              <p className="text-sm text-gray-900">{question.originalText}</p>
            </div>
          </div>
        )}
      </div>

      {result && (
        <button
          type="button"
          onClick={onWeiter}
          className="w-full rounded-lg bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        >
          Weiter
        </button>
      )}
    </div>
  );
}
