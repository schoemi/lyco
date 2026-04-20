/**
 * Hilfsfunktionen für Beat-Einstellungen.
 *
 * - findeInstrumentalQuelle: Gibt die INSTRUMENTAL-Quelle mit dem niedrigsten orderIndex zurück
 * - berechneStandardModus: AUTOMATISCH wenn Instrumental vorhanden, sonst MANUELL
 * - erzwingeFrequenzConstraints: Constraint-Logik für Frequenzbereich
 */

import type { AudioQuelleResponse } from "@/types/audio";
import type { BeatMethode } from "@/types/beat-detection";

/**
 * Gibt die INSTRUMENTAL-Quelle mit dem niedrigsten orderIndex zurück.
 * Wenn keine INSTRUMENTAL-Quelle vorhanden ist, wird null zurückgegeben.
 *
 * @param audioQuellen - Array von AudioQuelleResponse
 * @returns Die INSTRUMENTAL-Quelle mit dem niedrigsten orderIndex oder null
 */
export function findeInstrumentalQuelle(
  audioQuellen: AudioQuelleResponse[],
): AudioQuelleResponse | null {
  const instrumentalQuellen = audioQuellen.filter(
    (q) => q.rolle === "INSTRUMENTAL",
  );
  if (instrumentalQuellen.length === 0) return null;

  return instrumentalQuellen.reduce((min, q) =>
    q.orderIndex < min.orderIndex ? q : min,
  );
}

/**
 * Berechnet den Standard-Modus basierend auf der Verfügbarkeit einer Instrumental-Spur.
 * AUTOMATISCH wenn mindestens eine INSTRUMENTAL-Quelle vorhanden ist, sonst MANUELL.
 *
 * @param audioQuellen - Array von AudioQuelleResponse
 * @returns BeatMethode ('AUTOMATISCH' oder 'MANUELL')
 */
export function berechneStandardModus(
  audioQuellen: AudioQuelleResponse[],
): BeatMethode {
  const hatInstrumental = audioQuellen.some((q) => q.rolle === "INSTRUMENTAL");
  return hatInstrumental ? "AUTOMATISCH" : "MANUELL";
}

/**
 * Erzwingt Frequenzbereich-Constraints.
 *
 * - Wenn untergrenze >= obergrenze: obergrenze = untergrenze + 10
 * - Wenn obergrenze <= untergrenze: untergrenze = obergrenze - 10
 * - Beide Werte werden auf den Bereich [20, 20000] begrenzt
 * - Nach Clamping wird sichergestellt, dass untergrenze < obergrenze
 *
 * @param untergrenze - Untere Frequenzgrenze in Hz
 * @param obergrenze - Obere Frequenzgrenze in Hz
 * @returns Korrigierte Frequenzgrenzen
 */
export function erzwingeFrequenzConstraints(
  untergrenze: number,
  obergrenze: number,
): { untergrenze: number; obergrenze: number } {
  // Clamp to valid range first
  let ug = Math.max(20, Math.min(20000, Math.round(untergrenze)));
  let og = Math.max(20, Math.min(20000, Math.round(obergrenze)));

  // Enforce untergrenze < obergrenze
  if (ug >= og) {
    // Try adjusting obergrenze up
    og = ug + 10;
    if (og > 20000) {
      og = 20000;
      ug = og - 10;
    }
  }

  // Final clamp
  ug = Math.max(20, Math.min(20000, ug));
  og = Math.max(20, Math.min(20000, og));

  return { untergrenze: ug, obergrenze: og };
}
