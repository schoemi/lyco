/**
 * Unit-Tests für den PDF-Formatter
 *
 * Prüft die korrekte PDF-Erzeugung mit Beispiel-Songs.
 * Da PDF-Inhalte ohne zusätzliche Dependencies nicht geparst werden können,
 * wird die Validität über PDF-Magic-Bytes (%PDF-) und Buffer-Prüfungen sichergestellt.
 *
 * Requirements: 3.1, 3.2, 3.6
 */

import { describe, it, expect } from "vitest";
import { formatPdf } from "@/lib/export/formatters/pdf-formatter";
import type { SongExportData, ExportOptions } from "@/lib/export/export-types";

const ALL_OPTIONS: ExportOptions = {
  vocalTags: true,
  instrumental: true,
  kommentare: true, uebersetzungen: true,
};

function makeSong(overrides: Partial<SongExportData> = {}): SongExportData {
  return {
    titel: "Bohemian Rhapsody",
    kuenstler: "Queen",
    strophen: [],
    ...overrides,
  };
}

/** Erstellt einen Song mit allen Features (Vocal-Tags, Instrumental, Kommentare, Übersetzungen) */
function makeFullSong(): SongExportData {
  return makeSong({
    strophen: [
      {
        name: "Verse 1",
        orderIndex: 0,
        analyse: "Ruhiger Einstieg",
        istInstrumental: false,
        zeilen: [
          {
            text: "Is this the real life?",
            uebersetzung: "Ist das das echte Leben?",
            orderIndex: 0,
            istKommentar: false,
            markups: [
              { typ: "ATMUNG", ziel: "ZEILE", wert: "deep breath", timecodeMs: null, wortIndex: null },
            ],
          },
          {
            text: "Is this just fantasy?",
            uebersetzung: null,
            orderIndex: 1,
            istKommentar: false,
            markups: [],
          },
          {
            text: "Leise singen",
            uebersetzung: null,
            orderIndex: 2,
            istKommentar: true,
            markups: [],
          },
        ],
        markups: [
          { typ: "KOPFSTIMME", ziel: "STROPHE", wert: "soft", timecodeMs: null, wortIndex: null },
        ],
      },
      {
        name: "Guitar Solo",
        orderIndex: 1,
        analyse: null,
        istInstrumental: true,
        zeilen: [],
        markups: [],
      },
      {
        name: "Chorus",
        orderIndex: 2,
        analyse: null,
        istInstrumental: false,
        zeilen: [
          {
            text: "Galileo!",
            uebersetzung: null,
            orderIndex: 0,
            istKommentar: false,
            markups: [
              { typ: "BELT", ziel: "ZEILE", wert: "strong", timecodeMs: null, wortIndex: null },
              { typ: "FALSETT", ziel: "ZEILE", wert: null, timecodeMs: null, wortIndex: null },
            ],
          },
        ],
        markups: [],
      },
    ],
  });
}

describe("formatPdf", () => {
  // --- Requirement 3.1: PDF-Dokument erzeugen mit Titel und Künstler ---

  it("should return a valid non-empty Buffer", async () => {
    const result = await formatPdf(makeSong(), ALL_OPTIONS);

    expect(Buffer.isBuffer(result.data)).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);
  });

  it("should produce a Buffer starting with PDF magic bytes (%PDF-)", async () => {
    const result = await formatPdf(makeSong(), ALL_OPTIONS);
    const header = result.data.subarray(0, 5).toString("ascii");

    expect(header).toBe("%PDF-");
  });

  // --- Requirement 3.6: Dateiname mit .pdf Endung ---

  it("should return correct content type", async () => {
    const result = await formatPdf(makeSong(), ALL_OPTIONS);

    expect(result.contentType).toBe("application/pdf");
  });

  it("should return correct extension", async () => {
    const result = await formatPdf(makeSong(), ALL_OPTIONS);

    expect(result.extension).toBe("pdf");
  });

  it("should generate filename with .pdf extension and artist", async () => {
    const result = await formatPdf(makeSong(), ALL_OPTIONS);

    expect(result.filename).toBe("Bohemian Rhapsody - Queen.pdf");
  });

  it("should generate filename without artist when kuenstler is null", async () => {
    const result = await formatPdf(makeSong({ kuenstler: null }), ALL_OPTIONS);

    expect(result.filename).toBe("Bohemian Rhapsody.pdf");
  });

  // --- Requirement 3.2: Strophen mit Zeilen darstellen ---

  it("should produce a valid PDF for a song with strophen and zeilen", async () => {
    const result = await formatPdf(makeFullSong(), ALL_OPTIONS);

    expect(Buffer.isBuffer(result.data)).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });

  // --- Edge case: leerer Song (keine Strophen) ---

  it("should handle empty songs (no strophen) without errors", async () => {
    const result = await formatPdf(makeSong({ strophen: [] }), ALL_OPTIONS);

    expect(Buffer.isBuffer(result.data)).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });

  // --- Edge case: Song mit allen Features ---

  it("should handle songs with all features (vocal tags, instrumental, comments, translations)", async () => {
    const result = await formatPdf(makeFullSong(), ALL_OPTIONS);

    // PDF should be larger than an empty song since it has more content
    const emptyResult = await formatPdf(makeSong(), ALL_OPTIONS);
    expect(result.data.length).toBeGreaterThan(emptyResult.data.length);
  });

  // --- Edge case: kuenstler ist leerer String ---

  it("should generate filename without artist when kuenstler is empty string", async () => {
    const result = await formatPdf(makeSong({ kuenstler: "  " }), ALL_OPTIONS);

    expect(result.filename).toBe("Bohemian Rhapsody.pdf");
  });

  // --- Export-Optionen werden angewendet ---

  it("should apply format filter when options disable features", async () => {
    const fullSong = makeFullSong();

    // With all options disabled, the PDF should still be valid
    const result = await formatPdf(fullSong, {
      vocalTags: false,
      instrumental: false,
      kommentare: false,
    });

    expect(Buffer.isBuffer(result.data)).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });
});
