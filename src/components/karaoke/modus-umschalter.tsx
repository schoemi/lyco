"use client";

import type { DisplayMode } from "@/types/karaoke";

interface ModusUmschalterProps {
  activeMode: DisplayMode;
  onChange: (mode: DisplayMode) => void;
}

const MODE_OPTIONS: { value: DisplayMode; label: string }[] = [
  { value: "einzelzeile", label: "Einzelzeile" },
  { value: "strophe", label: "Strophe" },
  { value: "song", label: "Song" },
];

export function ModusUmschalter({ activeMode, onChange }: ModusUmschalterProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Darstellungsmodus"
      className="inline-flex rounded-full bg-white/10 p-1"
    >
      {MODE_OPTIONS.map(({ value, label }) => {
        const isActive = value === activeMode;
        return (
          <button
            key={value}
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(value)}
            className={`min-h-[44px] min-w-[44px] rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 ${
              isActive
                ? "bg-white text-gray-900 shadow-sm"
                : "text-white/80 hover:text-white"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
