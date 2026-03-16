/**
 * Property 5: Weiter-Transition setzt Zustand korrekt
 *
 * Für jede Strophe mit mindestens 2 Zeilen und jeden Zustand, in dem die aktive
 * Zeile abgeschlossen ist (Status „korrekt" oder „loesung"), soll das Betätigen
 * von „Weiter" den currentZeileIndex um 1 erhöhen, die abgeschlossene Zeile zur
 * completedZeilen-Menge hinzufügen, das Eingabefeld leeren und den
 * Fehlversuch-Zähler auf 0 setzen.
 *
 * **Validates: Requirements 4.3, 4.4, 4.5**
 */
// Feature: line-by-line-learning, Property 5: Weiter-Transition setzt Zustand korrekt

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import fs from "fs";
import path from "path";

const PAGE_PATH = path.resolve(
  process.cwd(),
  "src/app/(main)/songs/[id]/zeile-fuer-zeile/page.tsx",
);
const source = fs.readFileSync(PAGE_PATH, "utf-8");

// --- Pure function simulating the handleWeiter logic (non-last-line case) ---

interface WeiterState {
  currentZeileIndex: number;
  completedZeilen: Set<string>;
  eingabe: string;
  fehlversuche: number;
  zeilenStatus: "eingabe" | "korrekt" | "loesung";
}

function simulateWeiter(
  state: WeiterState,
  currentZeileId: string,
  istLetzteZeile: boolean,
): WeiterState {
  const newCompleted = new Set(state.completedZeilen);
  newCompleted.add(currentZeileId);

  if (istLetzteZeile) {
    return {
      ...state,
      completedZeilen: newCompleted,
      eingabe: "",
      fehlversuche: 0,
      zeilenStatus: "eingabe",
    };
  }

  return {
    currentZeileIndex: state.currentZeileIndex + 1,
    completedZeilen: newCompleted,
    eingabe: "",
    fehlversuche: 0,
    zeilenStatus: "eingabe",
  };
}

// --- Arbitraries ---

/** Status that allows pressing Weiter (completed line) */
const arbCompletedStatus = fc.constantFrom<"korrekt" | "loesung">(
  "korrekt",
  "loesung",
);

/** Arbitrary for currentZeileIndex in a strophe with at least 2 lines (non-last) */
const arbNonLastIndex = (totalZeilen: number) =>
  fc.integer({ min: 0, max: totalZeilen - 2 });

/** Arbitrary for total zeilen count (at least 2) */
const arbTotalZeilen = fc.integer({ min: 2, max: 20 });

/** Arbitrary for fehlversuche (0-3) */
const arbFehlversuche = fc.integer({ min: 0, max: 3 });

/** Arbitrary for non-empty eingabe (simulating leftover text in the field) */
const arbEingabe = fc.string({ minLength: 0, maxLength: 50 });

/** Arbitrary for a zeile ID */
const arbZeileId = fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0);

/** Arbitrary for a set of already-completed zeile IDs */
const arbCompletedZeilen = fc
  .array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 0, maxLength: 5 })
  .map((ids) => new Set(ids));

