/**
 * Unit-Tests für ChordPro-Formatter
 *
 * Testet die formatChordPro-Funktion mit konkreten Beispielen
 * für alle Ausgabe-Aspekte: Metadaten, Sektionen, Vocal-Tags,
 * Kommentare, Übersetzungen, Escaping und Dateiname.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.1, 5.3, 10.1, 10.2, 11.1, 11.2
 */

import { describe, it, expect } from "vitest";
import { formatChordPro } from "@/lib/export/formatters/chordpro-formatter";
import type {
  SongExportData,
  ExportOptions,
  ExportStropheData,
  ExportZeileData,
  ExportMarkupData,
} from "@/lib/export/export-types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMarkup(
  typ: ExportMarkupData["typ"],
  wert: string | null = null,
): ExportMarkupData {
  return { typ, ziel: "STROPHE", wert, timecodeMs: null, wortIndex: null };
}

function makeZeile(overrides: Partial<ExportZeileData> = {}): ExportZeileData {
  return {
    text: "Beispieltext",
    uebersetzung: null,
    orderIndex: 0,
    istKommentar: false,
    markups: [],
    ...overrides,
  };
}

function makeStrophe(
  overrides: Partial<ExportStropheData> = {},
): ExportStropheData {
  return {
    name: "Verse 1",
    orderIndex: 0,
    analyse: null,
    istInstrumental: false,
    zeilen: [makeZeile()],
    markups: [],
    ...overrides,
  };
}

function makeSong(
  strophen: ExportStropheData[],
  overrides: Partial<SongExportData> = {},
): SongExportData {
  return {
    titel: "Test Song",
    kuenstler: "Test Artist",
    strophen,
    ...overrides,
  };
}

const ALL_ON: ExportOptions = {
  vocalTags: true,
  instrumental: true,
  kommentare: true, uebersetzungen: true,
};

/** Helper: Formatiert und gibt den Text als String zurück */
function formatText(song: SongExportData, options: ExportOptions = ALL_ON): string {
  const result = formatChordPro(song, options);
  return result.data.toString("utf-8");
}

