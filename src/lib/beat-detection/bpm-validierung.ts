/**
 * BPM-Validierungsmodul.
 *
 * - validiereManuellenBpm: Vergleicht manuellen BPM-Wert mit detektiertem Wert
 * - istGueltigerBpm: Prüft ob ein Wert ein gültiger BPM-Wert ist (Ganzzahl in [20, 300])
 */

import { berechneAbweichungProzent } from "./beat-algorithmus";

/**
 * Validiert einen manuell eingegebenen BPM-Wert gegen den detektierten Wert.
 * Abweichung < 5% gilt als übereinstimmend.
 *
 * @param manuellBpm - Manuell eingegebener BPM-Wert
 * @param detektiertBpm - Automatisch detektierter BPM-Wert
 * @returns Objekt mit Übereinstimmungs-Flag und prozentualer Abweichung
 */
export function validiereManuellenBpm(
  manuellBpm: number,
  detektiertBpm: number,
): { uebereinstimmung: boolean; abweichungProzent: number } {
  const abweichungProzent = berechneAbweichungProzent(manuellBpm, detektiertBpm);
  return {
    uebereinstimmung: abweichungProzent < 5,
    abweichungProzent,
  };
}

/**
 * Prüft ob ein Wert ein gültiger BPM-Wert ist.
 * Gültig: Ganzzahl im Bereich [20, 300].
 *
 * @param wert - Beliebiger Eingabewert
 * @returns true wenn der Wert eine Ganzzahl im Bereich [20, 300] ist
 */
export function istGueltigerBpm(wert: unknown): boolean {
  if (typeof wert !== "number") return false;
  if (!Number.isFinite(wert)) return false;
  if (!Number.isInteger(wert)) return false;
  return wert >= 20 && wert <= 300;
}
