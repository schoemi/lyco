/**
 * Property 7: Check-All validiert alle offenen Lücken
 *
 * Für jeden Cloze-State mit mindestens einer offenen Lücke (Feedback ≠ "correct")
 * soll nach Ausführung von Check-All jede offene Lücke mit einer nicht-leeren Eingabe
 * ein Feedback ("correct" oder "incorrect") erhalten. Bereits korrekte Lücken bleiben unverändert.
 *
 * **Validates: Requirements 6.2, 6.3**
 */
// Feature: cloze-learning, Property 7: Check-All validiert alle offenen Lücken

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { validateAnswer } from "@/lib/cloze/validate-answer";
import type { GapData, FeedbackState } from "@/types/cloze";

/**
 * Simulates the check-all logic from the page component.
 * For each gap where feedback !== "correct" and answer is non-empty, validate and set feedback.
 */
function checkAll(
  gaps: GapData[],
  answers: Record<string, string>,
  feedback: Record<string, FeedbackState>,
): Record<string, FeedbackState> {
  const newFeedback = { ...feedback };
  for (const gap of gaps) {
    if (!gap.isGap) continue;
    if (newFeedback[gap.gapId] === "correct") continue; // already correct, skip
    const answer = answers[gap.gapId] ?? "";
    if (answer.trim() === "") continue; // empty answer, skip
    newFeedback[gap.gapId] = validateAnswer(answer, gap.word) ? "correct" : "incorrect";
  }
  return newFeedback;
}

// Generator: a word of 1–10 alpha characters
const arbWord = fc.stringMatching(/^[a-zA-Z]{1,10}$/);

// Generator: a non-empty answer string (trimmed non-empty)
const arbNonEmptyAnswer = fc.stringMatching(/^[a-zA-Z]{1,10}$/);

// Generator: feedback state for pre-existing feedback
const arbFeedback = fc.constantFrom<FeedbackState>("correct", "incorrect", null);

// Generator: a single GapData entry that IS a gap
const arbGap = fc.record({
  gapId: fc.uuid(),
  zeileId: fc.uuid(),
  wordIndex: fc.nat({ max: 20 }),
  word: arbWord,
  isGap: fc.constant(true as const),
});

// Generator: a single GapData entry that is NOT a gap (visible word)
const arbVisibleWord = fc.record({
  gapId: fc.uuid(),
  zeileId: fc.uuid(),
  wordIndex: fc.nat({ max: 20 }),
  word: arbWord,
  isGap: fc.constant(false as const),
});

// Generator: mixed array of gaps and visible words (at least 1 gap)
const arbGaps = fc
  .tuple(
    fc.array(arbGap, { minLength: 1, maxLength: 10 }),
    fc.array(arbVisibleWord, { minLength: 0, maxLength: 5 }),
  )
  .map(([gaps, visible]) => [...gaps, ...visible]);

describe("Property 7: Check-All validiert alle offenen Lücken", () => {
  it("all open gaps with non-empty input receive feedback after check-all", () => {
    fc.assert(
      fc.property(arbGaps, (gaps) => {
        const gapEntries = gaps.filter((g) => g.isGap);

        // Build arbitrary answers and pre-existing feedback for each gap
        // Some gaps get correct feedback (already solved), some get answers, some are empty
        const answers: Record<string, string> = {};
        const feedback: Record<string, FeedbackState> = {};

        for (let i = 0; i < gapEntries.length; i++) {
          const gap = gapEntries[i];
          const variant = i % 4;
          if (variant === 0) {
            // Already correct — should remain unchanged
            feedback[gap.gapId] = "correct";
            answers[gap.gapId] = gap.word;
          } else if (variant === 1) {
            // Open gap with correct answer typed
            feedback[gap.gapId] = null;
            answers[gap.gapId] = gap.word;
          } else if (variant === 2) {
            // Open gap with wrong answer typed
            feedback[gap.gapId] = "incorrect";
            answers[gap.gapId] = gap.word + "WRONG";
          } else {
            // Open gap with empty answer — should be skipped
            feedback[gap.gapId] = null;
            answers[gap.gapId] = "";
          }
        }

        const result = checkAll(gaps, answers, feedback);

        for (const gap of gapEntries) {
          const wasAlreadyCorrect = feedback[gap.gapId] === "correct";
          const answer = answers[gap.gapId] ?? "";
          const hasNonEmptyAnswer = answer.trim() !== "";

          if (wasAlreadyCorrect) {
            // Already correct gaps remain "correct"
            expect(result[gap.gapId]).toBe("correct");
          } else if (hasNonEmptyAnswer) {
            // Open gaps with non-empty answer must now have feedback
            expect(result[gap.gapId]).not.toBeNull();
            expect(["correct", "incorrect"]).toContain(result[gap.gapId]);
            // Verify feedback matches actual validation
            const expected = validateAnswer(answer, gap.word) ? "correct" : "incorrect";
            expect(result[gap.gapId]).toBe(expected);
          } else {
            // Empty answer gaps remain unchanged
            expect(result[gap.gapId]).toBe(feedback[gap.gapId]);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it("check-all with randomized feedback and answers", () => {
    fc.assert(
      fc.property(
        arbGaps,
        fc.array(fc.tuple(arbFeedback, fc.oneof(arbNonEmptyAnswer, fc.constant(""))), {
          minLength: 1,
          maxLength: 15,
        }),
        (gaps, feedbackAnswerPairs) => {
          const gapEntries = gaps.filter((g) => g.isGap);
          const answers: Record<string, string> = {};
          const feedback: Record<string, FeedbackState> = {};

          // Assign random feedback and answers to each gap
          for (let i = 0; i < gapEntries.length; i++) {
            const gap = gapEntries[i];
            const pair = feedbackAnswerPairs[i % feedbackAnswerPairs.length];
            feedback[gap.gapId] = pair[0];
            answers[gap.gapId] = pair[1];
          }

          const result = checkAll(gaps, answers, feedback);

          for (const gap of gapEntries) {
            const wasAlreadyCorrect = feedback[gap.gapId] === "correct";
            const answer = answers[gap.gapId] ?? "";
            const hasNonEmptyAnswer = answer.trim() !== "";

            if (wasAlreadyCorrect) {
              // Already correct gaps must remain "correct"
              expect(result[gap.gapId]).toBe("correct");
            } else if (hasNonEmptyAnswer) {
              // Open gaps with non-empty answer must have feedback set
              expect(result[gap.gapId]).not.toBeNull();
              expect(["correct", "incorrect"]).toContain(result[gap.gapId]);
              // Verify the feedback is actually correct based on validateAnswer
              const expected = validateAnswer(answer, gap.word) ? "correct" : "incorrect";
              expect(result[gap.gapId]).toBe(expected);
            } else {
              // Empty answer: feedback unchanged from input
              expect(result[gap.gapId]).toBe(feedback[gap.gapId]);
            }
          }

          // Non-gap entries should have no feedback set by checkAll
          const nonGaps = gaps.filter((g) => !g.isGap);
          for (const ng of nonGaps) {
            expect(result[ng.gapId]).toBeUndefined();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
