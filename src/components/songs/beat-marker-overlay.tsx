"use client";

import type { BeatMarkerOverlayProps } from "@/types/beat-detection";

/**
 * Berechnet die prozentuale Position eines Beats auf dem Fortschrittsbalken.
 * @param beatMs - Beat-Position in Millisekunden
 * @param durationMs - Gesamtdauer in Millisekunden (muss > 0 sein)
 * @returns Prozentuale Position im Bereich [0, 100]
 */
export function berechneMarkerPosition(beatMs: number, durationMs: number): number {
  if (durationMs <= 0) return 0;
  const position = (beatMs / durationMs) * 100;
  return Math.max(0, Math.min(100, position));
}

/**
 * Findet den Index des hervorgehobenen Beats basierend auf der aktuellen Wiedergabeposition.
 * Der hervorgehobene Beat ist derjenige, der am nächsten zur aktuellen Position liegt
 * und innerhalb des Toleranzfensters (±toleranzMs) fällt.
 * @param currentTimeMs - Aktuelle Wiedergabeposition in Millisekunden
 * @param beatPositionenMs - Array der Beat-Positionen in Millisekunden
 * @param toleranzMs - Toleranzfenster in Millisekunden (Standard: 50)
 * @returns Index des hervorgehobenen Beats oder null wenn kein Beat im Fenster
 */
export function findeHervorgehobenenBeat(
  currentTimeMs: number,
  beatPositionenMs: number[],
  toleranzMs: number = 50,
): number | null {
  if (beatPositionenMs.length === 0) return null;

  let naechsterIndex: number | null = null;
  let kleinsteAbweichung = Infinity;

  for (let i = 0; i < beatPositionenMs.length; i++) {
    const abweichung = Math.abs(currentTimeMs - beatPositionenMs[i]);
    if (abweichung <= toleranzMs && abweichung < kleinsteAbweichung) {
      kleinsteAbweichung = abweichung;
      naechsterIndex = i;
    }
  }

  return naechsterIndex;
}

/**
 * Beat-Marker-Overlay-Komponente.
 * Zeigt Beat-Positionen als visuelle Marker auf dem Fortschrittsbalken.
 * Hebt den aktuellen Beat hervor wenn die Wiedergabeposition innerhalb ±50ms liegt.
 *
 * Requirements: 8.3, 8.4
 */
export default function BeatMarkerOverlay({
  beatPositionenMs,
  durationMs,
  currentTimeMs,
}: BeatMarkerOverlayProps) {
  if (durationMs <= 0 || beatPositionenMs.length === 0) return null;

  const hervorgehobenerIndex = findeHervorgehobenenBeat(
    currentTimeMs,
    beatPositionenMs,
    50,
  );

  return (
    <div
      className="pointer-events-none absolute inset-0"
      aria-hidden="true"
      data-testid="beat-marker-overlay"
    >
      {beatPositionenMs.map((beatMs, index) => {
        const position = berechneMarkerPosition(beatMs, durationMs);
        // Skip markers outside visible range
        if (position < 0 || position > 100) return null;

        const istHervorgehoben = index === hervorgehobenerIndex;

        return (
          <div
            key={index}
            data-testid={`beat-marker-${index}`}
            data-highlighted={istHervorgehoben ? "true" : "false"}
            className={`absolute top-0 h-full w-0.5 transition-colors duration-75 ${
              istHervorgehoben
                ? "bg-newsong-400 opacity-90"
                : "bg-neutral-400 opacity-40"
            }`}
            style={{ left: `${position}%` }}
          />
        );
      })}
    </div>
  );
}
