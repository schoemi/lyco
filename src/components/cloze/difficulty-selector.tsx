"use client";

import type { DifficultyLevel } from "@/types/cloze";

interface DifficultySelectorProps {
  active: DifficultyLevel;
  onChange: (level: DifficultyLevel) => void;
}

const LEVELS: { value: DifficultyLevel; label: string }[] = [
  { value: "leicht", label: "Leicht" },
  { value: "mittel", label: "Mittel" },
  { value: "schwer", label: "Schwer" },
  { value: "blind", label: "Blind" },
];

export function DifficultySelector({ active, onChange }: DifficultySelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Schwierigkeitsstufe"
      className="grid grid-cols-2 gap-2 sm:grid-cols-4"
    >
      {LEVELS.map(({ value, label }) => {
        const isActive = active === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(value)}
            className={[
              "rounded-md px-4 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-purple-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200",
            ].join(" ")}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
