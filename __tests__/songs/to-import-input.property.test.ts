/**
 * Property: Conversion – toImportSongInput
 *
 * 1. Produces an ImportStropheInput for each strophe with correct name
 * 2. Number of zeilen per strophe is preserved, each zeile.text matches
 * 3. Titel and Künstler are correctly transferred
 *
 * **Validates: Konvertierung ParsedSong → ImportSongInput**
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { toImportSongInput } from "../../src/lib/import/to-import-input";
import type { ParsedSong, ParsedStrophe } from "../../src/types/import";

// --- Generators (same style as round-trip test) ---

const stropheNameArb = fc.constantFrom(
  "Verse 1",
  "Verse 2",
  "Verse 3",
  "Chorus",
  "Bridge",
  "Pre-Chorus",
  "Outro",
  "Intro",
  "Hook",
  "Refrain"
);

const zeileArb = fc
  .stringMatching(/^[A-Za-z ]{1,40}$/)
  .filter((s) => s.trim().length > 0)
  .map((s) => s.trim());

const stropheArb: fc.Arbitrary<ParsedStrophe> = fc.record({
  name: stropheNameArb,
  zeilen: fc.array(zeileArb, { minLength: 1, maxLength: 5 }),
});

const parsedSongArb: fc.Arbitrary<ParsedSong> = fc.record({
  strophen: fc.array(stropheArb, { minLength: 1, maxLength: 5 }),
});

const nonEmptyStringArb = fc
  .stringMatching(/^[A-Za-z0-9 ]{1,30}$/)
  .filter((s) => s.trim().length > 0)
  .map((s) => s.trim());

// --- Property Tests ---

describe("Property: toImportSongInput conversion", () => {
  it("produces an ImportStropheInput for each strophe with correct name", () => {
    fc.assert(
      fc.property(
        nonEmptyStringArb,
        nonEmptyStringArb,
        parsedSongArb,
        (titel, kuenstler, parsed) => {
          const result = toImportSongInput(titel, kuenstler, parsed);

          expect(result.strophen).toHaveLength(parsed.strophen.length);

          for (let i = 0; i < parsed.strophen.length; i++) {
            expect(result.strophen[i].name).toBe(parsed.strophen[i].name);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("preserves number of zeilen per strophe and each zeile.text matches", () => {
    fc.assert(
      fc.property(
        nonEmptyStringArb,
        nonEmptyStringArb,
        parsedSongArb,
        (titel, kuenstler, parsed) => {
          const result = toImportSongInput(titel, kuenstler, parsed);

          for (let i = 0; i < parsed.strophen.length; i++) {
            expect(result.strophen[i].zeilen).toHaveLength(
              parsed.strophen[i].zeilen.length
            );

            for (let j = 0; j < parsed.strophen[i].zeilen.length; j++) {
              expect(result.strophen[i].zeilen[j].text).toBe(
                parsed.strophen[i].zeilen[j]
              );
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("transfers titel and kuenstler correctly", () => {
    fc.assert(
      fc.property(
        nonEmptyStringArb,
        fc.oneof(nonEmptyStringArb, fc.constant("")),
        parsedSongArb,
        (titel, kuenstler, parsed) => {
          const result = toImportSongInput(titel, kuenstler, parsed);

          expect(result.titel).toBe(titel);

          if (kuenstler === "") {
            expect(result.kuenstler).toBeUndefined();
          } else {
            expect(result.kuenstler).toBe(kuenstler);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
