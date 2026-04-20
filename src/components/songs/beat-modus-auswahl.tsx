"use client";

import type { BeatMethode } from "@/types/beat-detection";

interface ModusAuswahlProps {
  modus: BeatMethode;
  onModusChange: (modus: BeatMethode) => void;
  instrumentalVorhanden: boolean;
}

/**
 * Modus-Auswahl-Komponente für Beat-Einstellungen.
 * Zwei auswählbare Optionen: „Automatisch erkennen" und „Manuell eingeben".
 * Automatisch-Modus wird deaktiviert wenn keine Instrumental-Spur vorhanden ist.
 *
 * Requirements: 1.1, 1.4, 1.5
 */
export default function BeatModusAuswahl({
  modus,
  onModusChange,
  instrumentalVorhanden,
}: ModusAuswahlProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-neutral-700">Erkennungsmodus</p>
      <div className="flex gap-2" role="radiogroup" aria-label="BPM-Erkennungsmodus">
        <button
          type="button"
          role="radio"
          aria-checked={modus === "AUTOMATISCH"}
          disabled={!instrumentalVorhanden}
          onClick={() => onModusChange("AUTOMATISCH")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            modus === "AUTOMATISCH"
              ? "bg-newsong-600 text-white"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          } ${!instrumentalVorhanden ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          Automatisch erkennen
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={modus === "MANUELL"}
          onClick={() => onModusChange("MANUELL")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            modus === "MANUELL"
              ? "bg-newsong-600 text-white"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          }`}
        >
          Manuell eingeben
        </button>
      </div>
      {!instrumentalVorhanden && (
        <p className="text-xs text-warning-600" role="status">
          Für die automatische Erkennung wird eine Instrumental-Spur benötigt.
          Bitte füge eine unter den Audio-Quellen hinzu.
        </p>
      )}
    </div>
  );
}
