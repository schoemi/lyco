/**
 * Feature: song-export
 * Property 3: Filename Generation
 *
 * Für beliebige Titel- und Künstler-Strings (inkl. Sonderzeichen)
 * und beliebige Dateiendungen prüft dieser Test:
 * - Muster "{Titel} - {Künstler}.{ext}" wenn Künstler vorhanden
 * - Muster "{Titel}.{ext}" wenn Künstler null oder leer
 * - Abwesenheit ungültiger Dateisystem-Zeichen im Ergebnis
 *
 * **Validates: Requirements 9.1, 9.2, 9.3**
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { generateExportFilename } from "@/lib/export/filename-generator";

// ---------------------------------------------------------------------------
// Invalid filesystem characters: / \ : * ? " < > |
// ---------------------------------------------------------------------------

const INVALID_CHARS = /[/\\:*?"<>|]/;

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/**
 * Generates random strings that include filesystem-special characters
 * to stress-test sanitization.
 */
function arbStringWithSpecialChars(): fc.Arbitrary<string> {
  const arbChar = fc.oneof(
    // Normal printable ASCII characters
    fc.integer({ min: 0x20, max: 0x7e }).map((n) => String.fromCharCode(n)),
    // Explicitly include invalid filesystem chars
    fc.constantFrom("/", "\\", ":", "*", "?", '"', "<", ">", "|"),
    // Some Unicode characters (umlauts, accents, CJK)
    fc.constantFrom("ä", "ö", "ü", "é", "ñ", "中", "日", "🎵"),
  );
  return fc
    .array(arbChar, { minLength: 1, maxLength: 60 })
    .map((chars) => chars.join(""));
}

/**
 * Generates a non-null, non-empty kuenstler string with special characters.
 */
function arbNonEmptyKuenstler(): fc.Arbitrary<string> {
  return arbStringWithSpecialChars().filter((s) => s.trim().length > 0);
}

/**
 * Generates a kuenstler value that is null or empty (whitespace-only).
 */
function arbNullOrEmptyKuenstler(): fc.Arbitrary<string | null> {
  return fc.oneof(
    fc.constant(null),
    fc.constant(""),
    fc.constantFrom(" ", "  ", "   ", "    ", "     "),
  );
}

/**
 * Generates a file extension string (without dot).
 */
function arbExtension(): fc.Arbitrary<string> {
  return fc.constantFrom("pdf", "cho", "onsong", "sbp");
}

// ---------------------------------------------------------------------------
// PBT Config
// ---------------------------------------------------------------------------

const PBT_CONFIG = { numRuns: 100 };

// ---------------------------------------------------------------------------
// Property 3: Filename Generation
// ---------------------------------------------------------------------------

describe("Property 3: Filename Generation", () => {
  /**
   * Sub-property 3a: Pattern with Künstler
   *
   * When kuenstler is non-null and non-empty, the filename follows
   * the pattern "{Titel} - {Künstler}.{ext}".
   *
   * **Validates: Requirements 9.1**
   */
  it("follows pattern '{Titel} - {Künstler}.{ext}' when kuenstler is non-null and non-empty", () => {
    fc.assert(
      fc.property(
        arbStringWithSpecialChars(),
        arbNonEmptyKuenstler(),
        arbExtension(),
        (titel, kuenstler, ext) => {
          const result = generateExportFilename(titel, kuenstler, ext);

          // The result must contain " - " separator and end with ".{ext}"
          expect(result).toContain(" - ");
          expect(result).toMatch(new RegExp(`\\.${ext}$`));

          // Split on " - " — the last occurrence before ".ext" separates titel from kuenstler
          const withoutExt = result.slice(0, result.lastIndexOf(`.${ext}`));
          const separatorIndex = withoutExt.indexOf(" - ");
          expect(separatorIndex).toBeGreaterThanOrEqual(0);

          const resultTitel = withoutExt.slice(0, separatorIndex);
          const resultKuenstler = withoutExt.slice(separatorIndex + 3);

          // The sanitized titel and kuenstler should match
          const expectedTitel = titel.replace(/[/\\:*?"<>|]/g, "");
          const expectedKuenstler = kuenstler.replace(/[/\\:*?"<>|]/g, "");
          expect(resultTitel).toBe(expectedTitel);
          expect(resultKuenstler).toBe(expectedKuenstler);
        },
      ),
      PBT_CONFIG,
    );
  });

  /**
   * Sub-property 3b: Pattern without Künstler
   *
   * When kuenstler is null or empty, the filename follows
   * the pattern "{Titel}.{ext}".
   *
   * **Validates: Requirements 9.2**
   */
  it("follows pattern '{Titel}.{ext}' when kuenstler is null or empty", () => {
    fc.assert(
      fc.property(
        arbStringWithSpecialChars(),
        arbNullOrEmptyKuenstler(),
        arbExtension(),
        (titel, kuenstler, ext) => {
          const result = generateExportFilename(titel, kuenstler, ext);

          // The result must NOT contain " - " separator
          expect(result).not.toContain(" - ");

          // Must end with ".{ext}"
          expect(result).toMatch(new RegExp(`\\.${ext}$`));

          // The part before the extension should be the sanitized titel
          const withoutExt = result.slice(0, result.lastIndexOf(`.${ext}`));
          const expectedTitel = titel.replace(/[/\\:*?"<>|]/g, "");
          expect(withoutExt).toBe(expectedTitel);
        },
      ),
      PBT_CONFIG,
    );
  });

  /**
   * Sub-property 3c: No invalid filesystem characters
   *
   * For any input combination, the generated filename must not contain
   * any of the invalid filesystem characters: / \ : * ? " < > |
   *
   * **Validates: Requirements 9.3**
   */
  it("contains no invalid filesystem characters for any input", () => {
    fc.assert(
      fc.property(
        arbStringWithSpecialChars(),
        fc.oneof(arbNonEmptyKuenstler(), arbNullOrEmptyKuenstler()),
        arbExtension(),
        (titel, kuenstler, ext) => {
          const result = generateExportFilename(titel, kuenstler, ext);

          expect(result).not.toMatch(INVALID_CHARS);
        },
      ),
      PBT_CONFIG,
    );
  });
});
