import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { isNoiseLine } from "../../src/lib/import/noise-filter";

describe("noise-filter property tests", () => {
  /**
   * **Validates: Noise Filter**
   * Known noise lines are ALWAYS filtered.
   */
  it("known noise lines are always filtered", () => {
    const noiseLineArb = fc.oneof(
      fc.constant("You might also like"),
      fc.constant("you might also like"),
      fc.constant("YOU MIGHT ALSO LIKE"),
      fc.nat({ max: 999 }).map((n) => `${n} Embed`),
      fc.nat({ max: 999 }).map((n) => `${n} embed`),
      fc.nat({ max: 999 }).map((n) => `${n} Contributors`),
      fc.nat({ max: 999 }).map((n) => `${n} contributors`),
      fc.nat({ max: 999 }).map((n) => `${n} Contributor`),
      fc.constantFrom("See Beyoncé live", "See Taylor Swift live", "See Adele live", "see Drake live"),
      fc.constantFrom(
        "Get tickets as low as $20",
        "Get tickets as low as $50",
        "get tickets as low as $100"
      )
    );

    fc.assert(
      fc.property(noiseLineArb, (line) => {
        expect(isNoiseLine(line)).toBe(true);
      })
    );
  });

  /**
   * **Validates: Noise Filter**
   * [Section] markers are NEVER filtered as noise.
   */
  it("[Section] markers are never filtered as noise", () => {
    const sectionNameArb = fc.constantFrom(
      "Verse 1",
      "Verse 2",
      "Chorus",
      "Bridge",
      "Pre-Chorus",
      "Outro",
      "Intro",
      "Hook",
      "Refrain"
    );

    const sectionMarkerArb = sectionNameArb.map((name) => `[${name}]`);

    fc.assert(
      fc.property(sectionMarkerArb, (marker) => {
        expect(isNoiseLine(marker)).toBe(false);
      })
    );
  });

  /**
   * **Validates: Noise Filter**
   * Arbitrary lyrics lines (without noise patterns) are NOT filtered.
   */
  it("arbitrary lyrics lines without noise patterns are not filtered", () => {
    const lyricsLineArb = fc
      .string({ minLength: 1, maxLength: 80 })
      .map((s) => s.replace(/[^a-zA-Z ]/g, "a"))
      .filter((s) => {
        const t = s.trim();
        if (t === "") return false;
        // Exclude strings that match noise patterns
        if (/^you might also like$/i.test(t)) return false;
        if (/^\d+\s*(embed|contributors?)$/i.test(t)) return false;
        if (/^see .+ live$/i.test(t)) return false;
        if (/^get tickets as low as/i.test(t)) return false;
        // Exclude section markers
        if (/^\[.*\]$/.test(t)) return false;
        return true;
      });

    fc.assert(
      fc.property(lyricsLineArb, (line) => {
        expect(isNoiseLine(line)).toBe(false);
      })
    );
  });
});
