"use client";

import { useRouter } from "next/navigation";

interface SpacedRepetitionWidgetProps {
  faelligeAnzahl: number;
}

export function SpacedRepetitionWidget({ faelligeAnzahl }: SpacedRepetitionWidgetProps) {
  const router = useRouter();

  function handleClick() {
    router.push("/songs");
  }

  const hatFaellige = faelligeAnzahl > 0;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-live="polite"
      className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
        hatFaellige
          ? "border-blue-200 bg-blue-50 hover:bg-blue-100"
          : "border-gray-200 bg-white hover:bg-gray-50"
      }`}
    >
      <p className="text-xs text-gray-500">Spaced Repetition</p>
      {hatFaellige ? (
        <p className="text-2xl font-semibold text-gray-900">
          {faelligeAnzahl}{" "}
          <span className="text-sm font-normal text-gray-600">
            {faelligeAnzahl === 1 ? "Strophe" : "Strophen"} heute fällig
          </span>
        </p>
      ) : (
        <p className="text-sm text-gray-400">
          Keine Strophen fällig — gut gemacht!
        </p>
      )}
    </button>
  );
}
