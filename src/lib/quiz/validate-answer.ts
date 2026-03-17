import { normalizeText } from './normalize';
import type { DiffSegment } from '@/types/quiz';

/**
 * Validates a Diktat answer by comparing input against the target text word-by-word.
 * Returns whether the answer is correct and a diff showing matching/differing/missing words.
 *
 * Requirements: 5.3, 5.4, 5.7
 */
export function validateDiktat(
  input: string,
  target: string
): { correct: boolean; diff: DiffSegment[] } {
  const normalizedInput = normalizeText(input);
  const normalizedTarget = normalizeText(target);

  const correct = normalizedInput === normalizedTarget;

  const inputWords = normalizedInput ? normalizedInput.split(/\s+/) : [];
  const targetWords = normalizedTarget ? normalizedTarget.split(/\s+/) : [];

  const diff: DiffSegment[] = [];

  for (let i = 0; i < targetWords.length; i++) {
    if (i < inputWords.length) {
      if (inputWords[i] === targetWords[i]) {
        diff.push({ text: targetWords[i], type: 'correct' });
      } else {
        diff.push({ text: inputWords[i], type: 'incorrect' });
      }
    } else {
      diff.push({ text: targetWords[i], type: 'missing' });
    }
  }

  return { correct, diff };
}
