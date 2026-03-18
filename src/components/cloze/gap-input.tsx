"use client";

import { useCallback } from "react";
import { generateHint } from "@/lib/cloze/hint";

interface GapInputProps {
  gapId: string;
  targetWord: string;
  value: string;
  feedback: "correct" | "incorrect" | null;
  hintActive: boolean;
  ariaLabel: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}

export function GapInput({
  gapId,
  targetWord,
  value,
  feedback,
  hintActive,
  ariaLabel,
  onChange,
  onBlur,
}: GapInputProps) {
  const isCorrect = feedback === "correct";
  const isIncorrect = feedback === "incorrect";

  const placeholder = hintActive ? generateHint(targetWord) : "···";

  // Compute dynamic width: at least 60px, grows with input
  const size = Math.max(value.length, placeholder.length, 4);

  const borderColor = isCorrect
    ? "border-success-500"
    : isIncorrect
      ? "border-error-500"
      : "border-primary-500";

  const textColor = isCorrect
    ? "text-success-600"
    : isIncorrect
      ? "text-error-600"
      : "text-neutral-900";

  const feedbackText = isCorrect ? "Richtig" : isIncorrect ? "Falsch" : "";

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === " ") {
        e.preventDefault();
        const allGapInputs = Array.from(
          document.querySelectorAll<HTMLInputElement>('input[id^="gap-"]')
        );
        const currentIndex = allGapInputs.findIndex(
          (el) => el.id === `gap-${gapId}`
        );
        const nextInput = allGapInputs[currentIndex + 1];
        if (nextInput) {
          nextInput.focus();
        }
      }
    },
    [gapId]
  );

  return (
    <span className="inline-flex items-center align-baseline">
      <input
        id={`gap-${gapId}`}
        type="text"
        value={value}
        placeholder={placeholder}
        readOnly={isCorrect}
        aria-label={ariaLabel}
        size={size}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onKeyDown={handleKeyDown}
        className={[
          "border-0 border-b-2 bg-transparent outline-none",
          "min-w-[60px] min-h-[44px]",
          "text-center text-base leading-normal",
          "px-1",
          borderColor,
          textColor,
        ].join(" ")}
        autoComplete="off"
        spellCheck={false}
      />
      {feedback && (
        <span aria-live="polite" className="sr-only">
          {feedbackText}
        </span>
      )}
    </span>
  );
}
