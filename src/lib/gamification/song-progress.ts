/**
 * Song-Fortschritt als reine Funktion.
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

/**
 * Berechnet den Song-Fortschritt als arithmetisches Mittel der Strophen-Fortschritte.
 *
 * Regeln:
 * - Leere Liste → 0
 * - Arithmetisches Mittel aller Werte
 * - Gerundet auf nächste ganze Zahl (Math.round)
 * - Ergebnis geclampt auf [0, 100]
 */
export function berechneSongFortschritt(strophenFortschritte: number[]): number {
  if (strophenFortschritte.length === 0) {
    return 0;
  }

  const sum = strophenFortschritte.reduce((acc, val) => acc + val, 0);
  const mean = sum / strophenFortschritte.length;
  const rounded = Math.round(mean);

  return Math.max(0, Math.min(100, rounded));
}
