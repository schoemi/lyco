/**
 * Score-Berechnung für den Lückentext-Lernmodus.
 */

/**
 * Berechnet den Fortschritt als Prozentwert (0–100), gerundet.
 * Gibt 0 zurück, wenn total = 0 (Division durch Null vermeiden).
 */
export function calculateProgress(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
}
