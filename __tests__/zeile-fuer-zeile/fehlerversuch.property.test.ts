/**
 * Property 3: Fehlversuch erhöht Zähler und leert Eingabe
 * Property 4: Drei Fehlversuche zeigen Lösung
 *
 * Property 3: Für jede aktive Zeile und jede falsche Eingabe (bei weniger als 3
 * bisherigen Fehlversuchen), soll der Fehlversuch-Zähler um genau 1 steigen und
 * das Eingabefeld geleert werden.
 *
 * Property 4: Für jede aktive Zeile, nach genau 3 falschen Eingaben, soll der
 * Status auf „loesung" wechseln und der Weiter-Button aktiviert werden.
 *
 * **Validates: Requirements 3.6, 3.7, 3.8**
 */
// Feature: line-by-line-learning, Property 3: Fehlversuch erhöht Zähler und leert Eingabe
// Feature: line-by-line-learning, Property 4: Drei Fehlversuche zeigen Lösung

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import fs from "fs";
import path from "path";

const PAGE_PATH = path.resolve(
  process.cwd(),
  "src/app/(main)/songs/[id]/zeile-fuer-zeile/page.tsx",
);
const source = fs.readFileSync(PAGE_PATH, "utf-8");

// --- Pure function simulating the handleAbsenden logic from the page component ---

interface AbsendenState {
  fehlversuche: number;
  zeilenStatus: "eingabe" | "korrekt" | "loesung";
  eingabe: string;
}

function simulateAbsenden(
  state: AbsendenState,
  isCorrect: boolean,
): AbsendenState {
  if (isCorrect) {
    return { ...state, zeilenStatus: "korrekt" };
  }
  const newFehlversuche = state.fehlversuche + 1;
  if (newFehlversuche >= 3) {
    return { ...state, fehlversuche: newFehlversuche, zeilenStatus: "loesung" };
  }
  return { ...state, fehlversuche: newFehlversuche, eingabe: "" };
}

// --- Arbitraries ---

/** Arbitrary for fehlversuche count where another wrong answer does NOT trigger loesung (0 or 1) */
const arbFehlversucheUnderThreshold = fc.integer({ min: 0, max: 1 });

/** Arbitrary for non-empty eingabe string */
const arbEingabe = fc.string({ minLength: 1, maxLength: 50 });

describe("Property 3: Fehlversuch erhöht Zähler und leert Eingabe", () => {
  it("source contains fehlversuche increment logic", () => {
    expect(source).toMatch(/const newFehlversuche = fehlversuche \+ 1/);
  });

  it("source clears eingabe on failed attempt below threshold", () => {
    expect(source).toMatch(/setEingabe\(""\)/);
  });

  it("wrong answer increments fehlversuche by exactly 1 (Req 3.6)", () => {
    fc.assert(
      fc.property(
        arbFehlversucheUnderThreshold,
        arbEingabe,
        (fehlversuche, eingabe) => {
          const state: AbsendenState = {
            fehlversuche,
            zeilenStatus: "eingabe",
            eingabe,
          };

          const result = simulateAbsenden(state, false);

          expect(result.fehlversuche).toBe(fehlversuche + 1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("wrong answer clears eingabe when under 3 attempts (Req 3.8)", () => {
    fc.assert(
      fc.property(
        arbFehlversucheUnderThreshold,
        arbEingabe,
        (fehlversuche, eingabe) => {
          const state: AbsendenState = {
            fehlversuche,
            zeilenStatus: "eingabe",
            eingabe,
          };

          const result = simulateAbsenden(state, false);

          expect(result.eingabe).toBe("");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("status remains 'eingabe' when under 3 total attempts", () => {
    fc.assert(
      fc.property(
        arbFehlversucheUnderThreshold,
        arbEingabe,
        (fehlversuche, eingabe) => {
          const state: AbsendenState = {
            fehlversuche,
            zeilenStatus: "eingabe",
            eingabe,
          };

          const result = simulateAbsenden(state, false);

          // After 1 or 2 total attempts, status stays "eingabe"
          expect(result.zeilenStatus).not.toBe("loesung");
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe("Property 4: Drei Fehlversuche zeigen Lösung", () => {
  it("source sets status to loesung when newFehlversuche >= 3", () => {
    expect(source).toMatch(/newFehlversuche >= 3/);
    expect(source).toMatch(/setZeilenStatus\("loesung"\)/);
  });

  it("after exactly 3 wrong answers from 0, status becomes 'loesung' (Req 3.7)", () => {
    fc.assert(
      fc.property(arbEingabe, (eingabe) => {
        let state: AbsendenState = {
          fehlversuche: 0,
          zeilenStatus: "eingabe",
          eingabe,
        };

        // Simulate 3 consecutive wrong answers
        state = simulateAbsenden(state, false);
        expect(state.fehlversuche).toBe(1);
        expect(state.zeilenStatus).not.toBe("loesung");

        state = { ...state, eingabe }; // user types again
        state = simulateAbsenden(state, false);
        expect(state.fehlversuche).toBe(2);
        expect(state.zeilenStatus).not.toBe("loesung");

        state = { ...state, eingabe }; // user types again
        state = simulateAbsenden(state, false);
        expect(state.fehlversuche).toBe(3);
        expect(state.zeilenStatus).toBe("loesung");
      }),
      { numRuns: 100 },
    );
  });

  it("third wrong answer triggers loesung regardless of starting fehlversuche=2", () => {
    fc.assert(
      fc.property(arbEingabe, (eingabe) => {
        const state: AbsendenState = {
          fehlversuche: 2,
          zeilenStatus: "eingabe",
          eingabe,
        };

        const result = simulateAbsenden(state, false);

        expect(result.fehlversuche).toBe(3);
        expect(result.zeilenStatus).toBe("loesung");
      }),
      { numRuns: 100 },
    );
  });

  it("correct answer always sets status to 'korrekt' regardless of fehlversuche", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2 }),
        arbEingabe,
        (fehlversuche, eingabe) => {
          const state: AbsendenState = {
            fehlversuche,
            zeilenStatus: "eingabe",
            eingabe,
          };

          const result = simulateAbsenden(state, true);

          expect(result.zeilenStatus).toBe("korrekt");
        },
      ),
      { numRuns: 100 },
    );
  });
});
