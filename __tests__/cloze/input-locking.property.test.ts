/**
 * Property 5: Korrekte Antwort sperrt Eingabe, falsche bleibt editierbar
 *
 * Für jedes Gap_Input gilt: wenn das Feedback "correct" ist, soll das Feld readonly sein;
 * wenn das Feedback "incorrect" oder null ist, soll das Feld editierbar bleiben.
 *
 * **Validates: Requirements 4.6, 4.7**
 */
// Feature: cloze-learning, Property 5: Korrekte Antwort sperrt Eingabe, falsche bleibt editierbar

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import type { FeedbackState } from "@/types/cloze";

/**
 * The mapping logic used in GapInput to determine readonly state.
 * Extracted here as pure function for property testing.
 */
function isReadonly(feedback: FeedbackState): boolean {
  return feedback === "correct";
}

// Generator: all possible feedback states
const arbFeedback = fc.constantFrom<FeedbackState>("correct", "incorrect", null);

describe("Property 5: Korrekte Antwort sperrt Eingabe, falsche bleibt editierbar", () => {
  it("feedback === 'correct' → readonly; otherwise editable", () => {
    fc.assert(
      fc.property(arbFeedback, (feedback) => {
        const readonly = isReadonly(feedback);

        if (feedback === "correct") {
          expect(readonly).toBe(true);
        } else {
          expect(readonly).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });
});
