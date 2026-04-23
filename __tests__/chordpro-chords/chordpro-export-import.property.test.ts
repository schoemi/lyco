/**
 * Property 6: Export→Import Round-Trip
 *
 * Für alle Songs mit Akkorden, Metadaten (Titel, Künstler, Tonart) und Strophenstruktur
 * soll das Exportieren als ChordPro-Datei und anschließendes Importieren einen Song mit
 * äquivalenten Akkorden, Metadaten und Strophenstruktur erzeugen.
 *
 * **Validates: Requirements 6.3, 10.1, 10.2, 10.3, 10.4, 10.5, 11.1**
 */
// Feature: chordpro-chords, Property 6: Export→Import Round-Trip

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { exportToChordPro } from "@/lib/chords/chordpro-file-exporter";
import { parseChordProFile } from "@/lib/chords/chordpro-file-parser";
import { getSectionType } from "@/lib/chords/section-type";
import type { SongDetail, StropheDetail, ZeileDetail } from "@/types/song";
import type { TagDefinitionData } from "@/types/vocal-tag";
import type { BeatErgebnisResponse } from "@/types/beat-detection";

// --- Generators ---

// Chord name: root + optional quality
const rootNote = fc.constantFrom(
  "A", "B", "C", "D", "E", "F", "G",
  "Am", "Bm", "Cm", "Dm", "Em", "Fm", "Gm",
  "A#", "Bb", "C#", "Db", "D#", "Eb", "F#", "Gb",
);

const chordQuality = fc.constantFrom(
  "", "7", "maj7", "m7", "dim", "aug", "sus2", "sus4",
);

const chordName = fc
  .tuple(rootNote, chordQuality)
  .map(([root, qual]) => `${root}${qual}`);

// A line of plain text (no brackets, no curly braces, no newlines)
const plainTextWord = fc
  .stringMatching(/^[A-Za-z0-9äöüÄÖÜß]{1,12}$/)
  .filter((s) => s.length > 0);

const plainTextLine = fc
  .array(plainTextWord, { minLength: 1, maxLength: 8 })
  .map((words) => words.join(" "));

// A line with optional chords embedded in [chord] notation
const lineWithChords = fc
  .tuple(
    plainTextLine,
    fc.array(chordName, { minLength: 0, maxLength: 3 }),
  )
  .map(([text, chords]) => {
    if (chords.length === 0) return text;
    // Insert chords at word boundaries
    const words = text.split(" ");
    let result = "";
    for (let i = 0; i < words.length; i++) {
      if (i < chords.length) {
        result += `[${chords[i]}]`;
      }
      result += words[i];
      if (i < words.length - 1) result += " ";
    }
    return result;
  });

// Strophe names that map predictably to section types
const stropheName = fc.constantFrom(
  "Verse 1", "Verse 2", "Verse 3",
  "Chorus", "Chorus 1", "Chorus 2",
  "Bridge", "Bridge 1",
  "Refrain",
);

// Generate a ZeileDetail
const zeileGen = (orderIndex: number): fc.Arbitrary<ZeileDetail> =>
  lineWithChords.map((text) => ({
    id: `zeile-${orderIndex}`,
    text,
    uebersetzung: null,
    orderIndex,
    istKommentar: false,
    startTakt: null,
    endTakt: null,
    markups: [],
  }));

// Generate a StropheDetail with 1-4 lines
const stropheGen = (orderIndex: number): fc.Arbitrary<StropheDetail> =>
  fc
    .tuple(
      stropheName,
      fc.integer({ min: 1, max: 4 }),
    )
    .chain(([name, lineCount]) =>
      fc
        .tuple(...Array.from({ length: lineCount }, (_, i) => zeileGen(i)))
        .map((zeilen) => ({
          id: `strophe-${orderIndex}`,
          name,
          orderIndex,
          progress: 0,
          notiz: null,
          analyse: null,
          istInstrumental: false,
          startTakt: null,
          endTakt: null,
          zeilen,
          markups: [],
        })),
    );

// Non-empty safe string for metadata (no curly braces, no newlines)
const safeString = fc
  .stringMatching(/^[A-Za-z0-9äöüÄÖÜß ]{1,30}$/)
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

const keyValue = fc.constantFrom(
  "Am", "C", "G", "Dm", "F", "Em", "Bb", "D", "A", "E",
  "F#m", "C#m", "Gm", "Cm",
);

const optionalArtist = fc.option(safeString, { nil: null });
const optionalKey = fc.option(keyValue, { nil: null });

