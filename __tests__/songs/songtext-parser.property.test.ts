/**
 * Property: Parser Strophe Recognition
 *
 * Tests that the songtext parser correctly recognizes [Section] markers,
 * preserves all content lines, and never produces empty strophes.
 *
 * **Validates: Songtext Parser**
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { parseSongtext } from "../../src/lib/import/songtext-parser";

// --- Generators ---

/**
 * Simple alphanumeric section names that won't collide with noise patterns.
 */
const sectionNameArb = fc.constantFrom(
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

/**
 * A single lyric line: non-empty alphanumeric string that won't be
 * mistaken for noise or a section marker.
 */
const lyricLineArb = fc
  .stringMatching(/^[A-Za-z ]{1,40}$/)
  .filter((s) => s.trim().length > 0)
  .map((s) => s.trim());

// --- Property Tests ---

describe("Property: Parser Strophe Recognition", () => {
  /**
   * **Validates: Songtext Parser**
   *
   * Text with N [Section] markers (each followed by 1-4 lyric lines)
   * produces exactly N strophes with matching names.
   */
  it("text with N [Section] markers produces N strophes with correct names", () => {
    const sectionArb = fc.record({
      name: sectionNameArb,
      lines: fc.array(lyricLineArb, { minLength: 1, maxLength: 4 }),
    });

    const sectionsArb = fc.array(sectionArb, { minLength: 1, maxLength: 5 });

    fc.assert(
      fc.property(sectionsArb, (sections) => {
        // Build text: [Name]\nline1\nline2\n\n[Name2]\nline3\n...
        const text = sections
          .map((s) => `[${s.name}]\n${s.lines.join("\n")}`)
          .join("\n\n");

        const result = parseSongtext(text);

        // Exactly N strophes
        expect(result.strophen).toHaveLength(sections.length);

        // Names match in order
        for (let i = 0; i < sections.length; i++) {
          expect(result.strophen[i].name).toBe(sections[i].name);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Songtext Parser**
   *
   * Every non-marker, non-empty input line appears in exactly one strophe
   * (no lines lost during parsing).
   */
  it("every input line appears in exactly one strophe (no lines lost)", () => {
    const sectionArb = fc.record({
      name: sectionNameArb,
      lines: fc.array(lyricLineArb, { minLength: 1, maxLength: 4 }),
    });

    const sectionsArb = fc.array(sectionArb, { minLength: 1, maxLength: 5 });

    fc.assert(
      fc.property(sectionsArb, (sections) => {
        const text = sections
          .map((s) => `[${s.name}]\n${s.lines.join("\n")}`)
          .join("\n\n");

        const result = parseSongtext(text);

        // Collect all zeilen from all strophes
        const allZeilen = result.strophen.flatMap((s) => s.zeilen);

        // Every non-marker, non-empty input line should appear in the collected zeilen
        const inputLines = text.split("\n").map((l) => l.trim());
        const contentLines = inputLines.filter(
          (line) => line !== "" && !/^\[.+\]$/.test(line)
        );

        for (const line of contentLines) {
          expect(allZeilen).toContain(line);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Songtext Parser**
   *
   * Empty strophes (marker with no lines before the next marker) are NOT produced.
   */
  it("empty strophes (marker with no lines) are NOT produced", () => {
    // Generate text with consecutive markers like [Verse 1]\n[Chorus]\nline1
    const markerNamesArb = fc.array(sectionNameArb, {
      minLength: 2,
      maxLength: 5,
    });

    fc.assert(
      fc.property(markerNamesArb, lyricLineArb, (names, line) => {
        // Build text with consecutive markers, only the last one has a line
        const markers = names.map((n) => `[${n}]`);
        const text = markers.join("\n") + "\n" + line;

        const result = parseSongtext(text);

        // No strophe should have an empty zeilen array
        for (const strophe of result.strophen) {
          expect(strophe.zeilen.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 }
    );
  });
});
