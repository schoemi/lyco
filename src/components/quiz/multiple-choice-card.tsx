"use client";

import { useState } from "react";
import type { MCQuestion } from "@/types/quiz";

interface MultipleChoiceCardProps {
  question: MCQuestion;
  onAnswer: (optionIndex: number) => void;
  onWeiter: () => void;
}

export function MultipleChoiceCard({
  question,
  onAnswer,
  onWeiter,
}: MultipleChoiceCardProps) {
  const [selected, setSelected] = useState<number | null>(null);

  const handleSelect = (index: number) => {
    if (selected !== null) return;
    setSelected(index);
    onAnswer(index);
  };

  const getButtonClasses = (index: number): string => {
    const base =
      "w-full rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:cursor-not-allowed";

    if (selected === null) {
      return `${base} border-gray-200 bg-white text-gray-900 hover:border-purple-400 hover:bg-purple-50`;
    }

    if (index === question.correctIndex) {
      return `${base} border-green-500 bg-green-50 text-green-800`;
    }

    if (index === selected && selected !== question.correctIndex) {
      return `${base} border-red-500 bg-red-50 text-red-800`;
    }

    return `${base} border-gray-200 bg-gray-50 text-gray-400`;
  };

  const feedbackText =
    selected !== null
      ? selected === question.correctIndex
        ? "Richtig!"
        : "Falsch! Die richtige Antwort ist markiert."
      : null;

  return (
    <div className="flex flex-col gap-4">
      {question.contextHint && (
        <p className="text-xs text-gray-400 italic">{question.contextHint}</p>
      )}
      <p className="text-[14px] text-gray-900">{question.prompt}</p>

      <div role="radiogroup" aria-label="Antwortoptionen" className="flex flex-col gap-2">
        {question.options.map((option, index) => (
          <button
            key={index}
            type="button"
            role="radio"
            aria-checked={selected === index}
            disabled={selected !== null}
            onClick={() => handleSelect(index)}
            className={getButtonClasses(index)}
          >
            {option}
          </button>
        ))}
      </div>

      <div aria-live="polite" className="min-h-[24px]">
        {feedbackText && (
          <p
            className={`text-sm font-medium ${
              selected === question.correctIndex
                ? "text-green-700"
                : "text-red-700"
            }`}
          >
            {feedbackText}
          </p>
        )}
      </div>

      {selected !== null && (
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