// BPM and time signature
const optionalBpm = fc.option(fc.integer({ min: 40, max: 240 }), { nil: undefined });
const optionalTime = fc.option(
  fc.tuple(
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 12 }),
  ),
  { nil: undefined },
);

// Generate a SongDetail
const songDetailGen: fc.Arbitrary<{
  song: SongDetail;
  expectedBpm: number | undefined;
  expectedTime: { zaehler: number; nenner: number } | undefined;
}> = fc
  .tuple(
    safeString, // titel
    optionalArtist, // kuenstler
    optionalKey, // tonart
    optionalBpm, // bpm
    optionalTime, // time signature
    fc.integer({ min: 1, max: 4 }), // strophe count
  )
  .chain(([titel, kuenstler, tonart, bpm, time, stropheCount]) =>
    fc
      .tuple(
        ...Array.from({ length: stropheCount }, (_, i) => stropheGen(i)),
      )
      .map((strophen) => {
        const beatErgebnis: BeatErgebnisResponse | null =
          bpm !== undefined || time !== undefined
            ? {
                id: "beat-1",
                songId: "song-1",
                bpm: bpm ?? 0,
                methode: "MANUELL",
                konfidenz: null,
                beatPositionenMs: [],
                frequenzUntergrenze: null,
                frequenzObergrenze: null,
                offsetMs: 0,
                taktZaehler: time ? time[0] : 0,
                taktNenner: time ? time[1] : 0,
              }
            : null;

        const song: SongDetail = {
          id: "song-1",
          titel,
          kuenstler,
          sprache: null,
          emotionsTags: [],
          coverUrl: null,
          tonart,
          progress: 0,
          sessionCount: 0,
          analyse: null,
          coachTipp: null,
          strophen,
          audioQuellen: [],
          sets: [],
          beatErgebnis,
        };

        return {
          song,
          expectedBpm: bpm,
          expectedTime: time ? { zaehler: time[0], nenner: time[1] } : undefined,
        };
      }),
  );

// --- Property Tests ---

describe("Property 6: Export→Import Round-Trip", () => {
  const emptyTagDefinitions: TagDefinitionData[] = [];

  it("export then import preserves metadata, section structure, and chord content", () => {
    fc.assert(
      fc.property(songDetailGen, ({ song, expectedBpm, expectedTime }) => {
        // Export
        const chordProString = exportToChordPro(song, emptyTagDefinitions);

        // Import
        const result = parseChordProFile(chordProString);

        // No errors
        expect(result.errors).toHaveLength(0);

        // --- Metadata ---
        expect(result.metadata.title).toBe(song.titel);

        if (song.kuenstler != null && song.kuenstler.trim() !== "") {
          expect(result.metadata.artist).toBe(song.kuenstler);
        } else {
          expect(result.metadata.artist).toBeUndefined();
        }

        if (song.tonart != null && song.tonart.trim() !== "") {
          expect(result.metadata.key).toBe(song.tonart);
        } else {
          expect(result.metadata.key).toBeUndefined();
        }

        // BPM
        if (expectedBpm !== undefined && expectedBpm > 0) {
          expect(result.metadata.tempo).toBe(expectedBpm);
        } else {
          expect(result.metadata.tempo).toBeUndefined();
        }

        // Time signature
        if (
          expectedTime !== undefined &&
          expectedTime.zaehler > 0 &&
          expectedTime.nenner > 0
        ) {
          expect(result.metadata.time).toEqual(expectedTime);
        } else {
          expect(result.metadata.time).toBeUndefined();
        }

        // --- Section structure ---
        const sortedStrophen = [...song.strophen].sort(
          (a, b) => a.orderIndex - b.orderIndex,
        );

        expect(result.sections).toHaveLength(sortedStrophen.length);

        for (let i = 0; i < sortedStrophen.length; i++) {
          const strophe = sortedStrophen[i];
          const section = result.sections[i];

          // Section type matches getSectionType mapping
          const expectedType = getSectionType(strophe.name);
          // getSectionType returns 'verse' for unknown, which the exporter
          // maps to start_of_verse — the parser then returns 'verse'
          expect(section.type).toBe(expectedType);

          // Section name matches strophe name
          expect(section.name).toBe(strophe.name);

          // --- Lines and chord content ---
          const sortedZeilen = [...strophe.zeilen].sort(
            (a, b) => a.orderIndex - b.orderIndex,
          );

          expect(section.lines).toHaveLength(sortedZeilen.length);

          for (let j = 0; j < sortedZeilen.length; j++) {
            expect(section.lines[j]).toBe(sortedZeilen[j].text);
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});
