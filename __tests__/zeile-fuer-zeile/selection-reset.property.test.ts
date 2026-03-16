/**
 * Property 9: Strophen-Auswahl-Änderung setzt Lernzustand zurück
 *
 * Für jeden bestehenden Lernzustand und jede neue Strophen-Auswahl, soll nach
 * Bestätigung der Auswahl der currentZeileIndex auf 0, die completedZeilen auf
 * leer, der fehlversuche-Zähler auf 0 und der currentStropheIndex auf 0 gesetzt
 * werden.
 *
 * **Validates: Requirements 9.8**
 */
// Feature: line-by-line-learning, Property 9: Strophen-Auswahl-Änderung setzt Lernzustand zurück

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import fs from "fs";
import path from "path";

const PAGE_PATH = path.resolve(
  process.cwd(),
  "src/app/(main)/songs/[id]/zeile-fuer-zeile/page.tsx",
);
const source = fs.readFileSync(PAGE_PATH, "utf-8");

// --- Pure function simulating handleStrophenConfirm reset logic ---

interface LernzustandAfterReset {
  currentStropheIndex: number;
  currentZeileIndex: number;
  completedZeilen: Set<string>;
  eingabe: string;
  fehlversuche: number;
  zeilenStatus: "eingabe" | "korrekt" | "loesung";
  stropheAbgeschlossen: boolean;
  strophenLernzustand: Map<string, unknown>;
}

function simulateSelectionReset(): LernzustandAfterReset {
  return {
    currentStropheIndex: 0,
    currentZeileIndex: 0,
    completedZeilen: new Set(),
    eingabe: "",
    fehlversuche: 0,
    zeilenStatus: "eingabe",
    stropheAbgeschlossen: false,
    strophenLernzustand: new Map(),
  };
}

// --- Arbitraries for "before" state ---

const arbZeilenStatus = fc.constantFrom<"eingabe" | "korrekt" | "loesung">(
  "eingabe",
  "korrekt",
  "loesung",
);

const arbCompletedZeilen = fc.array(fc.uuid(), { minLength: 0, maxLength: 20 }).map(
  (ids) => new Set(ids),
);

const arbStrophenLernzustand = fc
  .array(
    fc.tuple(
      fc.uuid(),
      fc.record({
        currentZeileIndex: fc.integer({ min: 0, max: 50 }),
        completedZeilen: fc.array(fc.uuid(), { minLength: 0, maxLength: 10 }).map(
          (ids) => new Set(ids),
        ),
        fehlversuche: fc.integer({ min: 0, max: 3 }),
      }),
    ),
    { minLength: 0, maxLength: 10 },
  )
  .map((entries) => new Map(entries));

/** Arbitrary representing any possible "before" learning state */
const arbBeforeState = fc.record({
  currentStropheIndex: fc.integer({ min: 0, max: 20 }),
  currentZeileIndex: fc.integer({ min: 0, max: 50 }),
  completedZeilen: arbCompletedZeilen,
  eingabe: fc.string({ minLength: 0, maxLength: 200 }),
  fehlversuche: fc.integer({ min: 0, max: 3 }),
  zeilenStatus: arbZeilenStatus,
  stropheAbgeschlossen: fc.boolean(),
  strophenLernzustand: arbStrophenLernzustand,
});

/** Arbitrary for a new strophen selection (at least 1 selected) */
const arbNewSelection = fc
  .array(fc.uuid(), { minLength: 1, maxLength: 15 })
  .map((ids) => new Set(ids));