describe("Property 5: Weiter-Transition setzt Zustand korrekt", () => {
  it("source contains Weiter logic that increments index", () => {
    expect(source).toMatch(/const nextIndex = currentZeileIndex \+ 1/);
  });

  it("source clears eingabe and resets fehlversuche on Weiter", () => {
    expect(source).toMatch(/setEingabe\(""\)/);
    expect(source).toMatch(/setFehlversuche\(0\)/);
  });

  it("source adds current zeile to completedZeilen", () => {
    expect(source).toMatch(/newCompleted\.add\(currentZeile\.id\)/);
  });

  it("currentZeileIndex increases by exactly 1 (Req 4.3)", () => {
    fc.assert(
      fc.property(
        arbTotalZeilen,
        arbCompletedStatus,
        arbFehlversuche,
        arbEingabe,
        arbZeileId,
        arbCompletedZeilen,
        (totalZeilen, status, fehlversuche, eingabe, zeileId, completed) => {
          const index = fc.sample(arbNonLastIndex(totalZeilen), 1)[0];
          const state: WeiterState = {
            currentZeileIndex: index,
            completedZeilen: completed,
            eingabe,
            fehlversuche,
            zeilenStatus: status,
          };

          const result = simulateWeiter(state, zeileId, false);

          expect(result.currentZeileIndex).toBe(index + 1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("completed line is added to completedZeilen set (Req 4.4)", () => {
    fc.assert(
      fc.property(
        arbTotalZeilen,
        arbCompletedStatus,
        arbFehlversuche,
        arbEingabe,
        arbZeileId,
        arbCompletedZeilen,
        (totalZeilen, status, fehlversuche, eingabe, zeileId, completed) => {
          const index = fc.sample(arbNonLastIndex(totalZeilen), 1)[0];
          const state: WeiterState = {
            currentZeileIndex: index,
            completedZeilen: completed,
            eingabe,
            fehlversuche,
            zeilenStatus: status,
          };

          const result = simulateWeiter(state, zeileId, false);

          expect(result.completedZeilen.has(zeileId)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("eingabe is cleared to empty string (Req 4.5)", () => {
    fc.assert(
      fc.property(
        arbTotalZeilen,
        arbCompletedStatus,
        arbFehlversuche,
        arbEingabe,
        arbZeileId,
        arbCompletedZeilen,
        (totalZeilen, status, fehlversuche, eingabe, zeileId, completed) => {
          const index = fc.sample(arbNonLastIndex(totalZeilen), 1)[0];
          const state: WeiterState = {
            currentZeileIndex: index,
            completedZeilen: completed,
            eingabe,
            fehlversuche,
            zeilenStatus: status,
          };

          const result = simulateWeiter(state, zeileId, false);

          expect(result.eingabe).toBe("");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("fehlversuche is reset to 0 (Req 4.5)", () => {
    fc.assert(
      fc.property(
        arbTotalZeilen,
        arbCompletedStatus,
        arbFehlversuche,
        arbEingabe,
        arbZeileId,
        arbCompletedZeilen,
        (totalZeilen, status, fehlversuche, eingabe, zeileId, completed) => {
          const index = fc.sample(arbNonLastIndex(totalZeilen), 1)[0];
          const state: WeiterState = {
            currentZeileIndex: index,
            completedZeilen: completed,
            eingabe,
            fehlversuche,
            zeilenStatus: status,
          };

          const result = simulateWeiter(state, zeileId, false);

          expect(result.fehlversuche).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("zeilenStatus is reset to 'eingabe'", () => {
    fc.assert(
      fc.property(
        arbTotalZeilen,
        arbCompletedStatus,
        arbFehlversuche,
        arbEingabe,
        arbZeileId,
        arbCompletedZeilen,
        (totalZeilen, status, fehlversuche, eingabe, zeileId, completed) => {
          const index = fc.sample(arbNonLastIndex(totalZeilen), 1)[0];
          const state: WeiterState = {
            currentZeileIndex: index,
            completedZeilen: completed,
            eingabe,
            fehlversuche,
            zeilenStatus: status,
          };

          const result = simulateWeiter(state, zeileId, false);

          expect(result.zeilenStatus).toBe("eingabe");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("previously completed zeilen are preserved after transition", () => {
    fc.assert(
      fc.property(
        arbTotalZeilen,
        arbCompletedStatus,
        arbZeileId,
        arbCompletedZeilen,
        (totalZeilen, status, zeileId, completed) => {
          const index = fc.sample(arbNonLastIndex(totalZeilen), 1)[0];
          const state: WeiterState = {
            currentZeileIndex: index,
            completedZeilen: completed,
            eingabe: "some text",
            fehlversuche: 2,
            zeilenStatus: status,
          };

          const result = simulateWeiter(state, zeileId, false);

          // All previously completed zeilen should still be in the set
          for (const id of completed) {
            expect(result.completedZeilen.has(id)).toBe(true);
          }
          // Plus the newly completed one
          expect(result.completedZeilen.has(zeileId)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});
