/**
 * Feature: smart-song-analysis, Property 2: Antwort-Validierung lehnt ungültiges JSON ab
 *
 * For every arbitrary string that is not valid JSON or does not match the expected schema
 * (missing fields, wrong types, wrong strophen count), the validation function shall
 * reject the string and return a descriptive error message.
 *
 * **Validates: Requirements 6.5, 6.6**
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { validateAnalyseResponse } from "@/lib/services/analyse-service";

// --- Generators ---

/** Positive integer for strophenCount (1-10) */
const strophenCountArb = fc.integer({ min: 1, max: 10 });

/** Non-empty trimmed string */
const nonEmptyStringArb = fc
  .stringMatching(/^[A-Za-z0-9 ]{1,40}$/)
  .filter((s) => s.trim().length > 0)
  .map((s) => s.trim());

/** A valid stropheAnalyse object */
const validStropheAnalyseArb = (index: number) =>
  fc.record({
    stropheIndex: fc.constant(index),
    analyse: nonEmptyStringArb,
  });

/** Build a valid response JSON for a given strophenCount */
const validResponseArb = (count: number) =>
  fc.record({
    songAnalyse: nonEmptyStringArb,
    emotionsTags: fc.array(nonEmptyStringArb, { minLength: 1, maxLength: 5 }),
    strophenAnalysen: fc
      .tuple(...Array.from({ length: count }, (_, i) => validStropheAnalyseArb(i)))
      .map((arr) => arr),
  });

// --- Invalid case generators ---

