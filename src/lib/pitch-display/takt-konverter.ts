/**
 * Konvertiert eine Taktnummer in den Millisekunden-Zeitpunkt des ersten Beats dieses Takts.
 *
 * Der Beat-Index wird als `(taktNummer - 1) * taktZaehler` berechnet.
 * Falls dieser Index über das Beat-Array hinausgeht, wird der letzte bekannte
 * Beat-Zeitpunkt zurückgegeben (graceful degradation).
 *
 * @param taktNummer - Taktnummer (≥ 1)
 * @param beatPositionenMs - Array aller Beat-Zeitpunkte in ms
 * @param taktZaehler - Beats pro Takt (z.B. 4 für 4/4)
 * @returns Millisekunden-Zeitpunkt oder null wenn keine Beats vorhanden
 *
 * Requirements: 4.1, 4.2, 4.4, 4.5
 */
export function taktZuMs(
  taktNummer: number,
  beatPositionenMs: number[],
  taktZaehler: number,
): number | null {
  if (beatPositionenMs.length === 0) {
    return null;
  }

  const beatIndex = (taktNummer - 1) * taktZaehler;
  const clampedIndex = Math.min(beatIndex, beatPositionenMs.length - 1);

  return beatPositionenMs[clampedIndex];
}

/**
 * Konvertiert eine Taktnummer in den Millisekunden-Zeitpunkt des Endes dieses Takts
 * (= erster Beat des nächsten Takts, oder letzter bekannter Beat falls am Ende).
 *
 * Der Beat-Index wird als `taktNummer * taktZaehler` berechnet.
 * Falls dieser Index über das Beat-Array hinausgeht, wird der letzte bekannte
 * Beat-Zeitpunkt zurückgegeben (graceful degradation).
 *
 * @param taktNummer - Taktnummer (≥ 1)
 * @param beatPositionenMs - Array aller Beat-Zeitpunkte in ms
 * @param taktZaehler - Beats pro Takt (z.B. 4 für 4/4)
 * @returns Millisekunden-Zeitpunkt oder null wenn keine Beats vorhanden
 *
 * Requirements: 4.3, 4.4, 4.5
 */
export function taktEndZuMs(
  taktNummer: number,
  beatPositionenMs: number[],
  taktZaehler: number,
): number | null {
  if (beatPositionenMs.length === 0) {
    return null;
  }

  const beatIndex = taktNummer * taktZaehler;
  const clampedIndex = Math.min(beatIndex, beatPositionenMs.length - 1);

  return beatPositionenMs[clampedIndex];
}
