/**
 * Property: MC options count and correctness
 *
 * For any SongDetail with ≥1 line: every generated MCQuestion has
 * `options.length === 4` and `options[correctIndex]` is the correct word.
 *
 * **Validates: Requirements 2.2, 2.3**
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { generateMCQuestions } from "@/lib/quiz/quiz-generator";
import type { SongDetail, StropheDetail, ZeileDetail } from "@/types/song";

// --- Arbitraries ---

/** A single word: 1–10 alpha characters */
const arbWord = fc.stringMatching(/^[a-zA-Z]{1,10}$/);

/** A line of text with ≥1 word */
const arbLineText = fc
  .array(arbWord, { minLength: 1, maxLength: 12 })
  .map((words) => words.join(" "));

/** A ZeileDetail with a non-empty text */
const arbZeile = fc
  .record({
    id: fc.uuid(),
    text: arbLineText,
    orderIndex: fc.nat({ max: 100 }),
  })
  .map(
    (r): ZeileDetail => ({
      id: r.id,
      text: r.text,
      uebersetzung: null,
      orderIndex: r.orderIndex,
      markups: [],
    }),
  );

/** A StropheDetail with ≥1 line */
const arbStrophe = fc
  .record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 20 }),
    orderIndex: fc.nat({ max: 50 }),
    zeilen: fc.array(arbZeile, { minLength: 1, maxLength: 8 }),
  })
  .map(
    (r): StropheDetail => ({
      id: r.id,
      name: r.name,
      orderIndex: r.orderIndex,
      progress: 0,
      notiz: null,
      analyse: null,
      zeilen: r.zeilen,
      markups: [],
    }),
  );

/** A SongDetail with ≥1 strophe (each with ≥1 line) */
const arbSongDetail = fc
  .record({
    id: fc.uuid(),
    titel: fc.string({ minLength: 1, maxLength: 30 }),
    strophen: fc.array(arbStrophe, { minLength: 1, maxLength: 5 }),
  })
  .map(
    (r): SongDetail => ({
      id: r.id,
      titel: r.titel,
      kuenstler: null,
      sprache: null,
      emotionsTags: [],
      progress: 0,
      sessionCount: 0,
      analyse: null,
      coachTipp: null,
      strophen: r.strophen,
    }),
  );

// --- Property Test ---

describe("Property: MC options count and correctness", () => {
  it("every MCQuestion has exactly 4 options and options[correctIndex] is the correct word", () => {
    fc.assert(
      fc.property(arbSongDetail, fc.nat({ max: 999999 }), (song, seed) => {
        const questions = generateMCQuestions(song, undefined, seed);

        // Should generate at least 1 question (song has ≥1 strophe with ≥1 line)
        expect(questions.length).toBeGreaterThan(0);

        for (const q of questions) {
          // Exactly 4 options (Req 2.2)
          expect(q.options).toHaveLength(4);

          // correctIndex is a valid index
          expect(q.correctIndex).toBeGreaterThanOrEqual(0);
          expect(q.correctIndex).toBeLessThan(4);

          // Find the original line to extract the correct word
          const strophe = song.strophen.find((s) => s.id === q.stropheId);
          expect(strophe).toBeDefined();
          const zeile = strophe!.zeilen.find((z) => z.id === q.zeileId);
          expect(zeile).toBeDefined();

          const words = zeile!.text.split(/\s+/).filter((w) => w.length > 0);
          // The correct answer must be a word from the original line
          const correctOption = q.options[q.correctIndex];
          expect(words).toContain(correctOption);
        }
      }),
      { numRuns: 100 },
    );
  });
});