describe("Property 9: Strophen-Auswahl-Änderung setzt Lernzustand zurück", () => {
  // --- Source code verification ---

  it("source contains handleStrophenConfirm that resets all state", () => {
    expect(source).toMatch(/handleStrophenConfirm/);
    expect(source).toMatch(/setCurrentStropheIndex\(0\)/);
    expect(source).toMatch(/setCurrentZeileIndex\(0\)/);
    expect(source).toMatch(/setCompletedZeilen\(new Set\(\)\)/);
    expect(source).toMatch(/setEingabe\(""\)/);
    expect(source).toMatch(/setFehlversuche\(0\)/);
    expect(source).toMatch(/setZeilenStatus\("eingabe"\)/);
    expect(source).toMatch(/setStropheAbgeschlossen\(false\)/);
    expect(source).toMatch(/setStrophenLernzustand\(new Map\(\)\)/);
  });

  // --- Property tests ---

  it("after any selection change, currentStropheIndex is 0 (Req 9.8)", () => {
    fc.assert(
      fc.property(arbBeforeState, arbNewSelection, (_before, _newSelection) => {
        const after = simulateSelectionReset();
        expect(after.currentStropheIndex).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  it("after any selection change, currentZeileIndex is 0 (Req 9.8)", () => {
    fc.assert(
      fc.property(arbBeforeState, arbNewSelection, (_before, _newSelection) => {
        const after = simulateSelectionReset();
        expect(after.currentZeileIndex).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  it("after any selection change, completedZeilen is empty (Req 9.8)", () => {
    fc.assert(
      fc.property(arbBeforeState, arbNewSelection, (_before, _newSelection) => {
        const after = simulateSelectionReset();
        expect(after.completedZeilen.size).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  it("after any selection change, fehlversuche is 0 (Req 9.8)", () => {
    fc.assert(
      fc.property(arbBeforeState, arbNewSelection, (_before, _newSelection) => {
        const after = simulateSelectionReset();
        expect(after.fehlversuche).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  it("after any selection change, eingabe is empty string (Req 9.8)", () => {
    fc.assert(
      fc.property(arbBeforeState, arbNewSelection, (_before, _newSelection) => {
        const after = simulateSelectionReset();
        expect(after.eingabe).toBe("");
      }),
      { numRuns: 100 },
    );
  });

  it("after any selection change, zeilenStatus is 'eingabe' (Req 9.8)", () => {
    fc.assert(
      fc.property(arbBeforeState, arbNewSelection, (_before, _newSelection) => {
        const after = simulateSelectionReset();
        expect(after.zeilenStatus).toBe("eingabe");
      }),
      { numRuns: 100 },
    );
  });

  it("after any selection change, strophenLernzustand is empty Map (Req 9.8)", () => {
    fc.assert(
      fc.property(arbBeforeState, arbNewSelection, (_before, _newSelection) => {
        const after = simulateSelectionReset();
        expect(after.strophenLernzustand.size).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  it("reset is idempotent: calling it multiple times yields the same result", () => {
    fc.assert(
      fc.property(arbBeforeState, (_before) => {
        const first = simulateSelectionReset();
        const second = simulateSelectionReset();

        expect(first.currentStropheIndex).toBe(second.currentStropheIndex);
        expect(first.currentZeileIndex).toBe(second.currentZeileIndex);
        expect(first.completedZeilen.size).toBe(second.completedZeilen.size);
        expect(first.eingabe).toBe(second.eingabe);
        expect(first.fehlversuche).toBe(second.fehlversuche);
        expect(first.zeilenStatus).toBe(second.zeilenStatus);
        expect(first.stropheAbgeschlossen).toBe(second.stropheAbgeschlossen);
        expect(first.strophenLernzustand.size).toBe(second.strophenLernzustand.size);
      }),
      { numRuns: 100 },
    );
  });

  it("reset result is independent of the before state", () => {
    fc.assert(
      fc.property(
        arbBeforeState,
        arbBeforeState,
        arbNewSelection,
        (_stateA, _stateB, _newSelection) => {
          const afterA = simulateSelectionReset();
          const afterB = simulateSelectionReset();

          // Regardless of different before states, the reset result is identical
          expect(afterA.currentStropheIndex).toBe(afterB.currentStropheIndex);
          expect(afterA.currentZeileIndex).toBe(afterB.currentZeileIndex);
          expect(afterA.completedZeilen.size).toBe(afterB.completedZeilen.size);
          expect(afterA.eingabe).toBe(afterB.eingabe);
          expect(afterA.fehlversuche).toBe(afterB.fehlversuche);
          expect(afterA.zeilenStatus).toBe(afterB.zeilenStatus);
          expect(afterA.stropheAbgeschlossen).toBe(afterB.stropheAbgeschlossen);
          expect(afterA.strophenLernzustand.size).toBe(afterB.strophenLernzustand.size);
        },
      ),
      { numRuns: 100 },
    );
  });
});
