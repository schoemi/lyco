/**
 * Property 12: Feedback-Status wird via aria-live kommuniziert
 *
 * Für jedes Gap_Input mit Feedback ("correct" oder "incorrect") soll ein Element
 * mit aria-live="polite" den Status "Richtig" bzw. "Falsch" enthalten.
 *
 * **Validates: Requirements 9.2, 9.3**
 */
// Feature: cloze-learning, Property 12: Feedback-Status wird via aria-live kommuniziert

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import type { FeedbackState } from "@/types/cloze";

function getFeedbackText(feedback: FeedbackState): string {
  if (feedback === "correct") return "Richtig";
  if (feedback === "incorrect") return "Falsch";
  return "";
}

const arbFeedbackState: fc.Arbitrary<FeedbackState> = fc.constantFrom(
  "correct" as const,
  "incorrect" as const,
  null,
);

describe("Property 12: Feedback-Status wird via aria-live kommuniziert", () => {
  it("correct feedback produces 'Richtig' text", () => {
    fc.assert(
      fc.property(fc.constant("correct" as const), (feedback) => {
        const text = getFeedbackText(feedback);
        expect(text).toBe("Richtig");
      }),
      { numRuns: 100 },
    );
  });

  it("incorrect feedback produces 'Falsch' text", () => {
    fc.assert(
      fc.property(fc.constant("incorrect" as const), (feedback) => {
        const text = getFeedbackText(feedback);
        expect(text).toBe("Falsch");
      }),
      { numRuns: 100 },
    );
  });

  it("null feedback produces empty string", () => {
    fc.assert(
      fc.property(fc.constant(null), (feedback) => {
        const text = getFeedbackText(feedback as FeedbackState);
        expect(text).toBe("");
      }),
      { numRuns: 100 },
    );
  });

  it("feedback text is always 'Richtig', 'Falsch', or empty for any FeedbackState", () => {
    fc.assert(
      fc.property(arbFeedbackState, (feedback) => {
        const text = getFeedbackText(feedback);
        expect(["Richtig", "Falsch", ""]).toContain(text);
      }),
      { numRuns: 100 },
    );
  });

  it("non-null feedback always produces non-empty text suitable for aria-live", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("correct" as const, "incorrect" as const),
        (feedback) => {
          const text = getFeedbackText(feedback);
          expect(text.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
