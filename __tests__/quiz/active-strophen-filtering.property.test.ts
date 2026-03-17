/**
 * Property: Active strophen filtering
 *
 * For any SongDetail and activeStrophenIds subset: all generated questions
 * reference only stropheIds from the active set.
 *
 * **Validates: Requirements 10.7**
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  generateMCQuestions,
  generateReihenfolgeQuestions,
  generateDiktatQuestions,
} from "@/lib/quiz/quiz-generator";
import type { SongDetail, StropheDetail, ZeileDetail } from "@/types/song";

// --- Arbitraries (reused pattern from mc-options.property.test.ts) ---

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
 * A StropheDetail with ≥2 lines.
 * We use minLength: 2 so that Reihenfolge questions can also be generated
 * (Reihenfolge skips strophes with ≤1 line).
 */
const arbStrophe = fc
  .record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 20 }),
    orderIndex: fc.nat({ max: 50 }),
    zeilen: fc.array(arbZeile, { minLength: 2, maxLength: 8 }),
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

/** A SongDetail with ≥2 strophes so we can pick a non-trivial subset */
const arbSongDetail = fc
  .record({
    id: fc.uuid(),
    titel: fc.string({ minLength: 1, maxLength: 30 }),
    strophen: fc.array(arbStrophe, { minLength: 2, maxLength: 5 }),
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

/**
 * Given a SongDetail, produce a random non-empty subset of strophe IDs.
 * Uses fc.subarray to pick a subset, ensuring at least 1 element.
 */
function arbActiveStrophenIds(song: SongDetail): fc.Arbitrary<Set<string>> {
  const allIds = song.strophen.map((s) => s.id);
  return fc
    .subarray(allIds, { minLength: 1, maxLength: allIds.length })
    .map((ids) => new Set(ids));
}

// --- Property Tests ---

describe("Property: Active strophen filtering", () => {
  it("generateMCQuestions only references stropheIds from the active set", () => {
    fc.assert(
      fc.property(
        arbSongDetail.chain((song) =>
          fc.tuple(fc.constant(song), arbActiveStrophenIds(song), fc.nat({ max: 999999 })),
        ),
        ([song, activeIds, seed]) => {
          const questions = generateMCQuestions(song, activeIds, seed);

          for (const q of questions) {
            expect(activeIds.has(q.stropheId)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("generateReihenfolgeQuestions only references stropheIds from the active set", () => {
    fc.assert(
      fc.property(
        arbSongDetail.chain((song) =>
          fc.tuple(fc.constant(song), arbActiveStrophenIds(song), fc.nat({ max: 999999 })),
        ),
        ([song, activeIds, seed]) => {
          const questions = generateReihenfolgeQuestions(song, activeIds, seed);

          for (const q of questions) {
            expect(activeIds.has(q.stropheId)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("generateDiktatQuestions only references stropheIds from the active set", () => {
    fc.assert(
      fc.property(
        arbSongDetail.chain((song) =>
          fc.tuple(fc.constant(song), arbActiveStrophenIds(song), fc.nat({ max: 999999 })),
        ),
        ([song, activeIds, seed]) => {
          const questions = generateDiktatQuestions(song, activeIds, seed);

          for (const q of questions) {
            expect(activeIds.has(q.stropheId)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
