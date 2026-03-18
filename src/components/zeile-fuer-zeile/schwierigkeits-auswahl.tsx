"use client";

import {
  Schwierigkeitsstufe,
  SCHWIERIGKEITS_STUFEN,
  SCHWIERIGKEITS_LABELS,
} from "@/lib/zeile-fuer-zeile/hint";

interface SchwierigkeitsAuswahlProps {
  value: Schwierigkeitsstufe;
  onChange: (stufe: Schwierigkeitsstufe) => void;
}

export function SchwierigkeitsAuswahl({
  value,
  onChange,
}: SchwierigkeitsAuswahlProps) {
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex: number | null = null;

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      nextIndex = (index + 1) % SCHWIERIGKEITS_STUFEN.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      nextIndex =
        (index - 1 + SCHWIERIGKEITS_STUFEN.length) %
        SCHWIERIGKEITS_STUFEN.length;
    }

    if (nextIndex !== null) {
      onChange(SCHWIERIGKEITS_STUFEN[nextIndex]);
      // Move focus to the newly selected radio button
      const container = e.currentTarget.parentElement;
      const buttons = container?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
      buttons?.[nextIndex]?.focus();
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="Schwierigkeitsstufe auswählen"
      className="flex w-full rounded-lg border border-neutral-300 overflow-hidden"
    >
      {SCHWIERIGKEITS_STUFEN.map((stufe, index) => {
        const isActive = stufe === value;
        return (
          <button
            key={stufe}
            type="button"
            role="radio"
            aria-checked={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(stufe)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`min-h-[44px] min-w-[44px] flex-1 px-2 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:z-10 ${
              isActive
                ? "bg-primary-600 text-white"
                : "bg-white text-neutral-700 hover:bg-neutral-100"
            }`}
          >
            {SCHWIERIGKEITS_LABELS[stufe]}
          </button>
        );
      })}
    </div>
  );
}
