/**
 * Status-Punkt-Farbzuordnung als reine Funktion.
 * Requirements: 6.1, 6.2, 6.3, 6.5
 */

/** Mögliche Farben für den Status-Punkt eines Songs */
export type StatusPunktFarbe = "grau" | "orange" | "gruen";

/**
 * Gibt die Status-Punkt-Farbe basierend auf dem Fortschritt zurück.
 *
 * Regeln:
 * - 0% → grau (Song nicht begonnen)
 * - 1–99% → orange (Song in Bearbeitung)
 * - 100% → grün (Song vollständig gelernt)
 */
export function getStatusPunktFarbe(fortschrittProzent: number): StatusPunktFarbe {
  if (fortschrittProzent <= 0) {
    return "grau";
  }
  if (fortschrittProzent >= 100) {
    return "gruen";
  }
  return "orange";
}
