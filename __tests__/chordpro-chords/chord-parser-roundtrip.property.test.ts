/**
 * Property 1: Akkord-Parser/Serializer Round-Trip
 *
 * Für alle gültigen ChordParseResult-Objekte (bestehend aus plainText und einer
 * Liste von ChordPosition-Objekten mit gültigen Positionen), soll das Serialisieren
 * zu einem Text mit [Akkord]-Notation und anschließendes Parsen ein äquivalentes
 * ChordParseResult erzeugen. Ebenso soll für jeden Text mit [Akkord]-Notation das
 * Parsen und anschließende Serialisieren einen äquivalenten Text erzeugen.
 *
 * **Validates: Requirements 2.2, 2.4, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3**
 */
// Feature: chordpro-chords, Property 1: Akkord-Parser/Serializer Round-Trip

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { parseChords } from "@/lib/chords/chord-parser";
import { serializeChords } from "@/lib/chords/chord-serializer";
import type { ChordPosition } from "@/types/chord";

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

// Chord name including empty string (for placeholder chords)
const chordNameWithEmpty = fc.oneof(
  { weight: 9, arbitrary: chordName },
  { weight: 1, arbitrary: fc.constant("") },
);

// Plain text that does NOT contain [ or ] (those would be parsed as chord notation)
const plainText = fc.stringMatching(/^[^\[\]]{0,50}$/);

// Generate a valid ChordParseResult: plainText + sorted chords with valid positions
const validChordParseResult = plainText.chain((text) => {
  const maxPos = text.length;
  const chordGen = fc.tuple(
    chordNameWithEmpty,
    fc.integer({ min: 0, max: Math.max(0, maxPos) }),
  ).map(([name, position]): ChordPosition => ({ name, position }));

  return fc
    .array(chordGen, { minLength: 0, maxLength: 10 })
    .map((chords) => {
      // Sort by position (ascending) to match parser output order
      const sorted = [...chords].sort((a, b) => a.position - b.position);
      return { plainText: text, chords: sorted };
    })
    .map((result) => ({ plainText: result.plainText, chords: result.chords }));
});

// Plain text segment (no brackets, at least 1 char)
const plainTextSegment = fc.stringMatching(/^[^\[\]]{1,20}$/);

// Generate text with [Akkord] notation for parse→serialize direction
const textWithChords = fc
  .array(
    fc.oneof(
      // Plain text segment (no brackets)
      plainTextSegment,
      // Chord notation segment
      chordNameWithEmpty.map((name) => `[${name}]`),
    ),
    { minLength: 0, maxLength: 15 },
  )
  .map((segments) => segments.join(""));

// --- Property Tests ---

describe("Property 1: Akkord-Parser/Serializer Round-Trip", () => {
  it("serialize → parse yields equivalent ChordParseResult", () => {
    fc.assert(
      fc.property(validChordParseResult, ({ plainText: text, chords }) => {
        const serialized = serializeChords(text, chords);
        const parsed = parseChords(serialized);

        // The plain text should be identical
        expect(parsed.plainText).toBe(text);

        // The chords should be equivalent (same name and position)
        expect(parsed.chords.length).toBe(chords.length);
        for (let i = 0; i < chords.length; i++) {
          expect(parsed.chords[i].name).toBe(chords[i].name);
          expect(parsed.chords[i].position).toBe(chords[i].position);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("parse → serialize yields equivalent text", () => {
    fc.assert(
      fc.property(textWithChords, (text) => {
        const parsed = parseChords(text);
        const serialized = serializeChords(parsed.plainText, parsed.chords);

        expect(serialized).toBe(text);
      }),
      { numRuns: 100 },
    );
  });
});
