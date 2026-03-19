/**
 * Dynamic Time Warping (DTW) Algorithmus für Zeitreihen-Alignment.
 *
 * Gleicht zwei Pitch-Kurven (z.B. MIDI-Werte) ab und findet das
 * optimale Alignment trotz Tempo-Schwankungen.
 *
 * @module dtw
 * @see Anforderung 7.1
 */

export interface DtwResult {
  /** Gesamtkosten des optimalen Alignments */
  cost: number;
  /** Ausgerichtete Paare von [referenzIndex, nutzerIndex] */
  path: [number, number][];
}

/**
 * Berechnet das DTW-Alignment zweier Zahlenreihen.
 *
 * Verwendet eine vollständige Kostenmatrix mit der absoluten Differenz
 * als Kostenfunktion. Gibt den optimalen Pfad und die Gesamtkosten zurück.
 *
 * @param referenz - Referenz-Pitch-Werte (z.B. MIDI-Werte)
 * @param nutzer - Nutzer-Pitch-Werte (z.B. MIDI-Werte)
 * @returns DtwResult mit Kosten und Alignment-Pfad
 */
export function dtw(referenz: number[], nutzer: number[]): DtwResult {
  const n = referenz.length;
  const m = nutzer.length;

  if (n === 0 || m === 0) {
    return { cost: 0, path: [] };
  }

  // Kostenmatrix aufbauen (n+1 x m+1, Zeile 0 / Spalte 0 = Rand)
  const matrix: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(Infinity)
  );
  matrix[0][0] = 0;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const localCost = Math.abs(referenz[i - 1] - nutzer[j - 1]);
      matrix[i][j] =
        localCost +
        Math.min(matrix[i - 1][j], matrix[i][j - 1], matrix[i - 1][j - 1]);
    }
  }

  // Pfad rückwärts rekonstruieren
  const path: [number, number][] = [];
  let i = n;
  let j = m;

  while (i > 0 && j > 0) {
    path.push([i - 1, j - 1]);

    const diag = matrix[i - 1][j - 1];
    const left = matrix[i][j - 1];
    const up = matrix[i - 1][j];

    if (diag <= left && diag <= up) {
      i--;
      j--;
    } else if (up <= left) {
      i--;
    } else {
      j--;
    }
  }

  path.reverse();

  return { cost: matrix[n][m], path };
}
