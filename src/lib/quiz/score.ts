import type { QuizAnswer } from '@/types/quiz';
import type { SongDetail } from '@/types/song';

/**
 * Berechnet den Gesamtscore einer Quiz-Session.
 * Requirements: 6.1, 6.2
 */
export function calculateScore(answers: QuizAnswer[]): {
  correct: number;
  total: number;
  prozent: number;
} {
  const total = answers.length;
  const correct = answers.filter((a) => a.correct).length;
  const prozent = total === 0 ? 0 : Math.round((correct / total) * 100);
  return { correct, total, prozent };
}

/**
 * Berechnet den Fortschritt pro Strophe als Map<stropheId, prozent>.
 * Nur Strophen, die im Song existieren und Antworten haben, werden berücksichtigt.
 * Requirements: 7.3
 */
export function calculateStropheScores(
  answers: QuizAnswer[],
  song: SongDetail,
): Map<string, number> {
  const stropheIds = new Set(song.strophen.map((s) => s.id));
  const grouped = new Map<string, { correct: number; total: number }>();

  for (const answer of answers) {
    if (!stropheIds.has(answer.stropheId)) continue;

    const entry = grouped.get(answer.stropheId) ?? { correct: 0, total: 0 };
    entry.total++;
    if (answer.correct) entry.correct++;
    grouped.set(answer.stropheId, entry);
  }

  const result = new Map<string, number>();
  for (const [stropheId, { correct, total }] of grouped) {
    result.set(stropheId, total === 0 ? 0 : Math.round((correct / total) * 100));
  }
  return result;
}

/**
 * Gibt eine Empfehlung basierend auf dem Prozentwert zurück.
 * < 70% → 'nochmal', ≥ 70% → 'weiter'
 * Requirements: 6.3
 */
export function getEmpfehlung(prozent: number): 'nochmal' | 'weiter' {
  return prozent < 70 ? 'nochmal' : 'weiter';
}
