/**
 * Unit-Tests für den OnSong-Formatter
 *
 * Prüft die korrekte Formatierung von Song-Daten im OnSong-Format.
 */

import { describe, it, expect } from "vitest";
import { formatOnSong } from "@/lib/export/formatters/onsong-formatter";
import type { SongExportData, ExportOptions } from "@/lib/export/export-types";

const ALL_OPTIONS: ExportOptions = {
  vocalTags: true,
  instrumental: true,
  kommentare: true,
};

function makeSong(overrides: Partial<SongExportData> = {}): SongExportData {
  return {
    titel: "Bohemian Rhapsody",
    kuenstler: "Queen",
    strophen: [],
    ...overrides,
  };
}

describe("formatOnSong", () => {
  it("should output title on line 1, artist on line 2, empty line 3", () => {
    const result = formatOnSong(makeSong(), ALL_OPTIONS);
    const lines = result.data.toString("utf-8").split("\n");

    expect(lines[0]).toBe("Bohemian Rhapsody");
    expect(lines[1]).toBe("Queen");
    expect(lines[2]).toBe("");
  });

  it("should output empty string for artist when kuenstler is null", () => {
    const result = formatOnSong(makeSong({ kuenstler: null }), ALL_OPTIONS);
    const lines = result.data.toString("utf-8").split("\n");

    expect(lines[0]).toBe("Bohemian Rhapsody");
    expect(lines[1]).toBe("");
    expect(lines[2]).toBe("");
  });

  it("should output section headers with strophe name followed by colon", () => {
    const song = makeSong({
      strophen: [
        {
          name: "Verse 1",
          orderIndex: 0,
          analyse: null,
          istInstrumental: false,
          zeilen: [
            { text: "Is this the real life?", uebersetzung: null, orderIndex: 0, istKommentar: false, markups: [] },
          ],
          markups: [],
        },
        {
          name: "Chorus",
          orderIndex: 1,
          analyse: null,
          istInstrumental: false,
          zeilen: [
            { text: "Galileo!", uebersetzung: null, orderIndex: 0, istKommentar: false, markups: [] },
          ],
          markups: [],
        },
      ],
    });

    const result = formatOnSong(song, ALL_OPTIONS);
    const text = result.data.toString("utf-8");

    expect(text).toContain("Verse 1:");
    expect(text).toContain("Chorus:");
  });

  it("should use 'Instrumental:' as section header for instrumental strophen", () => {
    const song = makeSong({
      strophen: [
        {
          name: "Guitar Solo",
          orderIndex: 0,
          analyse: null,
          istInstrumental: true,
          zeilen: [],
          markups: [],
        },
      ],
    });

    const result = formatOnSong(song, ALL_OPTIONS);
    const text = result.data.toString("utf-8");

    expect(text).toContain("Instrumental:");
    expect(text).not.toContain("Guitar Solo:");
  });

  it("should format vocal tags as ;[MarkupTyp] Wert", () => {
    const song = makeSong({
      strophen: [
        {
          name: "Verse 1",
          orderIndex: 0,
          analyse: null,
          istInstrumental: false,
          zeilen: [
            {
              text: "Hello world",
              uebersetzung: null,
              orderIndex: 0,
              istKommentar: false,
              markups: [
                { typ: "ATMUNG", ziel: "ZEILE", wert: "deep breath", timecodeMs: null, wortIndex: null },
              ],
            },
          ],
          markups: [
            { typ: "BELT", ziel: "STROPHE", wert: "strong", timecodeMs: null, wortIndex: null },
          ],
        },
      ],
    });

    const result = formatOnSong(song, ALL_OPTIONS);
    const text = result.data.toString("utf-8");

    expect(text).toContain(";[BELT] strong");
    expect(text).toContain(";[ATMUNG] deep breath");
  });

  it("should format comment lines with leading semicolon", () => {
    const song = makeSong({
      strophen: [
        {
          name: "Verse 1",
          orderIndex: 0,
          analyse: null,
          istInstrumental: false,
          zeilen: [
            { text: "This is a comment", uebersetzung: null, orderIndex: 0, istKommentar: true, markups: [] },
            { text: "Normal line", uebersetzung: null, orderIndex: 1, istKommentar: false, markups: [] },
          ],
          markups: [],
        },
      ],
    });

    const result = formatOnSong(song, ALL_OPTIONS);
    const text = result.data.toString("utf-8");

    expect(text).toContain(";This is a comment");
    expect(text).toContain("Normal line");
  });

  it("should format translations as ; ↳ <translation> after the line", () => {
    const song = makeSong({
      strophen: [
        {
          name: "Verse 1",
          orderIndex: 0,
          analyse: null,
          istInstrumental: false,
          zeilen: [
            { text: "Hallo Welt", uebersetzung: "Hello World", orderIndex: 0, istKommentar: false, markups: [] },
          ],
          markups: [],
        },
      ],
    });

    const result = formatOnSong(song, ALL_OPTIONS);
    const lines = result.data.toString("utf-8").split("\n");

    const halloIdx = lines.indexOf("Hallo Welt");
    expect(halloIdx).toBeGreaterThan(-1);
    expect(lines[halloIdx + 1]).toBe("; ↳ Hello World");
  });

  it("should sort strophen by orderIndex ascending", () => {
    const song = makeSong({
      strophen: [
        {
          name: "Chorus",
          orderIndex: 2,
          analyse: null,
          istInstrumental: false,
          zeilen: [{ text: "Chorus line", uebersetzung: null, orderIndex: 0, istKommentar: false, markups: [] }],
          markups: [],
        },
        {
          name: "Verse 1",
          orderIndex: 0,
          analyse: null,
          istInstrumental: false,
          zeilen: [{ text: "Verse line", uebersetzung: null, orderIndex: 0, istKommentar: false, markups: [] }],
          markups: [],
        },
      ],
    });

    const result = formatOnSong(song, ALL_OPTIONS);
    const text = result.data.toString("utf-8");

    const verseIdx = text.indexOf("Verse 1:");
    const chorusIdx = text.indexOf("Chorus:");
    expect(verseIdx).toBeLessThan(chorusIdx);
  });

  it("should sort zeilen within strophe by orderIndex ascending", () => {
    const song = makeSong({
      strophen: [
        {
          name: "Verse 1",
          orderIndex: 0,
          analyse: null,
          istInstrumental: false,
          zeilen: [
            { text: "Second line", uebersetzung: null, orderIndex: 1, istKommentar: false, markups: [] },
            { text: "First line", uebersetzung: null, orderIndex: 0, istKommentar: false, markups: [] },
          ],
          markups: [],
        },
      ],
    });

    const result = formatOnSong(song, ALL_OPTIONS);
    const text = result.data.toString("utf-8");

    const firstIdx = text.indexOf("First line");
    const secondIdx = text.indexOf("Second line");
    expect(firstIdx).toBeLessThan(secondIdx);
  });

  it("should generate filename with .onsong extension", () => {
    const result = formatOnSong(makeSong(), ALL_OPTIONS);

    expect(result.filename).toBe("Bohemian Rhapsody - Queen.onsong");
    expect(result.extension).toBe("onsong");
    expect(result.contentType).toBe("text/plain; charset=utf-8");
  });

  it("should generate filename without artist when kuenstler is null", () => {
    const result = formatOnSong(makeSong({ kuenstler: null }), ALL_OPTIONS);

    expect(result.filename).toBe("Bohemian Rhapsody.onsong");
  });

  it("should return data as Buffer", () => {
    const result = formatOnSong(makeSong(), ALL_OPTIONS);

    expect(Buffer.isBuffer(result.data)).toBe(true);
  });

  it("should apply format filter (e.g. instrumental=false removes instrumental strophen)", () => {
    const song = makeSong({
      strophen: [
        {
          name: "Verse 1",
          orderIndex: 0,
          analyse: null,
          istInstrumental: false,
          zeilen: [{ text: "Vocal line", uebersetzung: null, orderIndex: 0, istKommentar: false, markups: [] }],
          markups: [],
        },
        {
          name: "Solo",
          orderIndex: 1,
          analyse: null,
          istInstrumental: true,
          zeilen: [],
          markups: [],
        },
      ],
    });

    const result = formatOnSong(song, { ...ALL_OPTIONS, instrumental: false });
    const text = result.data.toString("utf-8");

    expect(text).toContain("Verse 1:");
    expect(text).not.toContain("Instrumental:");
  });

  it("should add empty line between strophen", () => {
    const song = makeSong({
      strophen: [
        {
          name: "Verse 1",
          orderIndex: 0,
          analyse: null,
          istInstrumental: false,
          zeilen: [{ text: "Line 1", uebersetzung: null, orderIndex: 0, istKommentar: false, markups: [] }],
          markups: [],
        },
        {
          name: "Verse 2",
          orderIndex: 1,
          analyse: null,
          istInstrumental: false,
          zeilen: [{ text: "Line 2", uebersetzung: null, orderIndex: 0, istKommentar: false, markups: [] }],
          markups: [],
        },
      ],
    });

    const result = formatOnSong(song, ALL_OPTIONS);
    const text = result.data.toString("utf-8");

    // There should be an empty line between the two strophen
    expect(text).toContain("Line 1\n\nVerse 2:");
  });
});