/** Helper: Gibt die Zeilen des formatierten Textes zurück */
function formatLines(song: SongExportData, options: ExportOptions = ALL_ON): string[] {
  return formatText(song, options).split("\n");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("formatChordPro", () => {
  describe("Metadaten-Direktiven (Req 4.2)", () => {
    it("gibt {title:} und {artist:} am Anfang aus", () => {
      const song = makeSong([makeStrophe()]);
      const lines = formatLines(song);

      expect(lines[0]).toBe("{title: Test Song}");
      expect(lines[1]).toBe("{artist: Test Artist}");
    });

    it("lässt {artist:} weg wenn kuenstler null ist", () => {
      const song = makeSong([makeStrophe()], { kuenstler: null });
      const lines = formatLines(song);

      expect(lines[0]).toBe("{title: Test Song}");
      expect(lines[1]).not.toContain("{artist:");
    });

    it("lässt {artist:} weg wenn kuenstler leer ist", () => {
      const song = makeSong([makeStrophe()], { kuenstler: "  " });
      const lines = formatLines(song);

      expect(lines[0]).toBe("{title: Test Song}");
      expect(lines[1]).not.toContain("{artist:");
    });
  });

  describe("Sektions-Direktiven (Req 4.3)", () => {
    it("mappt Verse-Strophen auf {start_of_verse: <Name>}", () => {
      const song = makeSong([makeStrophe({ name: "Verse 1" })]);
      const text = formatText(song);

      expect(text).toContain("{start_of_verse: Verse 1}");
      expect(text).toContain("{end_of_verse}");
    });

    it("mappt Chorus-Strophen auf {start_of_chorus}", () => {
      const song = makeSong([makeStrophe({ name: "Chorus" })]);
      const text = formatText(song);

      expect(text).toContain("{start_of_chorus}");
      expect(text).toContain("{end_of_chorus}");
    });

    it("mappt Refrain-Strophen auf {start_of_chorus}", () => {
      const song = makeSong([makeStrophe({ name: "Refrain" })]);
      const text = formatText(song);

      expect(text).toContain("{start_of_chorus}");
      expect(text).toContain("{end_of_chorus}");
    });

    it("mappt Bridge-Strophen auf {start_of_bridge}", () => {
      const song = makeSong([makeStrophe({ name: "Bridge" })]);
      const text = formatText(song);

      expect(text).toContain("{start_of_bridge}");
      expect(text).toContain("{end_of_bridge}");
    });

    it("mappt Brücke-Strophen auf {start_of_bridge}", () => {
      const song = makeSong([makeStrophe({ name: "Brücke" })]);
      const text = formatText(song);

      expect(text).toContain("{start_of_bridge}");
      expect(text).toContain("{end_of_bridge}");
    });

    it("Sektions-Mapping ist case-insensitive", () => {
      const song = makeSong([makeStrophe({ name: "CHORUS 1" })]);
      const text = formatText(song);

      expect(text).toContain("{start_of_chorus}");
    });
  });

  describe("Instrumentale Strophen (Req 4.5)", () => {
    it("verwendet {start_of_tab}/{end_of_tab} für instrumentale Strophen", () => {
      const song = makeSong([
        makeStrophe({ name: "Intro", istInstrumental: true }),
      ]);
      const text = formatText(song);

      expect(text).toContain("{start_of_tab}");
      expect(text).toContain("{end_of_tab}");
    });

    it("fügt {comment: [Instrumental]} innerhalb der Tab-Sektion ein", () => {
      const song = makeSong([
        makeStrophe({ name: "Intro", istInstrumental: true }),
      ]);
      const lines = formatLines(song);

      const tabStart = lines.indexOf("{start_of_tab}");
      const tabEnd = lines.indexOf("{end_of_tab}");
      const instrumentalComment = lines.indexOf("{comment: [Instrumental]}");

      expect(instrumentalComment).toBeGreaterThan(tabStart);
      expect(instrumentalComment).toBeLessThan(tabEnd);
    });

    it("entfernt instrumentale Strophen wenn instrumental=false", () => {
      const song = makeSong([
        makeStrophe({ name: "Verse 1", orderIndex: 0 }),
        makeStrophe({ name: "Intro", istInstrumental: true, orderIndex: 1 }),
      ]);
      const text = formatText(song, { ...ALL_ON, instrumental: false });

      expect(text).not.toContain("{start_of_tab}");
      expect(text).not.toContain("[Instrumental]");
    });
  });

  describe("Vocal-Tags (Req 4.4)", () => {
    it("gibt Vocal-Tags als {comment: [<Typ>] <Wert>} aus", () => {
      const song = makeSong([
        makeStrophe({
          zeilen: [
            makeZeile({
              text: "Sing it loud",
              markups: [makeMarkup("BELT", "stark")],
            }),
          ],
        }),
      ]);
      const text = formatText(song);

      expect(text).toContain("{comment: [BELT] stark}");
    });

    it("gibt Strophen-Level Vocal-Tags aus", () => {
      const song = makeSong([
        makeStrophe({
          markups: [makeMarkup("ATMUNG", "leise")],
        }),
      ]);
      const text = formatText(song);

      expect(text).toContain("{comment: [ATMUNG] leise}");
    });

    it("entfernt Vocal-Tags wenn vocalTags=false", () => {
      const song = makeSong([
        makeStrophe({
          markups: [makeMarkup("ATMUNG", "leise")],
          zeilen: [
            makeZeile({
              markups: [makeMarkup("BELT", "stark")],
            }),
          ],
        }),
      ]);
      const text = formatText(song, { ...ALL_ON, vocalTags: false });

      expect(text).not.toContain("[ATMUNG]");
      expect(text).not.toContain("[BELT]");
    });
  });

  describe("Kommentar-Zeilen (Req 4.6)", () => {
    it("gibt Kommentar-Zeilen als {comment: <Text>} aus", () => {
      const song = makeSong([
        makeStrophe({
          zeilen: [
            makeZeile({ text: "Dies ist ein Kommentar", istKommentar: true }),
          ],
        }),
      ]);
      const text = formatText(song);

      expect(text).toContain("{comment: Dies ist ein Kommentar}");
    });

    it("entfernt Kommentar-Zeilen wenn vocalTags=false", () => {
      const song = makeSong([
        makeStrophe({
          zeilen: [
            makeZeile({ text: "Liedtext", orderIndex: 0 }),
            makeZeile({ text: "Kommentar", istKommentar: true, orderIndex: 1 }),
          ],
        }),
      ]);
      const text = formatText(song, { ...ALL_ON, vocalTags: false });

      expect(text).not.toContain("Kommentar");
      expect(text).toContain("Liedtext");
    });
  });

  describe("Übersetzungen (Req 11.1, 11.2)", () => {
    it("gibt Übersetzungen als {comment: ↳ <Text>} nach der Zeile aus", () => {
      const song = makeSong([
        makeStrophe({
          zeilen: [
            makeZeile({
              text: "Hello World",
              uebersetzung: "Hallo Welt",
            }),
          ],
        }),
      ]);
      const lines = formatLines(song);

      const textLine = lines.findIndex((l) => l === "Hello World");
      expect(textLine).toBeGreaterThan(-1);
      expect(lines[textLine + 1]).toBe("{comment: ↳ Hallo Welt}");
    });

    it("gibt keine Übersetzung aus wenn uebersetzung null ist", () => {
      const song = makeSong([
        makeStrophe({
          zeilen: [makeZeile({ text: "Hello", uebersetzung: null })],
        }),
      ]);
      const text = formatText(song);

      expect(text).not.toContain("↳");
    });

    it("gibt keine Übersetzung aus wenn uebersetzung leer ist", () => {
      const song = makeSong([
        makeStrophe({
          zeilen: [makeZeile({ text: "Hello", uebersetzung: "" })],
        }),
      ]);
      const text = formatText(song);

      expect(text).not.toContain("↳");
    });
  });

  describe("Escaping (Req 5.3)", () => {
    it("escaped { und } in Liedtexten", () => {
      const song = makeSong([
        makeStrophe({
          zeilen: [makeZeile({ text: "Text mit {Klammern}" })],
        }),
      ]);
      const text = formatText(song);

      expect(text).toContain("Text mit \\{Klammern\\}");
    });

    it("escaped { und } in Übersetzungen", () => {
      const song = makeSong([
        makeStrophe({
          zeilen: [
            makeZeile({
              text: "Hello",
              uebersetzung: "Hallo {Welt}",
            }),
          ],
        }),
      ]);
      const text = formatText(song);

      expect(text).toContain("{comment: ↳ Hallo \\{Welt\\}}");
    });

    it("escaped { und } in Kommentar-Zeilen", () => {
      const song = makeSong([
        makeStrophe({
          zeilen: [
            makeZeile({
              text: "Kommentar mit {Klammern}",
              istKommentar: true,
            }),
          ],
        }),
      ]);
      const text = formatText(song);

      expect(text).toContain("{comment: Kommentar mit \\{Klammern\\}}");
    });
  });

  describe("Reihenfolge (Req 10.1, 10.2)", () => {
    it("sortiert Strophen nach orderIndex aufsteigend", () => {
      const song = makeSong([
        makeStrophe({ name: "Chorus", orderIndex: 2 }),
        makeStrophe({ name: "Verse 1", orderIndex: 0 }),
        makeStrophe({ name: "Bridge", orderIndex: 1 }),
      ]);
      const text = formatText(song);

      const verse1Pos = text.indexOf("{start_of_verse: Verse 1}");
      const bridgePos = text.indexOf("{start_of_bridge}");
      const chorusPos = text.indexOf("{start_of_chorus}");

      expect(verse1Pos).toBeLessThan(bridgePos);
      expect(bridgePos).toBeLessThan(chorusPos);
    });

    it("sortiert Zeilen innerhalb einer Strophe nach orderIndex aufsteigend", () => {
      const song = makeSong([
        makeStrophe({
          zeilen: [
            makeZeile({ text: "Zeile C", orderIndex: 2 }),
            makeZeile({ text: "Zeile A", orderIndex: 0 }),
            makeZeile({ text: "Zeile B", orderIndex: 1 }),
          ],
        }),
      ]);
      const text = formatText(song);

      const posA = text.indexOf("Zeile A");
      const posB = text.indexOf("Zeile B");
      const posC = text.indexOf("Zeile C");

      expect(posA).toBeLessThan(posB);
      expect(posB).toBeLessThan(posC);
    });
  });

  describe("FormatterResult (Req 4.7)", () => {
    it("gibt einen Buffer zurück", () => {
      const song = makeSong([makeStrophe()]);
      const result = formatChordPro(song, ALL_ON);

      expect(Buffer.isBuffer(result.data)).toBe(true);
    });

    it("gibt den korrekten Content-Type zurück", () => {
      const song = makeSong([makeStrophe()]);
      const result = formatChordPro(song, ALL_ON);

      expect(result.contentType).toBe("text/plain; charset=utf-8");
    });

    it("gibt die korrekte Extension zurück", () => {
      const song = makeSong([makeStrophe()]);
      const result = formatChordPro(song, ALL_ON);

      expect(result.extension).toBe("cho");
    });

    it("generiert den Dateinamen mit .cho Endung", () => {
      const song = makeSong([makeStrophe()]);
      const result = formatChordPro(song, ALL_ON);

      expect(result.filename).toBe("Test Song - Test Artist.cho");
    });

    it("generiert Dateinamen ohne Künstler wenn null", () => {
      const song = makeSong([makeStrophe()], { kuenstler: null });
      const result = formatChordPro(song, ALL_ON);

      expect(result.filename).toBe("Test Song.cho");
    });
  });

  describe("Leerer Song", () => {
    it("erzeugt gültige Ausgabe ohne Strophen", () => {
      const song = makeSong([]);
      const result = formatChordPro(song, ALL_ON);
      const text = result.data.toString("utf-8");

      expect(text).toContain("{title: Test Song}");
      expect(text).toContain("{artist: Test Artist}");
    });
  });

  describe("Komplexes Beispiel", () => {
    it("formatiert einen vollständigen Song korrekt", () => {
      const song = makeSong([
        makeStrophe({
          name: "Verse 1",
          orderIndex: 0,
          zeilen: [
            makeZeile({
              text: "Hello World",
              uebersetzung: "Hallo Welt",
              orderIndex: 0,
              markups: [makeMarkup("BELT", "stark")],
            }),
            makeZeile({
              text: "This is a comment",
              istKommentar: true,
              orderIndex: 1,
            }),
          ],
        }),
        makeStrophe({
          name: "Chorus",
          orderIndex: 1,
          zeilen: [
            makeZeile({ text: "Sing along", orderIndex: 0 }),
          ],
        }),
        makeStrophe({
          name: "Intro",
          orderIndex: 2,
          istInstrumental: true,
          zeilen: [],
        }),
      ]);

      const text = formatText(song);

      // Metadaten
      expect(text).toContain("{title: Test Song}");
      expect(text).toContain("{artist: Test Artist}");

      // Verse 1
      expect(text).toContain("{start_of_verse: Verse 1}");
      expect(text).toContain("{comment: [BELT] stark}");
      expect(text).toContain("Hello World");
      expect(text).toContain("{comment: ↳ Hallo Welt}");
      expect(text).toContain("{comment: This is a comment}");
      expect(text).toContain("{end_of_verse}");

      // Chorus
      expect(text).toContain("{start_of_chorus}");
      expect(text).toContain("Sing along");
      expect(text).toContain("{end_of_chorus}");

      // Instrumental
      expect(text).toContain("{start_of_tab}");
      expect(text).toContain("{comment: [Instrumental]}");
      expect(text).toContain("{end_of_tab}");
    });
  });
});
