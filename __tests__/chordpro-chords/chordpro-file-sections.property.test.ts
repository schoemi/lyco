/**
 * Property 3: ChordPro-Datei Sektions-Parsing
 *
 * Für alle gültigen ChordPro-Dateien mit Sektions-Direktiven
 * ({start_of_verse}, {start_of_chorus}, {start_of_bridge} mit zugehörigen End-Direktiven)
 * soll der Parser die korrekte Anzahl von Sektionen mit dem richtigen Typ und den richtigen
 * Zeilen extrahieren. Jede Sektion soll genau die Zeilen enthalten, die zwischen der
 * Start- und End-Direktive stehen.
 *
 * **Validates: Requirements 5.6, 5.7**
 */
// Feature: chordpro-chords, Property 3: ChordPro-Datei Sektions-Parsing

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { parseChordProFile } from "@/lib/chords/chordpro-file-parser";

// --- Types ---

type SectionType = "verse" | "chorus" | "bridge";

interface GeneratedSection {
  type: SectionType;
  label: string;
  lines: string[];
}

// --- Generators ---

const sectionType: fc.Arbitrary<SectionType> = fc.constantFrom(
  "verse",
  "chorus",
  "bridge",
);

// Content line: non-empty, no curly braces (to avoid being parsed as directives)
const contentLine = fc
  .stringMatching(/^[^\{\}\r\n]{1,60}$/)
  .filter((s) => s.trim().length > 0);

// Optional label for sections (e.g. "Verse 1", "Chorus")
// Labels are trimmed by the parser, so we generate pre-trimmed labels
const sectionLabel = fc.option(
  fc
    .stringMatching(/^[A-Za-z0-9 ]{1,20}$/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0),
  { nil: undefined },
);

// Generate a single section with type, optional label, and 1-5 content lines
const sectionGen: fc.Arbitrary<GeneratedSection> = fc
  .tuple(sectionType, sectionLabel, fc.array(contentLine, { minLength: 1, maxLength: 5 }))
  .map(([type, label, lines]) => ({
    type,
    label: label ?? type,
    lines,
  }));

// Generate 1-6 sections
const sectionsGen = fc.array(sectionGen, { minLength: 1, maxLength: 6 });

// --- Helpers ---

const SECTION_START_DIRECTIVE: Record<SectionType, string> = {
  verse: "start_of_verse",
  chorus: "start_of_chorus",
  bridge: "start_of_bridge",
};

const SECTION_END_DIRECTIVE: Record<SectionType, string> = {
  verse: "end_of_verse",
  chorus: "end_of_chorus",
  bridge: "end_of_bridge",
};

function buildChordProFileFromSections(sections: GeneratedSection[]): string {
  const fileLines: string[] = [];

  for (const section of sections) {
    const startDirective =
      section.label !== section.type
        ? `{${SECTION_START_DIRECTIVE[section.type]}: ${section.label}}`
        : `{${SECTION_START_DIRECTIVE[section.type]}}`;

    fileLines.push(startDirective);
    for (const line of section.lines) {
      fileLines.push(line);
    }
    fileLines.push(`{${SECTION_END_DIRECTIVE[section.type]}}`);
  }

  return fileLines.join("\n");
}

// --- Property Tests ---

describe("Property 3: ChordPro-Datei Sektions-Parsing", () => {
  it("parser extracts correct number of sections with correct type and lines", () => {
    fc.assert(
      fc.property(sectionsGen, (generatedSections) => {
        const fileContent = buildChordProFileFromSections(generatedSections);
        const result = parseChordProFile(fileContent);

        // No errors for valid section structures
        expect(result.errors).toHaveLength(0);

        // Correct number of sections
        expect(result.sections).toHaveLength(generatedSections.length);

        // Each section has the correct type and lines
        for (let i = 0; i < generatedSections.length; i++) {
          const expected = generatedSections[i];
          const actual = result.sections[i];

          // Correct section type
          expect(actual.type).toBe(expected.type);

          // Correct section name/label
          expect(actual.name).toBe(expected.label);

          // Correct number of lines
          expect(actual.lines).toHaveLength(expected.lines.length);

          // Each line matches
          for (let j = 0; j < expected.lines.length; j++) {
            expect(actual.lines[j]).toBe(expected.lines[j]);
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});
