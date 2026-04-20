"use client";

import { useBeatPosition } from "@/hooks/use-beat-position";

export interface BeatCounterProps {
  beatPositionenMs: number[];
  currentTimeMs: number;
  taktZaehler?: number;
  variant?: "light" | "dark";
}

/**
 * Reusable beat counter component that displays the current measure and beat position.
 *
 * - variant="light": compact inline display for the normal audio player
 * - variant="dark": round overlay display for the karaoke mode / PitchDisplay
 */
export function BeatCounter({
  beatPositionenMs,
  currentTimeMs,
  taktZaehler,
  variant = "light",
}: BeatCounterProps) {
  const position = useBeatPosition(beatPositionenMs, currentTimeMs, taktZaehler);

  if (variant === "dark") {
    return position ? (
      <div
        className="rounded-full bg-white/10 px-4 py-2 text-lg font-bold text-white/90"
        aria-label={`Takt ${position.taktNummer}, Schlag ${position.schlagImTakt}`}
      >
        {position.taktNummer}.{position.schlagImTakt}
      </div>
    ) : (
      <div
        className="rounded-full bg-white/10 px-4 py-2 text-lg font-bold text-white/90"
        aria-label="Kein aktiver Takt"
      >
        —
      </div>
    );
  }

  // variant="light" (default)
  return position ? (
    <span
      className="rounded-md bg-neutral-100 px-2 py-0.5 text-sm tabular-nums font-mono text-neutral-700"
      aria-label={`Takt ${position.taktNummer}, Schlag ${position.schlagImTakt}`}
    >
      {position.taktNummer}.{position.schlagImTakt}
    </span>
  ) : (
    <span
      className="rounded-md bg-neutral-100 px-2 py-0.5 text-sm tabular-nums font-mono text-neutral-700"
      aria-label="Kein aktiver Takt"
    >
      —
    </span>
  );
}
