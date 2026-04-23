/**
 * Property 7: Import→Export Round-Trip
 *
 * Für alle gültigen ChordPro-Dateien (mit Akkorden, Metadaten und Sektions-Direktiven)
 * soll das Importieren und anschließendes Exportieren eine ChordPro-Datei mit äquivalentem
 * Akkord- und Metadaten-Inhalt erzeugen. Die Akkorde in den Zeilen, die Metadaten-Direktiven
 * und die Sektionsstruktur sollen erhalten bleiben.
 *
 * **Validates: Requirements 11.2**
 */
// Feature: chordpro-chords, Property 7: Import→Export Round-Trip

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { parseChordProFile } from "@/lib/chords/chordpro-file-parser";
import { exportToChordPro } from "@/lib/chords/chordpro-file-exporter";
import { getSectionType } from "@/lib/chords/section-type";
import type { SongDetail, StropheDetail, ZeileDetail } from "@/types/song";
import type {
  ChordProFileParseResult,
  ChordProFileSection,
} from "@/types/chord";
import type { TagDefinitionData } from "@/types/vocal-tag";
import type { BeatErgebnisResponse } from "@/types/beat-detection";

// --- Helper: Convert parse result to SongDetail ---

/**
 * Converts a ChordProFileParseResult into a SongDetail object suitable
 * for the exporter. This mirrors what the import pipeline would do.
 */
function parseResultToSongDetail(
  result: ChordProFileParseResult,
): SongDetail {
  const strophen: StropheDetail[] = result.sections.map((section, i) => {
    const zeilen: ZeileDetail[] = section.lines.map((line, j) => ({
      id: `zeile-${i}-${j}`,
      text: line,
      uebersetzung: null,
      orderIndex: j,
      istKommentar: false,
      startTakt: null,
      endTakt: null,
      markups: [],
    }));

    return {
      id: `strophe-${i}`,
      name: section.name,
      orderIndex: i,
      progress: 0,
      notiz: null,
      analyse: null,
      istInstrumental: false,
      startTakt: null,
      endTakt: null,
      zeilen,
      markups: [],
    };
  });

  const beatErgebnis: BeatErgebnisResponse | null =
    result.metadata.tempo !== undefined || result.metadata.time !== undefined
      ? {
          id: "beat-1",
          songId: "song-1",
          bpm: result.metadata.tempo ?? 0,
          methode: "MANUELL",
          konfidenz: null,
          beatPositionenMs: [],
          frequenzUntergrenze: null,
          frequenzObergrenze: null,
          offsetMs: 0,
          taktZaehler: result.metadata.time?.zaehler ?? 0,
          taktNenner: result.metadata.time?.nenner ?? 0,
        }
      : null;

  return {
    id: "song-1",
    titel: result.metadata.title ?? "Untitled",
    kuenstler: result.metadata.artist ?? null,
    sprache: null,
    emotionsTags: [],
    coverUrl: null,
    tonart: result.metadata.key ?? null,
    progress: 0,
    sessionCount: 0,
    analyse: null,
    coachTipp: null,
    strophen,
    audioQuellen: [],
    sets: [],
    beatErgebnis,
  };
}

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

// A word of plain text (no brackets, no curly braces, no newlines)
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

// Section types that map predictably
const sectionConfig = fc.constantFrom(
  { directive: "start_of_verse", endDirective: "end_of_verse", name: "Verse 1", type: "verse" as const },
  { directive: "start_of_verse", endDirective: "end_of_verse", name: "Verse 2", type: "verse" as const },
  { directive: "start_of_verse", endDirective: "end_of_verse", name: "Verse 3", type: "verse" as const },
  { directive: "start_of_chorus", endDirective: "end_of_chorus", name: "Chorus", type: "chorus" as const },
  { directive: "start_of_chorus", endDirective: "end_of_chorus", name: "Chorus 1", type: "chorus" as const },
  { directive: "start_of_bridge", endDirective: "end_of_bridge", name: "Bridge", type: "bridge" as const },
  { directive: "start_of_bridge", endDirective: "end_of_bridge", name: "Bridge 1", type: "bridge" as const },
);

// Generate a section block as ChordPro text lines
const sectionBlockGen = fc
  .tuple(
    sectionConfig,
    fc.array(lineWithChords, { minLength: 1, maxLength: 4 }),
  )
  .map(([config, lines]) => {
    const block: string[] = [];
    block.push(`{${config.directive}: ${config.name}}`);
    for (const line of lines) {
      block.push(line);
    }
    block.push(`{${config.endDirective}}`);
    return { block, name: config.name, type: config.type, lines };
  });

