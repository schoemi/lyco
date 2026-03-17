/**
 * Streak-Berechnung als reine Funktion.
 * Requirements: 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 3.4
 */

export interface StreakInput {
  currentStreak: number;
  lastSessionDate: Date | null;
  today: Date;
}

export interface StreakResult {
  streak: number;
  lastSessionDate: Date;
}

/**
 * Berechnet den Tagesunterschied zwischen zwei Daten (nur Kalendertage, Zeit wird ignoriert).
 * Gibt die Differenz in ganzen Tagen zurück (today - last).
 */
function diffInDays(today: Date, last: Date): number {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const l = new Date(last.getFullYear(), last.getMonth(), last.getDate());
  const msPerDay = 86_400_000;
  return Math.round((t.getTime() - l.getTime()) / msPerDay);
}

/**
 * Berechnet den neuen Streak basierend auf dem aktuellen Streak, dem letzten Session-Datum
 * und dem heutigen Datum.
 *
 * Regeln:
 * - lastSessionDate ist null → streak = 1, lastSessionDate = today
 * - Gleicher Kalendertag → streak unverändert, lastSessionDate unverändert
 * - Genau 1 Tag Differenz → streak = currentStreak + 1, lastSessionDate = today
 * - Mehr als 1 Tag Differenz → streak = 1, lastSessionDate = today
 */
export function berechneStreak(input: StreakInput): StreakResult {
  const { currentStreak, lastSessionDate, today } = input;

  // Keine vorherige Session → neuer Streak beginnt bei 1
  if (lastSessionDate === null) {
    return { streak: 1, lastSessionDate: today };
  }

  const diff = diffInDays(today, lastSessionDate);

  if (diff === 0) {
    // Gleicher Tag → Streak bleibt unverändert
    return { streak: currentStreak, lastSessionDate };
  }

  if (diff === 1) {
    // Vortag → Streak erhöhen
    return { streak: currentStreak + 1, lastSessionDate: today };
  }

  // Mehr als 1 Tag Differenz → Streak zurücksetzen auf 1
  return { streak: 1, lastSessionDate: today };
}
