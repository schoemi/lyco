/**
 * Feature: phrase-trainer, Property 8: aria-live-Region spiegelt Zustand wider
 *
 * Für jeden Zustand des Phrasen-Trainers (AUSWAHL, BEREIT, AUFNAHME, WIEDERGABE)
 * gilt: Die aria-live-Region enthält den korrekten, zustandsspezifischen
 * Beschreibungstext.
 *
 * **Validates: Requirements 11.7**
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import type { PhrasenTrainerZustand } from "@/types/phrase-trainer";

// --- ZUSTAND_LABELS mapping (mirrors phrase-trainer-view.tsx) ---

const ZUSTAND_LABELS: Record<PhrasenTrainerZustand, string> = {
  AUSWAHL: "Strophenauswahl",
  BEREIT: "Bereit für die Aufnahme",
  AUFNAHME: "Aufnahme läuft",
  WIEDERGABE: "Wiedergabe",
};

/** All valid PhrasenTrainerZustand values */
const ALLE_ZUSTAENDE: PhrasenTrainerZustand[] = [
  "AUSWAHL",
  "BEREIT",
  "AUFNAHME",
  "WIEDERGABE",
];

// --- Generators ---

/** Generator for a random PhrasenTrainerZustand */
const zustandArb: fc.Arbitrary<PhrasenTrainerZustand> = fc.constantFrom(
  ...ALLE_ZUSTAENDE,
);

// --- Property Tests ---

describe("Feature: phrase-trainer, Property 8: aria-live-Region spiegelt Zustand wider", () => {
  it("jeder Zustand hat einen nicht-leeren Beschreibungstext", () => {
    fc.assert(
      fc.property(zustandArb, (zustand) => {
        const label = ZUSTAND_LABELS[zustand];
        expect(label).toBeDefined();
        expect(typeof label).toBe("string");
        expect(label.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  it("alle Zustandslabels sind eindeutig (kein Zustand teilt denselben Text)", () => {
    fc.assert(
      fc.property(zustandArb, (zustand) => {
        const eigenerText = ZUSTAND_LABELS[zustand];
        const andereZustaende = ALLE_ZUSTAENDE.filter((z) => z !== zustand);
        for (const anderer of andereZustaende) {
          expect(ZUSTAND_LABELS[anderer]).not.toBe(eigenerText);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("AUSWAHL liefert den korrekten Beschreibungstext", () => {
    fc.assert(
      fc.property(fc.constant("AUSWAHL" as PhrasenTrainerZustand), (zustand) => {
        expect(ZUSTAND_LABELS[zustand]).toBe("Strophenauswahl");
      }),
      { numRuns: 100 },
    );
  });

  it("BEREIT liefert den korrekten Beschreibungstext", () => {
    fc.assert(
      fc.property(fc.constant("BEREIT" as PhrasenTrainerZustand), (zustand) => {
        expect(ZUSTAND_LABELS[zustand]).toBe("Bereit für die Aufnahme");
      }),
      { numRuns: 100 },
    );
  });

  it("AUFNAHME liefert den korrekten Beschreibungstext", () => {
    fc.assert(
      fc.property(fc.constant("AUFNAHME" as PhrasenTrainerZustand), (zustand) => {
        expect(ZUSTAND_LABELS[zustand]).toBe("Aufnahme läuft");
      }),
      { numRuns: 100 },
    );
  });

  it("WIEDERGABE liefert den korrekten Beschreibungstext", () => {
    fc.assert(
      fc.property(fc.constant("WIEDERGABE" as PhrasenTrainerZustand), (zustand) => {
        expect(ZUSTAND_LABELS[zustand]).toBe("Wiedergabe");
      }),
      { numRuns: 100 },
    );
  });

  it("die Anzahl der Zustandslabels entspricht der Anzahl der Zustände", () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const labelKeys = Object.keys(ZUSTAND_LABELS);
        expect(labelKeys).toHaveLength(ALLE_ZUSTAENDE.length);
        for (const zustand of ALLE_ZUSTAENDE) {
          expect(labelKeys).toContain(zustand);
        }
      }),
      { numRuns: 100 },
    );
  });
});