/** 1. Not valid JSON at all */
const notJsonArb = fc
  .stringMatching(/^[A-Za-z0-9!@#$%^&*() ]{1,80}$/)
  .filter((s) => {
    try {
      JSON.parse(s);
      return false;
    } catch {
      return true;
    }
  });

/** 2. Valid JSON but not an object (arrays, primitives) */
const jsonNonObjectArb = fc.oneof(
  fc.constant("42"),
  fc.constant('"hello"'),
  fc.constant("true"),
  fc.constant("null"),
  fc.constant("[1,2,3]")
);

/** 3. Missing songAnalyse field */
const missingSongAnalyseArb = strophenCountArb.chain((count) =>
  validResponseArb(count).map((resp) => {
    const { songAnalyse: _, ...rest } = resp;
    return JSON.stringify(rest);
  })
);

/** 4. Empty songAnalyse */
const emptySongAnalyseArb = strophenCountArb.chain((count) =>
  validResponseArb(count).map((resp) =>
    JSON.stringify({ ...resp, songAnalyse: "   " })
  )
);

/** 5. songAnalyse is not a string */
const wrongTypeSongAnalyseArb = strophenCountArb.chain((count) =>
  validResponseArb(count).map((resp) =>
    JSON.stringify({ ...resp, songAnalyse: 123 })
  )
);

/** 6. emotionsTags is not an array */
const emotionsTagsNotArrayArb = strophenCountArb.chain((count) =>
  validResponseArb(count).map((resp) =>
    JSON.stringify({ ...resp, emotionsTags: "not-an-array" })
  )
);

/** 7. emotionsTags contains non-strings */
const emotionsTagsNonStringsArb = strophenCountArb.chain((count) =>
  validResponseArb(count).map((resp) =>
    JSON.stringify({ ...resp, emotionsTags: [1, 2, 3] })
  )
);

/** 8. strophenAnalysen is not an array */
const strophenAnalysenNotArrayArb = strophenCountArb.chain((count) =>
  validResponseArb(count).map((resp) =>
    JSON.stringify({ ...resp, strophenAnalysen: "not-an-array" })
  )
);

/** 9. strophenAnalysen items have wrong structure (missing fields) */
const strophenAnalysenWrongStructureArb = strophenCountArb.chain((count) =>
  validResponseArb(count).map((resp) =>
    JSON.stringify({
      ...resp,
      strophenAnalysen: [null, "string", 42].slice(0, Math.max(count, 1)),
    })
  )
);

/** 10. stropheIndex is not a number */
const stropheIndexNotNumberArb = strophenCountArb.chain((count) =>
  validResponseArb(count).map((resp) =>
    JSON.stringify({
      ...resp,
      strophenAnalysen: resp.strophenAnalysen.map((s) => ({
        ...s,
        stropheIndex: "not-a-number",
      })),
    })
  )
);

/** 11. analyse in strophenAnalysen is not a string */
const stropheAnalyseNotStringArb = strophenCountArb.chain((count) =>
  validResponseArb(count).map((resp) =>
    JSON.stringify({
      ...resp,
      strophenAnalysen: resp.strophenAnalysen.map((s) => ({
        ...s,
        analyse: 999,
      })),
    })
  )
);

/** 12. Wrong strophen count (mismatch) */
const wrongStrophenCountArb = fc
  .record({
    expected: fc.integer({ min: 1, max: 10 }),
    extra: fc.integer({ min: 1, max: 5 }),
  })
  .filter(({ expected, extra }) => expected !== expected + extra)
  .chain(({ expected, extra }) =>
    validResponseArb(expected + extra).map((resp) => ({
      raw: JSON.stringify(resp),
      strophenCount: expected,
      actual: expected + extra,
    }))
  );

// --- Property Tests ---

describe("Feature: smart-song-analysis, Property 2: Antwort-Validierung lehnt ungültiges JSON ab", () => {
  /**
   * **Validates: Requirements 6.5, 6.6**
   */

  it("rejects strings that are not valid JSON", () => {
    fc.assert(
      fc.property(notJsonArb, strophenCountArb, (raw, count) => {
        expect(() => validateAnalyseResponse(raw, count)).toThrow(
          "Die Analyse konnte nicht verarbeitet werden"
        );
      }),
      { numRuns: 100 }
    );
  });

  it("rejects valid JSON that is not an object", () => {
    fc.assert(
      fc.property(jsonNonObjectArb, strophenCountArb, (raw, count) => {
        expect(() => validateAnalyseResponse(raw, count)).toThrow(
          "Die Analyse konnte nicht verarbeitet werden"
        );
      }),
      { numRuns: 100 }
    );
  });

  it("rejects when songAnalyse field is missing", () => {
    fc.assert(
      fc.property(missingSongAnalyseArb, strophenCountArb, (raw, count) => {
        expect(() => validateAnalyseResponse(raw, count)).toThrow(
          "songAnalyse muss ein nicht-leerer String sein"
        );
      }),
      { numRuns: 100 }
    );
  });

  it("rejects when songAnalyse is empty/whitespace", () => {
    fc.assert(
      fc.property(emptySongAnalyseArb, strophenCountArb, (raw, count) => {
        expect(() => validateAnalyseResponse(raw, count)).toThrow(
          "songAnalyse muss ein nicht-leerer String sein"
        );
      }),
      { numRuns: 100 }
    );
  });

  it("rejects when songAnalyse is not a string", () => {
    fc.assert(
      fc.property(wrongTypeSongAnalyseArb, strophenCountArb, (raw, count) => {
        expect(() => validateAnalyseResponse(raw, count)).toThrow(
          "songAnalyse muss ein nicht-leerer String sein"
        );
      }),
      { numRuns: 100 }
    );
  });

  it("rejects when emotionsTags is not an array", () => {
    fc.assert(
      fc.property(emotionsTagsNotArrayArb, strophenCountArb, (raw, count) => {
        expect(() => validateAnalyseResponse(raw, count)).toThrow(
          "emotionsTags muss ein Array sein"
        );
      }),
      { numRuns: 100 }
    );
  });

  it("rejects when emotionsTags contains non-strings", () => {
    fc.assert(
      fc.property(emotionsTagsNonStringsArb, strophenCountArb, (raw, count) => {
        expect(() => validateAnalyseResponse(raw, count)).toThrow(
          "emotionsTags muss ein Array von Strings sein"
        );
      }),
      { numRuns: 100 }
    );
  });

  it("rejects when strophenAnalysen is not an array", () => {
    fc.assert(
      fc.property(
        strophenAnalysenNotArrayArb,
        strophenCountArb,
        (raw, count) => {
          expect(() => validateAnalyseResponse(raw, count)).toThrow(
            "strophenAnalysen muss ein Array sein"
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it("rejects when strophenAnalysen items have wrong structure", () => {
    fc.assert(
      fc.property(
        strophenAnalysenWrongStructureArb,
        strophenCountArb,
        (raw, count) => {
          expect(() => validateAnalyseResponse(raw, count)).toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  it("rejects when stropheIndex is not a number", () => {
    fc.assert(
      fc.property(
        stropheIndexNotNumberArb,
        strophenCountArb,
        (raw, count) => {
          expect(() => validateAnalyseResponse(raw, count)).toThrow(
            "stropheIndex muss eine Zahl sein"
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it("rejects when analyse in strophenAnalysen is not a string", () => {
    fc.assert(
      fc.property(
        stropheAnalyseNotStringArb,
        strophenCountArb,
        (raw, count) => {
          expect(() => validateAnalyseResponse(raw, count)).toThrow(
            "analyse muss ein String sein"
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it("rejects when strophen count does not match expected", () => {
    fc.assert(
      fc.property(wrongStrophenCountArb, ({ raw, strophenCount }) => {
        expect(() => validateAnalyseResponse(raw, strophenCount)).toThrow(
          /Erwartete \d+ Strophen-Analysen, aber \d+ erhalten/
        );
      }),
      { numRuns: 100 }
    );
  });
});
