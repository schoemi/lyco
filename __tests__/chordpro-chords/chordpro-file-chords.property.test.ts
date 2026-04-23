/**
 * Property 4: ChordPro-Datei Akkord-Erhaltung
 *
 * Für alle ChordPro-Dateien mit Akkorden in eckiger Klammer-Notation soll der Parser
 * die Akkorde unverändert im text-Feld der zugehörigen Zeilen erhalten. Das Parsen der
 * resultierenden Zeilen mit dem Akkord-Parser soll die gleichen Akkordnamen in der
 * gleichen Reihenfolge ergeben.
 *
 * **Validates: Requirements 5.2**
 */
// Feature: chordpro-chords, Property 4: ChordPro-Datei Akkord-Erhaltung

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { parseChordProFile } from "@/lib/chords/chordpro-file-parser";
import { parseChords } from "@/lib/chords/chord-parser";

// --- Generators ---

// Root notes: A-G with optional # or b
const rootNote = fc.constantFrom(
  "A", "B", "C", "D", "E", "F", "G",
  "A#", "Bb", "C#", "Db", "D#", "Eb", "F#", "Gb", "G#", "Ab",
);

// Chord qualities
const quality = fc.constantFrom(
  "", "m", "maj7", "7", "dim", "aug", "sus2", "sus4",
  "m7", "maj9", "6", "m6", "9", "add9", "dim7",
);

// Optional extensions
const extension = fc.constantFrom(
  "", "#11", "b9", "add9", "#5", "b5", "#9",
);

// Optional bass note for slash chords
const slashBass = fc.oneof(
  fc.constant(""),
  rootNote.map((root) => `/${root}`),
);

// Full chord name generator (non-empty)
const chordName = fc
  .tuple(rootNote, quality, extension, slashBass)
  .map(([root, qual, ext, slash]) => `${root}${qual}${ext}${slash}`);

// Plain text segment: no brackets or curly braces (to avoid directive/chord confusion)
const plainTextSegment = fc
  .stringMatching(/^[a-zA-Z0-9 ,.'!?äöüÄÖÜß]{1,20}$/)
  .filter((s) => s.trim().length > 0);

// A line with chords: interleave chord notations and plain text segments
const lineWithChords = fc
  .tuple(
    fc.array(
      fc.tuple(chordName, plainTextSegment),
      { minLength: 1, maxLength: 5 },
    ),
    fc.option(plainTextSegment, { nil: undefined }),
  )
  .map(([pairs, trailing]) => {
    let line = "";
    for (const [chord, text] of pairs) {
      line += `[${chord}]${text}`;
    }
    if (trailing) {
      line += trailing;
    }
    return { line, chordNames: pairs.map(([chord]) => chord) };
  });

type SectionType = "verse" | "chorus" | "bridge";

const sectionType: fc.Arbitrary<SectionType> = fc.constantFrom(
  "verse",
  "chorus",
  "bridge",
);

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

// A section with chord lines
interface GeneratedSection {
  type: SectionType;
  lines: { line: string; chordNames: string[] }[];
}

const sectionWithChordsGen: fc.Arbitrary<GeneratedSection> = fc
  .tuple(
    sectionType,
    fc.array(lineWithChords, { minLength: 1, maxLength: 4 }),
  )
  .map(([type, lines]) => ({ type, lines }));

// Generate 1-4 sections, each with chord lines
const chordProFileGen = fc.array(sectionWithChordsGen, {
  minLength: 1,
  maxLength: 4,
});

// --- Helpers ---

function buildChordProFile(sections: GeneratedSection[]): string {
  const fileLines: string[] = [];

  for (const section of sections) {
    fileLines.push(`{${SECTION_START_DIRECTIVE[section.type]}}`);
    for (const { line } of section.lines) {
      fileLines.push(line);
    }
    fileLines.push(`{${SECTION_END_DIRECTIVE[section.type]}}`);
  }

  return fileLines.join("\n");
}

// --- Property Tests ---

describe("Property 4: ChordPro-Datei Akkord-Erhaltung", () => {
  it("parser preserves chords unchanged in line text for all ChordPro files with chords", () => {
    fc.assert(
      fc.property(chordProFileGen, (generatedSections) => {
        const fileContent = buildChordProFile(generatedSections);
        const result = parseChordProFile(fileContent);

        // No errors for valid files
        expect(result.errors).toHaveLength(0);

        // Same number of sections
        expect(result.sections).toHaveLength(generatedSections.length);

        for (let s = 0; s < generatedSections.length; s++) {
          const expectedSection = generatedSections[s];
          const actualSection = result.sections[s];

          // Same number of lines in each section
          expect(actualSection.lines).toHaveLength(expectedSection.lines.length);

          for (let l = 0; l < expectedSection.lines.length; l++) {
            const expectedLine = expectedSection.lines[l];
            const actualLine = actualSection.lines[l];

            // The raw line text should be preserved exactly
            expect(actualLine).toBe(expectedLine.line);

            // Parse the preserved line with the chord parser
            const parsed = parseChords(actualLine);

            // The chord names should match in the same order
            const parsedChordNames = parsed.chords.map((c) => c.name);
            expect(parsedChordNames).toEqual(expectedLine.chordNames);
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});
