/**
 * Reine Funktionen für die Beat-Erkennung.
 *
 * - berechneSpectralFlux: Positive Differenz der Magnitude-Spektren aufeinanderfolgender Frames
 * - findePeaks: Lokale Maxima mit adaptivem Schwellenwert (gleitender Mittelwert + Faktor)
 * - berechneBpm: Median der Inter-Beat-Intervalle in BPM umrechnen, Bereich [40, 240]
 * - berechneKonfidenz: max(0, 100 - (stddev / medianIBI) * 200), Bereich [0, 100]
 * - berechneAbweichungProzent: |manuell - detektiert| / detektiert * 100
 */

/**
 * Berechnet den Spectral Flux aus aufeinanderfolgenden FFT-Frames.
 * Für jedes aufeinanderfolgende Frame-Paar wird die Summe der positiven
 * Differenzen der Magnitude-Werte berechnet.
 *
 * @param frames - Array von Float32Array, jedes enthält die Magnitude-Werte eines FFT-Frames
 * @returns Array von Spectral-Flux-Werten (Länge = frames.length - 1)
 */
export function berechneSpectralFlux(frames: Float32Array[]): number[] {
  if (frames.length < 2) return [];

  const flux: number[] = [];
  for (let i = 1; i < frames.length; i++) {
    const prev = frames[i - 1];
    const curr = frames[i];
    const len = Math.min(prev.length, curr.length);
    let sum = 0;
    for (let j = 0; j < len; j++) {
      const diff = curr[j] - prev[j];
      if (diff > 0) {
        sum += diff;
      }
    }
    flux.push(sum);
  }
  return flux;
}

/**
 * Findet Peaks (lokale Maxima) im Spectral-Flux-Signal mit adaptivem Schwellenwert.
 * Ein Peak ist ein Wert, der größer als seine beiden Nachbarn ist und über dem
 * adaptiven Schwellenwert (gleitender Mittelwert * schwellenwertFaktor) liegt.
 *
 * @param flux - Array von Spectral-Flux-Werten
 * @param schwellenwertFaktor - Multiplikator für den gleitenden Mittelwert
 * @returns Array von Indizes der gefundenen Peaks
 */
export function findePeaks(flux: number[], schwellenwertFaktor: number): number[] {
  if (flux.length < 3) return [];

  const fensterGroesse = 10;
  const peaks: number[] = [];

  for (let i = 1; i < flux.length - 1; i++) {
    // Lokales Maximum prüfen
    if (flux[i] <= flux[i - 1] || flux[i] <= flux[i + 1]) {
      continue;
    }

    // Adaptiver Schwellenwert: gleitender Mittelwert über ein Fenster
    const start = Math.max(0, i - fensterGroesse);
    const end = Math.min(flux.length, i + fensterGroesse + 1);
    let sum = 0;
    for (let j = start; j < end; j++) {
      sum += flux[j];
    }
    const mittelwert = sum / (end - start);
    const schwellenwert = mittelwert * schwellenwertFaktor;

    if (flux[i] > schwellenwert) {
      peaks.push(i);
    }
  }

  return peaks;
}

/**
 * Berechnet den Median eines Arrays von Zahlen.
 */
function median(werte: number[]): number {
  if (werte.length === 0) return 0;
  const sortiert = [...werte].sort((a, b) => a - b);
  const mitte = Math.floor(sortiert.length / 2);
  if (sortiert.length % 2 === 0) {
    return (sortiert[mitte - 1] + sortiert[mitte]) / 2;
  }
  return sortiert[mitte];
}

/**
 * Berechnet die Standardabweichung eines Arrays von Zahlen.
 */
function standardabweichung(werte: number[]): number {
  if (werte.length < 2) return 0;
  const mittel = werte.reduce((s, v) => s + v, 0) / werte.length;
  const varianz = werte.reduce((s, v) => s + (v - mittel) ** 2, 0) / werte.length;
  return Math.sqrt(varianz);
}

/**
 * Berechnet den BPM-Wert aus Beat-Positionen in Millisekunden.
 * Verwendet den Median der Inter-Beat-Intervalle und begrenzt das Ergebnis auf [40, 240].
 *
 * @param beatPositionenMs - Array von Beat-Zeitpunkten in Millisekunden
 * @returns BPM-Wert im Bereich [40, 240]
 */
export function berechneBpm(beatPositionenMs: number[]): number {
  if (beatPositionenMs.length < 2) return 40;

  const ibis: number[] = [];
  const sortiert = [...beatPositionenMs].sort((a, b) => a - b);
  for (let i = 1; i < sortiert.length; i++) {
    const ibi = sortiert[i] - sortiert[i - 1];
    if (ibi > 0) {
      ibis.push(ibi);
    }
  }

  if (ibis.length === 0) return 40;

  const medianIbi = median(ibis);
  if (medianIbi <= 0) return 40;

  const bpm = 60000 / medianIbi;

  return Math.min(240, Math.max(40, Math.round(bpm)));
}

/**
 * Berechnet die Konfidenz der Beat-Erkennung basierend auf der Konsistenz
 * der Inter-Beat-Intervalle.
 * Formel: max(0, 100 - (stddev / medianIBI) * 200), Bereich [0, 100]
 *
 * @param beatPositionenMs - Array von Beat-Zeitpunkten in Millisekunden
 * @returns Konfidenz-Wert im Bereich [0, 100]
 */
export function berechneKonfidenz(beatPositionenMs: number[]): number {
  if (beatPositionenMs.length < 2) return 0;

  const ibis: number[] = [];
  const sortiert = [...beatPositionenMs].sort((a, b) => a - b);
  for (let i = 1; i < sortiert.length; i++) {
    const ibi = sortiert[i] - sortiert[i - 1];
    if (ibi > 0) {
      ibis.push(ibi);
    }
  }

  if (ibis.length === 0) return 0;

  const medianIbi = median(ibis);
  if (medianIbi <= 0) return 0;

  const stddev = standardabweichung(ibis);
  const konfidenz = 100 - (stddev / medianIbi) * 200;

  return Math.min(100, Math.max(0, Math.round(konfidenz)));
}

/**
 * Berechnet die prozentuale Abweichung zwischen manuellem und detektiertem BPM-Wert.
 * Formel: |manuell - detektiert| / detektiert * 100
 *
 * @param manuellBpm - Manuell eingegebener BPM-Wert
 * @param detektiertBpm - Automatisch detektierter BPM-Wert (muss > 0 sein)
 * @returns Prozentuale Abweichung
 */
export function berechneAbweichungProzent(manuellBpm: number, detektiertBpm: number): number {
  if (detektiertBpm <= 0) return 0;
  return Math.abs(manuellBpm - detektiertBpm) / detektiertBpm * 100;
}
