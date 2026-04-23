/**
 * Property 2: ChordPro-Datei Metadaten-Extraktion
 *
 * Für alle gültigen Kombinationen von Titel, Künstler, Tonart, Tempo und Taktart
 * soll das Erstellen einer ChordPro-Datei mit den entsprechenden Metadaten-Direktiven
 * ({title:}, {artist:}, {key:}, {tempo:}, {time:}) und anschließendes Parsen ein
 * ChordProFileParseResult erzeugen, dessen metadata-Felder den ursprünglichen Werten
 * entsprechen.
 *
 * **Validates: Requirements 5.3, 5.4, 5.5**
 */
// Feature: chordpro-chords, Property 2: ChordPro-Datei Metadaten-Extraktion

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { parseChordProFile } from "@/lib/chords/chordpro-file-parser";

// --- Generators ---

// Non-empty string without curly braces or newlines (valid directive value)
// Must be trimmed since the parser trims directive values
const safeString = fc
  .stringMatching(/^[^\{\}\r\n]{1,50}$/)
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

// Root notes for key values
const rootNote = fc.constantFrom(
  "A", "B", "C", "D", "E", "F", "G",
  "A#", "Bb", "C#", "Db", "D#", "Eb", "F#", "Gb", "G#", "Ab",
);

const keyQuality = fc.constantFrom("", "m", "maj", "min");

const keyValue = fc
  .tuple(rootNote, keyQuality)
  .map(([root, qual]) => `${root}${qual}`);

// Positive tempo (BPM)
const tempoValue = fc.integer({ min: 1, max: 300 });

// Time signature: zaehler/nenner where both are positive integers
const timeSignature = fc
  .tuple(
    fc.integer({ min: 1, max: 16 }),
    fc.integer({ min: 1, max: 16 }),
  )
  .map(([zaehler, nenner]) => ({ zaehler, nenner }));

// Optional metadata fields — each can be present or absent
const optionalTitle = fc.option(safeString, { nil: undefined });
const optionalArtist = fc.option(safeString, { nil: undefined });
const optionalKey = fc.option(keyValue, { nil: undefined });
const optionalTempo = fc.option(tempoValue, { nil: undefined });
const optionalTime = fc.option(timeSignature, { nil: undefined });

// Combined metadata generator
const metadataGen = fc.tuple(
  optionalTitle,
  optionalArtist,
  optionalKey,
  optionalTempo,
  optionalTime,
);

// --- Helper: Build ChordPro file string from metadata ---

function buildChordProFile(
  title: string | undefined,
  artist: string | undefined,
  key: string | undefined,
  tempo: number | undefined,
  time: { zaehler: number; nenner: number } | undefined,
): string {
  const lines: string[] = [];

  if (title !== undefined) lines.push(`{title: ${title}}`);
  if (artist !== undefined) lines.push(`{artist: ${artist}}`);
  if (key !== undefined) lines.push(`{key: ${key}}`);
  if (tempo !== undefined) lines.push(`{tempo: ${tempo}}`);
  if (time !== undefined) lines.push(`{time: ${time.zaehler}/${time.nenner}}`);

  return lines.join("\n");
}

// --- Property Tests ---

describe("Property 2: ChordPro-Datei Metadaten-Extraktion", () => {
  it("parsed metadata matches original values for all valid metadata combinations", () => {
    fc.assert(
      fc.property(
        metadataGen,
        ([title, artist, key, tempo, time]) => {
          const fileContent = buildChordProFile(title, artist, key, tempo, time);
          const result = parseChordProFile(fileContent);

          // Title
          if (title !== undefined) {
            expect(result.metadata.title).toBe(title);
          } else {
            expect(result.metadata.title).toBeUndefined();
          }

          // Artist
          if (artist !== undefined) {
            expect(result.metadata.artist).toBe(artist);
          } else {
            expect(result.metadata.artist).toBeUndefined();
          }

          // Key
          if (key !== undefined) {
            expect(result.metadata.key).toBe(key);
          } else {
            expect(result.metadata.key).toBeUndefined();
          }

          // Tempo
          if (tempo !== undefined) {
            expect(result.metadata.tempo).toBe(tempo);
          } else {
            expect(result.metadata.tempo).toBeUndefined();
          }

          // Time signature
          if (time !== undefined) {
            expect(result.metadata.time).toEqual({
              zaehler: time.zaehler,
              nenner: time.nenner,
            });
          } else {
            expect(result.metadata.time).toBeUndefined();
          }

          // No errors should be produced for valid metadata
          expect(result.errors).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
