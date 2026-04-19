"use client";

import { useCallback, useId } from "react";
import { AppIcon } from "@/components/ui/iconify-icon";

interface SpurReglerProps {
  label: string;
  lautstaerke: number; // 0–1
  onLautstaerkeAendern: (wert: number) => void;
  stumm?: boolean;
  onStummschalten?: () => void;
  deaktiviert?: boolean;
}

/**
 * Lautstärkeregler für eine einzelne Spur im Wiedergabe-Mixer.
 *
 * Zeigt einen Slider (0–100 %) mit optionalem Stumm-Toggle und
 * unterstützt einen deaktivierten Zustand.
 */
export function SpurRegler({
  label,
  lautstaerke,
  onLautstaerkeAendern,
  stumm = false,
  onStummschalten,
  deaktiviert = false,
}: SpurReglerProps) {
  const sliderId = useId();

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onLautstaerkeAendern(parseFloat(e.target.value));
    },
    [onLautstaerkeAendern],
  );

  const prozent = Math.round(lautstaerke * 100);

  /** Icon je nach Stumm-/Lautstärke-Zustand */
  const volumeIcon = stumm
    ? "lucide:volume-x"
    : lautstaerke === 0
      ? "lucide:volume"
      : lautstaerke < 0.5
        ? "lucide:volume-1"
        : "lucide:volume-2";

  return (
    <div className="flex items-center gap-2">
      {/* Stumm-Toggle */}
      {onStummschalten && (
        <button
          type="button"
          onClick={onStummschalten}
          disabled={deaktiviert}
          aria-label={stumm ? `${label} Stummschaltung aufheben` : `${label} stummschalten`}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-neutral-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <AppIcon icon={volumeIcon} className="text-lg" />
        </button>
      )}

      {/* Label */}
      <label
        htmlFor={sliderId}
        className="w-24 shrink-0 text-xs text-white/60"
      >
        {label}: {prozent}%
      </label>

      {/* Slider */}
      <input
        id={sliderId}
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={stumm ? 0 : lautstaerke}
        onChange={handleSliderChange}
        disabled={deaktiviert || stumm}
        className="flex-1 accent-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={`${label} Lautstärke: ${prozent} Prozent`}
      />
    </div>
  );
}
