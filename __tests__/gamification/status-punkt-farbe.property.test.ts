// Feature: gamification-progress, Property 4: Status-Punkt-Farbzuordnung ist vollständig und korrekt
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { getStatusPunktFarbe, type StatusPunktFarbe } from "@/lib/gamification/status-punkt";

/**
 * Property 4: Status-Punkt-Farbzuordnung ist vollständig und korrekt
 *
 * Für jeden ganzzahligen Fortschrittswert im Bereich [0, 100] gilt:
 * `getStatusPunktFarbe` gibt genau eine der drei Farben zurück –
 * "grau" für 0%, "orange" für 1–99%, "grün" für 100%.
 * Die Funktion ist total (kein Wert im gültigen Bereich führt zu einem Fehler).
 *
 * **Validates: Requirements 6.1, 6.2, 6.3**
 */

const PBT_CONFIG = { numRuns: 100 };

const VALID_COLORS: StatusPunktFarbe[] = ["grau", "orange", "gruen"];

describe("Property 4 – Status-Punkt-Farbzuordnung", () => {
  it("fortschrittProzent === 0 → 'grau'", () => {
    fc.assert(
      fc.property(fc.constant(0), (value) => {
        expect(getStatusPunktFarbe(value)).toBe("grau");
      }),
      PBT_CONFIG
    );
  });

  it("fortschrittProzent in [1, 99] → 'orange'", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 99 }), (value) => {
        expect(getStatusPunktFarbe(value)).toBe("orange");
      }),
      PBT_CONFIG
    );
  });

  it("fortschrittProzent === 100 → 'gruen'", () => {
    fc.assert(
      fc.property(fc.constant(100), (value) => {
        expect(getStatusPunktFarbe(value)).toBe("gruen");
      }),
      PBT_CONFIG
    );
  });

  it("every integer in [0, 100] returns one of the three valid colors", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (value) => {
        const result = getStatusPunktFarbe(value);
        expect(VALID_COLORS).toContain(result);
      }),
      PBT_CONFIG
    );
  });

  it("function is total: no integer in [0, 100] throws an error", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (value) => {
        expect(() => getStatusPunktFarbe(value)).not.toThrow();
      }),
      PBT_CONFIG
    );
  });
});
