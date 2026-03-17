/**
 * Durchschnittsfortschritt über alle Songs als reine Funktion.
 * Requirements: 8.1, 8.2, 8.3, 8.5
 */

/**
 * Berechnet den Durchschnittsfortschritt als arithmetisches Mittel der Song-Fortschritte.
 *
 * Regeln:
 * - Leere Liste → 0
 * - Arithmetisches Mittel aller Werte
 * - Gerundet auf nächste ganze Zahl (Math.round)
 * - Ergebnis geclampt auf [0, 100]
 */
export function berechneDurchschnitt(songFortschritte: number[]): number {
  if (songFortschritte.length === 0) {
    return 0;
  }

  const sum = songFortschritte.reduce((acc, val) => acc + val, 0);
  const mean = sum / songFortschritte.length;
  const rounded = Math.round(mean);

  return Math.max(0, Math.min(100, rounded));
}
