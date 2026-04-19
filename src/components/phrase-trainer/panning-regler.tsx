"use client";

import { useCallback, useId } from "react";
import { AppIcon } from "@/components/ui/iconify-icon";

interface PanningReglerProps {
  wert: number; // 0–1 (0 = mono/mitte, 1 = voll getrennt)
  onWertAendern: (wert: number) => void;
  sichtbar: boolean;
}

/**
 * Stereo-Panning-Regler für die Trennung von Aufnahme und Referenz-Vokal.
 *
 * Zeigt einen Slider (0–100 %) für die Stereo-Trennung.
 * Sichtbar nur wenn die Referenz-Vokalspur aktiv ist (`sichtbar`).
 *
 * Mapping:
 * - Aufnahme: pan = -wert (links)
 * - Referenz-Vokal: pan = +wert (rechts)
 * - Bei wert = 0: beide mittig (mono)
 * - Bei wert = 1: Aufnahme voll links (-1), Referenz voll rechts (+1)
 */
export function PanningRegler({
  wert,
  onWertAendern,
  sichtbar,
}: PanningReglerProps) {
  const sliderId = useId();

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onWertAendern(parseFloat(e.target.value));
    },
    [onWertAendern],
  );

  if (!sichtbar) {
    return null;
  }

  const prozent = Math.round(wert * 100);

  return (
    <div className="flex items-center gap-2">
      {/* Panning-Icon */}
      <div className="flex min-h-[44px] min-w-[44px] items-center justify-center text-neutral-300">
        <AppIcon icon="lucide:split" className="text-lg" />
      </div>

      {/* Label */}
      <label
        htmlFor={sliderId}
        className="w-24 shrink-0 text-xs text-white/60"
      >
        Stereo: {prozent}%
      </label>

      {/* Slider */}
      <input
        id={sliderId}
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={wert}
        onChange={handleSliderChange}
        className="flex-1 accent-primary-500"
        aria-label={`Stereo-Trennung: ${prozent} Prozent`}
      />
    </div>
  );
}
