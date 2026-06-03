"use client";

import type { AudioRolle } from "@/generated/prisma/client";

export interface PlaylistAudioRolleSelectorProps {
  availableRollen: AudioRolle[];
  selectedRolle: AudioRolle;
  onChange: (rolle: AudioRolle) => void;
}

const ROLLE_LABELS: Record<AudioRolle, string> = {
  STANDARD: "Original",
  INSTRUMENTAL: "Instrumental",
  REFERENZ_VOKAL: "Vokal",
};

const ALL_ROLLEN: AudioRolle[] = ["STANDARD", "INSTRUMENTAL", "REFERENZ_VOKAL"];

/**
 * Audio-Modus-Auswahl für den Set-Playlist-Player.
 * Zeigt alle drei Rollen an; nicht verfügbare Rollen sind ausgegraut.
 * Ausgewählte Rolle wird hervorgehoben.
 *
 * Requirements: 5.1, 5.2, 5.3
 */
export default function PlaylistAudioRolleSelector({
  availableRollen,
  selectedRolle,
  onChange,
}: PlaylistAudioRolleSelectorProps) {
  return (
    <div
      className="inline-flex rounded-lg border border-neutral-200 bg-white p-0.5"
      role="group"
      aria-label="Audio-Modus auswählen"
    >
      {ALL_ROLLEN.map((rolle) => {
        const isAvailable = availableRollen.includes(rolle);
        const isSelected = selectedRolle === rolle;

        return (
          <button
            key={rolle}
            type="button"
            aria-pressed={isSelected}
            aria-disabled={!isAvailable}
            disabled={!isAvailable}
            onClick={() => {
              if (isAvailable) {
                onChange(rolle);
              }
            }}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              isSelected
                ? "bg-newsong-100 text-newsong-700 shadow-sm"
                : isAvailable
                  ? "text-neutral-600 hover:bg-neutral-50"
                  : "cursor-not-allowed text-neutral-300"
            }`}
          >
            {ROLLE_LABELS[rolle]}
          </button>
        );
      })}
    </div>
  );
}
