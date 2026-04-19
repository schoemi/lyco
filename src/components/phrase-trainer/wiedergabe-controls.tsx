"use client";

import { AppIcon } from "@/components/ui/iconify-icon";

interface WiedergabeControlsProps {
  istAbspielend: boolean;
  onPlayPause: () => void;
  onStop: () => void;
  deaktiviert?: boolean;
}

/**
 * Wiedergabe-Steuerung für den Phrasen-Trainer Mixer.
 *
 * Zeigt Play/Pause- und Stopp-Buttons für die Mixer-Wiedergabe.
 * - Play/Pause: Umschalter — zeigt Play-Icon wenn pausiert, Pause-Icon wenn abspielend
 * - Stopp: Setzt die Wiedergabe zurück auf den Anfang des Übungsbereichs
 */
export function WiedergabeControls({
  istAbspielend,
  onPlayPause,
  onStop,
  deaktiviert = false,
}: WiedergabeControlsProps) {
  return (
    <div
      className="flex items-center gap-3"
      role="group"
      aria-label="Wiedergabe-Steuerung"
    >
      {/* Play / Pause */}
      <button
        type="button"
        onClick={onPlayPause}
        disabled={deaktiviert}
        aria-label={istAbspielend ? "Pause" : "Abspielen"}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded bg-primary-600 px-5 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <AppIcon
          icon={istAbspielend ? "lucide:pause" : "lucide:play"}
          className="mr-2 text-lg"
        />
        {istAbspielend ? "Pause" : "Abspielen"}
      </button>

      {/* Stopp */}
      <button
        type="button"
        onClick={onStop}
        disabled={deaktiviert}
        aria-label="Stopp"
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded border border-neutral-300 px-5 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <AppIcon icon="lucide:square" className="mr-2 text-lg" />
        Stopp
      </button>
    </div>
  );
}
