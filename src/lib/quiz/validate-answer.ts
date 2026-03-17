import { normalizeText } from './normalize';
import type { DiffSegment, ReihenfolgeQuestion } from '@/types/quiz';

/**
 * Validates a Reihenfolge answer, treating lines with identical text as interchangeable.
 * Returns per-line correctness and overall result.
 *
 * Algorithm: For each position, if the submitted zeileId matches the correct one → correct.
 * Otherwise, check if the text at that position matches the expected text (duplicate-aware).
 */
export function validateReihenfolge(
  submittedOrder: string[],
  question: ReihenfolgeQuestion,
): { correct: boolean; lineResults: ('correct' | 'incorrect')[] } {
  const allZeilen = question.shuffledZeilen;
  const textById = new Map(allZeilen.map((z) => [z.zeileId, z.text]));

  const lineResults: ('correct' | 'incorrect')[] = [];

  for (let i = 0; i < question.correctOrder.length; i++) {
    const expectedId = question.correctOrder[i];
    const submittedId = submittedOrder[i];

    if (submittedId === expectedId) {
      lineResults.push('correct');
    } else {
      // Check if the texts are identical (duplicate lines)
      const expectedText = textById.get(expectedId) ?? '';
      const submittedText = textById.get(submittedId) ?? '';
      lineResults.push(expectedText === submittedText ? 'correct' : 'incorrect');
    }
  }

  const correct = lineResults.every((r) => r === 'correct');
  return { correct, lineResults };
}

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
