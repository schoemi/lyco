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
      "w-full rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed";

    if (selected === null) {
      return `${base} border-neutral-200 bg-white text-neutral-900 hover:border-primary-400 hover:bg-primary-50`;
    }

    if (index === question.correctIndex) {
      return `${base} border-success-500 bg-success-50 text-success-800`;
    }

    if (index === selected && selected !== question.correctIndex) {
      return `${base} border-error-500 bg-error-50 text-error-800`;
    }

    return `${base} border-neutral-200 bg-neutral-50 text-neutral-400`;
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
        <p className="text-xs text-neutral-400 italic">{question.contextHint}</p>
      )}
      <p className="text-[14px] text-neutral-900">{question.prompt}</p>

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
                ? "text-success-700"
                : "text-error-700"
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
          className="w-full rounded-lg bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          Weiter
        </button>
      )}
    </div>
  );
}
