export interface IntervallErgebnis {
  neuerKorrektZaehler: number;
  intervallTage: number;
}

/**
 * Berechnet das nächste Wiederholungsintervall basierend auf dem vereinfachten SM-2-Algorithmus.
 * Reine Funktion ohne Seiteneffekte.
 */
export function berechneIntervall(
  korrektZaehler: number,
  gewusst: boolean
): IntervallErgebnis {
  if (!gewusst) {
    return { neuerKorrektZaehler: 0, intervallTage: 1 };
  }

  if (korrektZaehler === 0) {
    return { neuerKorrektZaehler: 1, intervallTage: 1 };
  }

  if (korrektZaehler === 1) {
    return { neuerKorrektZaehler: 2, intervallTage: 3 };
  }

  return { neuerKorrektZaehler: korrektZaehler + 1, intervallTage: 7 };
}
