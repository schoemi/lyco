/**
 * Property: Reihenfolge skips single-line strophes
 *
 * For any SongDetail: no ReihenfolgeQuestion has a strophe with fewer than 2 lines.
 *
 * **Validates: Requirements 4.7**
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { generateReihenfolgeQuestions } from "@/lib/quiz/quiz-generator";
import type { SongDetail, StropheDetail, ZeileDetail } from "@/types/song";

// --- Arbitraries (reused from mc-options.property.test.ts) ---

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

/**
 * A StropheDetail with a variable number of lines (0, 1, or more).
 * This is intentionally different from the MC test's arbStrophe which
 * always has ≥1 line — here we need to exercise the skip logic.
 */
const arbStrophe = fc
  .record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 20 }),
    orderIndex: fc.nat({ max: 50 }),
    zeilen: fc.array(arbZeile, { minLength: 0, maxLength: 8 }),
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

/** A SongDetail with ≥1 strophe (lines may vary: 0, 1, or many) */
const arbSongDetail = fc
  .record({
    id: fc.uuid(),
    titel: fc.string({ minLength: 1, maxLength: 30 }),
    strophen: fc.array(arbStrophe, { minLength: 1, maxLength: 6 }),
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
      audioQuellen: [],
    }),
  );

// --- Property Test ---

describe("Property: Reihenfolge skips single-line strophes", () => {
  it("no ReihenfolgeQuestion references a strophe with fewer than 2 lines", () => {
    fc.assert(
      fc.property(arbSongDetail, fc.nat({ max: 999999 }), (song, seed) => {
        const questions = generateReihenfolgeQuestions(song, undefined, seed);

        // Build a lookup: stropheId → line count in the original song
        const lineCountByStrophe = new Map<string, number>();
        for (const strophe of song.strophen) {
          lineCountByStrophe.set(strophe.id, strophe.zeilen.length);
        }

        for (const q of questions) {
          const lineCount = lineCountByStrophe.get(q.stropheId);
          expect(lineCount).toBeDefined();
          // Req 4.7: strophes with ≤1 line must be skipped
          expect(lineCount).toBeGreaterThanOrEqual(2);

          // Every question must have ≥2 shuffled lines
          expect(q.shuffledZeilen.length).toBeGreaterThanOrEqual(2);
        }
      }),
      { numRuns: 100 },
    );
  });
});