// Non-empty safe string for metadata (no curly braces, no newlines, no brackets)
const safeString = fc
  .stringMatching(/^[A-Za-z0-9äöüÄÖÜß ]{1,30}$/)
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

const keyValue = fc.constantFrom(
  "Am", "C", "G", "Dm", "F", "Em", "Bb", "D", "A", "E",
  "F#m", "C#m", "Gm", "Cm",
);

// Metadata generators
const optionalArtist = fc.option(safeString, { nil: undefined });
const optionalKey = fc.option(keyValue, { nil: undefined });
const optionalTempo = fc.option(fc.integer({ min: 40, max: 240 }), { nil: undefined });
const optionalTime = fc.option(
  fc.tuple(
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 12 }),
  ),
  { nil: undefined },
);

// Generate a complete ChordPro file string with metadata and sections
const chordProFileGen = fc
  .tuple(
    safeString,       // title
    optionalArtist,   // artist
    optionalKey,      // key
    optionalTempo,    // tempo
    optionalTime,     // time
    fc.array(sectionBlockGen, { minLength: 1, maxLength: 4 }),
  )
  .map(([title, artist, key, tempo, time, sections]) => {
    const lines: string[] = [];

    // Metadata directives
    lines.push(`{title: ${title}}`);
    if (artist !== undefined) {
      lines.push(`{artist: ${artist}}`);
    }
    if (key !== undefined) {
      lines.push(`{key: ${key}}`);
    }
    if (tempo !== undefined) {
      lines.push(`{tempo: ${tempo}}`);
    }
    if (time !== undefined) {
      lines.push(`{time: ${time[0]}/${time[1]}}`);
    }

    // Sections
    for (const section of sections) {
      lines.push(""); // blank line before section
      for (const line of section.block) {
        lines.push(line);
      }
    }

    return {
      content: lines.join("\n"),
      expectedTitle: title,
      expectedArtist: artist,
      expectedKey: key,
      expectedTempo: tempo,
      expectedTime: time ? { zaehler: time[0], nenner: time[1] } : undefined,
      expectedSections: sections.map((s) => ({
        name: s.name,
        type: s.type,
        lines: s.lines,
      })),
    };
  });

// --- Property Tests ---

describe("Property 7: Import→Export Round-Trip", () => {
  const emptyTagDefinitions: TagDefinitionData[] = [];

  it("import then export preserves metadata, section structure, and chord content", () => {
    fc.assert(
      fc.property(chordProFileGen, (generated) => {
        // Step 1: Import (parse) the generated ChordPro file
        const firstImport = parseChordProFile(generated.content);

        // No errors expected
        expect(firstImport.errors).toHaveLength(0);

        // Step 2: Convert parse result to SongDetail
        const songDetail = parseResultToSongDetail(firstImport);

        // Step 3: Export the SongDetail back to ChordPro
        const exportedString = exportToChordPro(songDetail, emptyTagDefinitions);

        // Step 4: Re-import the exported string
        const secondImport = parseChordProFile(exportedString);

        // No errors expected
        expect(secondImport.errors).toHaveLength(0);

        // --- Compare metadata ---
        expect(secondImport.metadata.title).toBe(firstImport.metadata.title);

        if (firstImport.metadata.artist !== undefined) {
          expect(secondImport.metadata.artist).toBe(firstImport.metadata.artist);
        } else {
          expect(secondImport.metadata.artist).toBeUndefined();
        }

        if (firstImport.metadata.key !== undefined) {
          expect(secondImport.metadata.key).toBe(firstImport.metadata.key);
        } else {
          expect(secondImport.metadata.key).toBeUndefined();
        }

        if (firstImport.metadata.tempo !== undefined) {
          expect(secondImport.metadata.tempo).toBe(firstImport.metadata.tempo);
        } else {
          expect(secondImport.metadata.tempo).toBeUndefined();
        }

        if (firstImport.metadata.time !== undefined) {
          expect(secondImport.metadata.time).toEqual(firstImport.metadata.time);
        } else {
          expect(secondImport.metadata.time).toBeUndefined();
        }

        // --- Compare section structure ---
        expect(secondImport.sections).toHaveLength(firstImport.sections.length);

        for (let i = 0; i < firstImport.sections.length; i++) {
          const firstSection = firstImport.sections[i];
          const secondSection = secondImport.sections[i];

          // Section type preserved
          expect(secondSection.type).toBe(firstSection.type);

          // Section name preserved
          expect(secondSection.name).toBe(firstSection.name);

          // Lines and chord content preserved
          expect(secondSection.lines).toHaveLength(firstSection.lines.length);

          for (let j = 0; j < firstSection.lines.length; j++) {
            expect(secondSection.lines[j]).toBe(firstSection.lines[j]);
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});
