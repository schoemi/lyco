"use client";

import { useState } from "react";
import type { AudioRolle } from "@/generated/prisma/client";

const ROLLEN_LABELS: Record<AudioRolle, string> = {
  STANDARD: "Standard",
  INSTRUMENTAL: "Instrumental",
  REFERENZ_VOKAL: "Referenz-Vokal",
};

interface RollenAuswahlProps {
  songId: string;
  quelleId: string;
  aktuelleRolle: AudioRolle;
  onRolleGeaendert?: (rolle: AudioRolle) => void;
}

export function RollenAuswahl({
  songId,
  quelleId,
  aktuelleRolle,
  onRolleGeaendert,
}: RollenAuswahlProps) {
  const [rolle, setRolle] = useState<AudioRolle>(aktuelleRolle);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(newRolle: AudioRolle) {
    const previousRolle = rolle;
    setRolle(newRolle);
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/songs/${songId}/audio-quellen/${quelleId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rolle: newRolle }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Fehler beim Speichern der Rolle");
      }

      onRolleGeaendert?.(newRolle);
    } catch (err) {
      setRolle(previousRolle);
      setError(
        err instanceof Error ? err.message : "Fehler beim Speichern der Rolle"
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <select
        aria-label="Rolle der Audio-Quelle"
        value={rolle}
        disabled={isLoading}
        onChange={(e) => handleChange(e.target.value as AudioRolle)}
        className={`rounded border px-2 py-1 text-sm ${
          isLoading ? "cursor-wait opacity-60" : ""
        } ${error ? "border-red-500" : "border-neutral-300"}`}
      >
        {(Object.keys(ROLLEN_LABELS) as AudioRolle[]).map((key) => (
          <option key={key} value={key}>
            {ROLLEN_LABELS[key]}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
