"use client";

import { useCallback, useId } from "react";
import { AppIcon } from "@/components/ui/iconify-icon";

interface GainReglerProps {
  gainWert: number; // 0–3 (0 = 0%, 1 = 100%, 3 = 300%)
  onGainAendern: (wert: number) => void;
  deaktiviert?: boolean;
}

/**
 * Gain-Regler für die Mikrofon-Eingangslautstärke.
 *
 * Zeigt einen Slider (0–300 %) mit dem aktuellen Prozentwert.
 * Der initiale Wert ist 100 % (gainWert = 1.0).
 * Der Gain wird in Echtzeit auf den Mikrofon-Eingang angewendet.
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4
 */
export function GainRegler({
  gainWert,
  onGainAendern,
  deaktiviert = false,
}: GainReglerProps) {
  const sliderId = useId();

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onGainAendern(parseFloat(e.target.value));
    },
    [onGainAendern],
  );

  const prozent = Math.round(gainWert * 100);

  return (
    <div className="flex items-center gap-2">
      {/* Gain-Icon */}
      <div className="flex min-h-[44px] min-w-[44px] items-center justify-center text-neutral-300">
        <AppIcon icon="lucide:mic" className="text-lg" />
      </div>

      {/* Label */}
      <label
        htmlFor={sliderId}
        className="w-24 shrink-0 text-xs text-white/60"
      >
        Gain: {prozent}%
      </label>

      {/* Slider */}
      <input
        id={sliderId}
        type="range"
        min={0}
        max={3}
        step={0.01}
        value={gainWert}
        onChange={handleSliderChange}
        disabled={deaktiviert}
        className="flex-1 accent-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={`Mikrofon-Gain: ${prozent} Prozent`}
      />
    </div>
  );
}
