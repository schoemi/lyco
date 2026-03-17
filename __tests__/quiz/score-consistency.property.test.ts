/**
 * Property: Score consistency and recommendation threshold
 *
 * - `calculateScore(answers).prozent` is always between 0 and 100
 * - `getEmpfehlung(p)` returns `'nochmal'` for p < 70 and `'weiter'` for p ≥ 70
 *
 * **Validates: Requirements 6.1, 6.2, 6.3**
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { calculateScore, getEmpfehlung } from '@/lib/quiz/score';
import type { QuizAnswer } from '@/types/quiz';

// --- Arbitraries ---

/** A single QuizAnswer with arbitrary questionId, stropheId, and correct flag */
const arbQuizAnswer: fc.Arbitrary<QuizAnswer> = fc.record({
  questionId: fc.uuid(),
  stropheId: fc.uuid(),
  correct: fc.boolean(),
});

/** An arbitrary array of QuizAnswer objects (0 to 50 answers) */
const arbAnswers: fc.Arbitrary<QuizAnswer[]> = fc.array(arbQuizAnswer, {
  minLength: 0,
  maxLength: 50,
});

/** An arbitrary integer percentage value between 0 and 100 */
const arbProzent: fc.Arbitrary<number> = fc.integer({ min: 0, max: 100 });

// --- Property Tests ---

describe('Property: Score consistency and recommendation threshold', () => {
  it('calculateScore(answers).prozent is always between 0 and 100', () => {
    fc.assert(
      fc.property(arbAnswers, (answers) => {
        const { prozent, correct, total } = calculateScore(answers);

        // prozent is in [0, 100]
        expect(prozent).toBeGreaterThanOrEqual(0);
        expect(prozent).toBeLessThanOrEqual(100);

        // correct count never exceeds total
        expect(correct).toBeGreaterThanOrEqual(0);
        expect(correct).toBeLessThanOrEqual(total);

        // total matches input length
        expect(total).toBe(answers.length);
      }),
      { numRuns: 200 },
    );
  });

  it('getEmpfehlung returns "nochmal" for p < 70 and "weiter" for p >= 70', () => {
    fc.assert(
      fc.property(arbProzent, (p) => {
        const result = getEmpfehlung(p);

        if (p < 70) {
          expect(result).toBe('nochmal');
        } else {
          expect(result).toBe('weiter');
        }
      }),
      { numRuns: 200 },
    );
  });
});
