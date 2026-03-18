"use client";

import { useRouter } from "next/navigation";

interface SpacedRepetitionWidgetProps {
  faelligeAnzahl: number;
}

export function SpacedRepetitionWidget({ faelligeAnzahl }: SpacedRepetitionWidgetProps) {
  const router = useRouter();

  function handleClick() {
    router.push("/spaced-repetition");
  }

  const hatFaellige = faelligeAnzahl > 0;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-live="polite"
      className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
        hatFaellige
          ? "border-newsong-200 bg-newsong-50 hover:bg-newsong-100"
          : "border-neutral-200 bg-white hover:bg-neutral-50"
      }`}
    >
      <p className="text-xs text-neutral-500">Spaced Repetition</p>
      {hatFaellige ? (
        <p className="text-2xl font-semibold text-neutral-900">
          {faelligeAnzahl}{" "}
          <span className="text-sm font-normal text-neutral-600">
            {faelligeAnzahl === 1 ? "Strophe" : "Strophen"} heute fällig
          </span>
        </p>
      ) : (
        <p className="text-sm text-neutral-400">
          Keine Strophen fällig — gut gemacht!
        </p>
      )}
    </button>
  );
}
