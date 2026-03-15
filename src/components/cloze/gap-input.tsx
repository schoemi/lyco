"use client";

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
    ? "border-green-500"
    : isIncorrect
      ? "border-red-500"
      : "border-purple-500";

  const textColor = isCorrect
    ? "text-green-600"
    : isIncorrect
      ? "text-red-600"
      : "text-gray-900";

  const feedbackText = isCorrect ? "Richtig" : isIncorrect ? "Falsch" : "";

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
