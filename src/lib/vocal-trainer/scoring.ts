import type { PitchFrame, ReferenzFrame } from "@/types/vocal-trainer";
import { centsDiff } from "@/lib/vocal-trainer/frequenz-utils";

/**
 * Kategorisiert eine Pitch-Abweichung in Cents.
 * < 50 → gut, 50–100 → akzeptabel, > 100 → fehlerhaft
 * Verwendet den Absolutwert der Cents-Abweichung.
 */
export function berechneAbweichungKategorie(
  cents: number
): "gut" | "akzeptabel" | "fehlerhaft" {
  const abs = Math.abs(cents);
  if (abs < 50) return "gut";
  if (abs <= 100) return "akzeptabel";
  return "fehlerhaft";
}

/**
 * Berechnet den Pitch-Score (0–100) basierend auf der Genauigkeit
 * der Nutzer-Pitch-Werte im Vergleich zur Referenz.
 *
 * Nur voiced Frames mit confidence >= 0.5 (Nutzer) und isVoiced (Referenz)
 * werden verglichen. Frames werden nach Zeitstempel gepaart (kürzere Liste bestimmt Länge).
 *
 * Jeder Frame erhält einen Punktwert basierend auf der Cents-Abweichung:
 * - < 50 Cents: 1.0 (gut)
 * - 50–100 Cents: 0.5 (akzeptabel)
 * - > 100 Cents: 0.0 (fehlerhaft)
 *
 * Score = (Summe der Punktwerte / Anzahl verglichener Frames) * 100
 */
export function berechnePitchScore(
  nutzerFrames: PitchFrame[],
  referenzFrames: ReferenzFrame[]
): number {
  const nutzerVoiced = nutzerFrames.filter(
    (f) => f.isVoiced && f.confidence >= 0.5 && f.f0Hz > 0
  );
  const referenzVoiced = referenzFrames.filter(
    (f) => f.isVoiced && f.f0Hz > 0
  );

  if (nutzerVoiced.length === 0 || referenzVoiced.length === 0) {
    return 0;
  }

  const pairCount = Math.min(nutzerVoiced.length, referenzVoiced.length);
  let totalPoints = 0;

  for (let i = 0; i < pairCount; i++) {
    const abweichung = Math.abs(centsDiff(nutzerVoiced[i].f0Hz, referenzVoiced[i].f0Hz));
    if (abweichung < 50) {
      totalPoints += 1.0;
    } else if (abweichung <= 100) {
      totalPoints += 0.5;
    }
    // > 100: 0 points
  }

  const score = (totalPoints / pairCount) * 100;
  return clamp(score, 0, 100);
}

/**
 * Berechnet den Timing-Score (0–100) basierend auf der zeitlichen
 * Übereinstimmung der Onsets des Nutzers mit der Referenz.
 *
 * Onset-Timestamps werden paarweise verglichen (kürzere Liste bestimmt Länge).
 * Jeder Onset erhält einen Punktwert basierend auf der zeitlichen Abweichung:
 * - < 50ms: 1.0 (gut)
 * - 50–150ms: 0.5 (akzeptabel)
 * - > 150ms: 0.0 (fehlerhaft)
 *
 * Score = (Summe der Punktwerte / Anzahl verglichener Onsets) * 100
 */
export function berechneTimingScore(
  nutzerOnsets: number[],
  referenzOnsets: number[]
): number {
  if (nutzerOnsets.length === 0 || referenzOnsets.length === 0) {
    return 0;
  }

  const pairCount = Math.min(nutzerOnsets.length, referenzOnsets.length);
  let totalPoints = 0;

  for (let i = 0; i < pairCount; i++) {
    const abweichungMs = Math.abs(nutzerOnsets[i] - referenzOnsets[i]);
    if (abweichungMs < 50) {
      totalPoints += 1.0;
    } else if (abweichungMs <= 150) {
      totalPoints += 0.5;
    }
    // > 150ms: 0 points
  }

  const score = (totalPoints / pairCount) * 100;
  return clamp(score, 0, 100);
}

/**
 * Berechnet den Gesamt-Score als gewichteten Durchschnitt.
 * Gewichtung: 70% Pitch, 30% Timing.
 * Ergebnis wird auf [0, 100] begrenzt.
 */
export function berechneGesamtScore(
  pitchScore: number,
  timingScore: number
): number {
  const score = 0.7 * pitchScore + 0.3 * timingScore;
  return clamp(score, 0, 100);
}

/** Begrenzt einen Wert auf den Bereich [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
