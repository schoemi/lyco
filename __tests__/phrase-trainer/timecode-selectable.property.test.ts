/**
 * Feature: phrase-trainer, Property 2: Strophen ohne Timecode sind nicht auswählbar
 *
 * Für jede Strophe eines Songs gilt: Die Strophe ist genau dann auswählbar,
 * wenn sie einen Markup-Eintrag mit typ === 'TIMECODE', ziel === 'STROPHE'
 * und timecodeMs != null besitzt.
 *
 * **Validates: Requirements 1.5**
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { hatTimecode } from "@/lib/phrase-trainer/utils";
import type { StropheDetail, MarkupResponse } from "@/types/song";

// --- Generators ---

/** Generator for a valid TIMECODE/STROPHE markup with a non-null timecodeMs */
const timecodeStropheMarkup: fc.Arbitrary<MarkupResponse> = fc
  .tuple(
    fc.uuid(),
    fc.integer({ min: 0, max: 600_000 }), // timecodeMs 0–10 min
  )
  .map(([id, ms]) => ({
    id,
    typ: "TIMECODE" as const,
    ziel: "STROPHE" as const,
    wert: null,
    timecodeMs: ms,
    wortIndex: null,
  }));

/** Generator for a TIMECODE/STROPHE markup with timecodeMs === null */
const timecodeNullMarkup: fc.Arbitrary<MarkupResponse> = fc.uuid().map((id) => ({
  id,
  typ: "TIMECODE" as const,
  ziel: "STROPHE" as const,
  wert: null,
  timecodeMs: null,
  wortIndex: null,
}));

/** Generator for non-TIMECODE markup types */
const nonTimecodeTyp = fc.constantFrom(
  "PAUSE" as const,
  "WIEDERHOLUNG" as const,
  "ATMUNG" as const,
  "KOPFSTIMME" as const,
  "BRUSTSTIMME" as const,
  "BELT" as const,
  "FALSETT" as const,
);

/** Generator for a markup that is NOT a valid timecode for strophe selection */
const nonTimecodeMarkup: fc.Arbitrary<MarkupResponse> = fc
  .tuple(
    fc.uuid(),
    nonTimecodeTyp,
    fc.constantFrom("STROPHE" as const, "ZEILE" as const, "WORT" as const),
    fc.option(fc.integer({ min: 0, max: 600_000 }), { nil: undefined }),
  )
  .map(([id, typ, ziel, ms]) => ({
    id,
    typ,
    ziel,
    wert: null,
    timecodeMs: ms ?? null,
    wortIndex: null,
  }));

/** Generator for a TIMECODE markup targeting ZEILE (not STROPHE) */
const timecodeZeileMarkup: fc.Arbitrary<MarkupResponse> = fc
  .tuple(fc.uuid(), fc.integer({ min: 0, max: 600_000 }))
  .map(([id, ms]) => ({
    id,
    typ: "TIMECODE" as const,
    ziel: "ZEILE" as const,
    wert: null,
    timecodeMs: ms,
    wortIndex: null,
  }));

/** Builds a minimal StropheDetail with the given markups */
function makeStrophe(markups: MarkupResponse[]): StropheDetail {
  return {
    id: "strophe-1",
    name: "Test Strophe",
    orderIndex: 0,
    progress: 0,
    notiz: null,
    analyse: null,
    istInstrumental: false,
    zeilen: [],
    markups,
  };
}

// --- Property Tests ---

describe("Feature: phrase-trainer, Property 2: Strophen ohne Timecode sind nicht auswählbar", () => {
  it("returns true when strophe has a TIMECODE/STROPHE markup with non-null timecodeMs", () => {
    fc.assert(
      fc.property(
        timecodeStropheMarkup,
        fc.array(nonTimecodeMarkup, { minLength: 0, maxLength: 5 }),
        (tcMarkup, otherMarkups) => {
          // Insert the valid timecode markup at a random position among other markups
          const allMarkups = [...otherMarkups, tcMarkup];
          const strophe = makeStrophe(allMarkups);
          expect(hatTimecode(strophe)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("returns false when strophe has no TIMECODE markups at all", () => {
    fc.assert(
      fc.property(
        fc.array(nonTimecodeMarkup, { minLength: 0, maxLength: 5 }),
        (markups) => {
          const strophe = makeStrophe(markups);
          expect(hatTimecode(strophe)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("returns false when TIMECODE markup has timecodeMs === null", () => {
    fc.assert(
      fc.property(
        timecodeNullMarkup,
        fc.array(nonTimecodeMarkup, { minLength: 0, maxLength: 5 }),
        (tcNullMarkup, otherMarkups) => {
          const allMarkups = [...otherMarkups, tcNullMarkup];
          const strophe = makeStrophe(allMarkups);
          expect(hatTimecode(strophe)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("returns false when TIMECODE markup targets ZEILE instead of STROPHE", () => {
    fc.assert(
      fc.property(
        timecodeZeileMarkup,
        fc.array(nonTimecodeMarkup, { minLength: 0, maxLength: 5 }),
        (tcZeileMarkup, otherMarkups) => {
          const allMarkups = [...otherMarkups, tcZeileMarkup];
          const strophe = makeStrophe(allMarkups);
          expect(hatTimecode(strophe)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("selectability is exactly determined by presence of valid TIMECODE/STROPHE markup", () => {
    // Combined property: generate a strophe with random markups and verify
    // hatTimecode matches the manual check
    const anyMarkup = fc.oneof(
      timecodeStropheMarkup,
      timecodeNullMarkup,
      timecodeZeileMarkup,
      nonTimecodeMarkup,
    );

    fc.assert(
      fc.property(
        fc.array(anyMarkup, { minLength: 0, maxLength: 8 }),
        (markups) => {
          const strophe = makeStrophe(markups);

          const expectedSelectable = markups.some(
            (m) =>
              m.typ === "TIMECODE" &&
              m.ziel === "STROPHE" &&
              m.timecodeMs != null,
          );

          expect(hatTimecode(strophe)).toBe(expectedSelectable);
        },
      ),
      { numRuns: 100 },
    );
  });
});
