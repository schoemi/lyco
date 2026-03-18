"use client";

import { getStatusPunktFarbe } from "@/lib/gamification/status-punkt";

export interface StatusPunktProps {
  fortschritt: number;
}

const farbKlassen: Record<string, string> = {
  grau: "bg-neutral-300",
  orange: "bg-warning-400",
  gruen: "bg-success-500",
};

export function StatusPunkt({ fortschritt }: StatusPunktProps) {
  const farbe = getStatusPunktFarbe(fortschritt);
  const klasse = farbKlassen[farbe];

  return (
    <span
      className={`inline-block h-3 w-3 rounded-full ${klasse}`}
      role="img"
      aria-label={`Fortschritt: ${fortschritt}%`}
    />
  );
}
