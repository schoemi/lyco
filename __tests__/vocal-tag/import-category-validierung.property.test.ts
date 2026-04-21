/**
 * Eigenschaft 6: Import-Validierung des category-Feldes
 *
 * Für alle Import-Einträge, deren category-Feld einen nicht-String-Wert enthält
 * (Zahl, Objekt, Array, Boolean), muss die Validierungsfunktion einen Fehler
 * zurückgeben. Für alle Import-Einträge mit einem String-Wert oder ohne
 * category-Feld muss die Validierung bezüglich dieses Feldes erfolgreich sein.
 *
 * **Validates: Requirements 5.1, 5.5**
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { validateTagConfigJson } from "@/lib/vocal-tag/tag-config-export";

const PBT_CONFIG = { numRuns: 100 };

/**
 * Generator for a valid base tag entry (all required fields present and correct types).
 * The `category` field is intentionally omitted so tests can control it.
 */
function validBaseEntryArb() {
  return fc.record({
    tag: fc.stringMatching(/^[a-z][a-z0-9_-]{0,14}$/),
    label: fc.stringMatching(/^[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß0-9 ]{0,19}$/),
    icon: fc.stringMatching(/^[A-Za-z][A-Za-z0-9-]{0,9}$/),
    color: fc.stringMatching(/^#[0-9a-f]{6}$/),
    indexNr: fc.integer({ min: 0, max: 999 }),
  });
}

/**
 * Generator for non-string values that are valid JSON types but not strings.
 */
function nonStringArb(): fc.Arbitrary<unknown> {
  return fc.oneof(
    fc.integer(),
    fc.double({ noNaN: true, noDefaultInfinity: true }),
    fc.boolean(),
    fc.constant(null),
    fc.array(fc.anything(), { maxLength: 3 }),
    fc.dictionary(fc.string({ minLength: 1, maxLength: 5 }), fc.anything(), { maxKeys: 3 }),
  );
}

describe("Eigenschaft 6: Import-Validierung des category-Feldes", () => {
  /**
   * **Validates: Requirements 5.1, 5.5**
   *
   * Non-string category values (number, object, array, boolean, null) must
   * cause the validation function to return an error.
   */
  it("nicht-String category-Werte erzeugen einen Validierungsfehler", () => {
    return fc.assert(
      fc.property(
        validBaseEntryArb(),
        nonStringArb(),
        (baseEntry, invalidCategory) => {
          const entry = { ...baseEntry, category: invalidCategory };
          const json = JSON.stringify([entry]);
          const result = validateTagConfigJson(json);

          // Must be invalid
          expect(result.valid).toBe(false);
          // Must contain an error about the category field
          expect(
            result.errors.some((e) => e.includes("category") && e.includes("String")),
          ).toBe(true);
        },
      ),
      PBT_CONFIG,
    );
  });

  /**
   * **Validates: Requirements 5.1, 5.5**
   *
   * String category values must pass validation (regarding the category field).
   */
  it("String category-Werte bestehen die Validierung", () => {
    return fc.assert(
      fc.property(
        validBaseEntryArb(),
        fc.string({ minLength: 1, maxLength: 30 }),
        (baseEntry, categorySlug) => {
          const entry = { ...baseEntry, category: categorySlug };
          const json = JSON.stringify([entry]);
          const result = validateTagConfigJson(json);

          // Must be valid (no category-related errors)
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        },
      ),
      PBT_CONFIG,
    );
  });

  /**
   * **Validates: Requirements 5.1, 5.5**
   *
   * Missing category field must pass validation.
   */
  it("fehlendes category-Feld besteht die Validierung", () => {
    return fc.assert(
      fc.property(validBaseEntryArb(), (baseEntry) => {
        // No category field at all
        const json = JSON.stringify([baseEntry]);
        const result = validateTagConfigJson(json);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }),
      PBT_CONFIG,
    );
  });
});
