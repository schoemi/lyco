/**
 * Unit-Tests für Format-Filter
 *
 * Testet die applyExportOptions-Funktion mit konkreten Beispielen
 * für alle Filterkombinationen.
 *
 * Requirements: 2.3, 2.4, 2.5, 10.3
 */

import { describe, it, expect } from "vitest";
import { applyExportOptions } from "@/lib/export/format-filter";
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

function makeSong(strophen: ExportStropheData[]): SongExportData {
  return { titel: "Test Song", kuenstler: "Test Artist", strophen };
}

const ALL_ON: ExportOptions = {
  vocalTags: true,
  instrumental: true,
  kommentare: true,
};

const ALL_OFF: ExportOptions = {
  vocalTags: false,
  instrumental: false,
  kommentare: false,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("applyExportOptions", () => {
  describe("Alle Optionen aktiviert", () => {
    it("gibt alle Daten unverändert zurück", () => {
      const song = makeSong([
        makeStrophe({
          istInstrumental: true,
          analyse: "Analyse-Text",
          markups: [makeMarkup("ATMUNG", "leise")],
          zeilen: [
            makeZeile({ istKommentar: true, text: "Kommentar" }),
            makeZeile({ markups: [makeMarkup("TIMECODE")] }),
          ],
        }),
      ]);

      const result = applyExportOptions(song, ALL_ON);

      expect(result.strophen).toHaveLength(1);
      expect(result.strophen[0].zeilen).toHaveLength(2);
      expect(result.strophen[0].markups).toHaveLength(1);
      expect(result.strophen[0].analyse).toBe("Analyse-Text");
    });
  });

  describe("vocalTags=false", () => {
    const options: ExportOptions = { ...ALL_ON, vocalTags: false };

    it("entfernt Vocal-Tag-Markups aus Strophen", () => {
      const song = makeSong([
        makeStrophe({
          markups: [
            makeMarkup("ATMUNG", "leise"),
            makeMarkup("KOPFSTIMME", "hoch"),
            makeMarkup("TIMECODE"),
          ],
        }),
      ]);

      const result = applyExportOptions(song, options);

      expect(result.strophen[0].markups).toHaveLength(1);
      expect(result.strophen[0].markups[0].typ).toBe("TIMECODE");
    });

    it("entfernt Vocal-Tag-Markups aus Zeilen", () => {
      const song = makeSong([
        makeStrophe({
          zeilen: [
            makeZeile({
              markups: [
                makeMarkup("BELT", "stark"),
                makeMarkup("FALSETT"),
                makeMarkup("TIMECODE"),
              ],
            }),
          ],
        }),
      ]);

      const result = applyExportOptions(song, options);

      const zeileMarkups = result.strophen[0].zeilen[0].markups;
      expect(zeileMarkups).toHaveLength(1);
      expect(zeileMarkups[0].typ).toBe("TIMECODE");
    });

    it("entfernt alle sieben Vocal-Tag-Typen", () => {
      const allVocalTags: ExportMarkupData["typ"][] = [
        "ATMUNG",
        "KOPFSTIMME",
        "BRUSTSTIMME",
        "BELT",
        "FALSETT",
        "PAUSE",
        "WIEDERHOLUNG",
      ];
      const song = makeSong([
        makeStrophe({
          markups: allVocalTags.map((typ) => makeMarkup(typ)),
        }),
      ]);

      const result = applyExportOptions(song, options);

      expect(result.strophen[0].markups).toHaveLength(0);
    });

    it("behält reguläre Zeilen und Strophen bei", () => {
      const song = makeSong([
        makeStrophe({ zeilen: [makeZeile(), makeZeile()] }),
      ]);

      const result = applyExportOptions(song, options);

      expect(result.strophen).toHaveLength(1);
      expect(result.strophen[0].zeilen).toHaveLength(2);
    });
  });

  describe("instrumental=false", () => {
    const options: ExportOptions = { ...ALL_ON, instrumental: false };

    it("entfernt instrumentale Strophen", () => {
      const song = makeSong([
        makeStrophe({ name: "Verse 1", istInstrumental: false }),
        makeStrophe({ name: "Instrumental", istInstrumental: true }),
        makeStrophe({ name: "Chorus", istInstrumental: false }),
      ]);

      const result = applyExportOptions(song, options);

      expect(result.strophen).toHaveLength(2);
      expect(result.strophen.map((s) => s.name)).toEqual([
        "Verse 1",
        "Chorus",
      ]);
    });

    it("behält nicht-instrumentale Strophen bei", () => {
      const song = makeSong([
        makeStrophe({ istInstrumental: false }),
        makeStrophe({ istInstrumental: false }),
      ]);

      const result = applyExportOptions(song, options);

      expect(result.strophen).toHaveLength(2);
    });
  });

  describe("kommentare=false", () => {
    const options: ExportOptions = { ...ALL_ON, kommentare: false };

    it("entfernt Kommentar-Zeilen", () => {
      const song = makeSong([
        makeStrophe({
          zeilen: [
            makeZeile({ text: "Liedtext", istKommentar: false }),
            makeZeile({ text: "Kommentar", istKommentar: true }),
          ],
        }),
      ]);

      const result = applyExportOptions(song, options);

      expect(result.strophen[0].zeilen).toHaveLength(1);
      expect(result.strophen[0].zeilen[0].text).toBe("Liedtext");
    });

    it("setzt analyse auf null bei allen Strophen", () => {
      const song = makeSong([
        makeStrophe({ analyse: "Analyse-Text 1" }),
        makeStrophe({ analyse: "Analyse-Text 2" }),
        makeStrophe({ analyse: null }),
      ]);

      const result = applyExportOptions(song, options);

      for (const strophe of result.strophen) {
        expect(strophe.analyse).toBeNull();
      }
    });
  });

  describe("Alle Optionen deaktiviert", () => {
    it("wendet alle Filter gleichzeitig an", () => {
      const song = makeSong([
        makeStrophe({
          name: "Verse 1",
          analyse: "Analyse",
          markups: [makeMarkup("ATMUNG"), makeMarkup("TIMECODE")],
          zeilen: [
            makeZeile({ text: "Liedtext", istKommentar: false }),
            makeZeile({ text: "Kommentar", istKommentar: true }),
          ],
        }),
        makeStrophe({
          name: "Instrumental",
          istInstrumental: true,
          zeilen: [makeZeile()],
        }),
      ]);

      const result = applyExportOptions(song, ALL_OFF);

      // Instrumentale Strophe entfernt
      expect(result.strophen).toHaveLength(1);
      // Kommentar-Zeile entfernt
      expect(result.strophen[0].zeilen).toHaveLength(1);
      expect(result.strophen[0].zeilen[0].text).toBe("Liedtext");
      // Analyse auf null
      expect(result.strophen[0].analyse).toBeNull();
      // Vocal-Tags entfernt, TIMECODE erhalten
      expect(result.strophen[0].markups).toHaveLength(1);
      expect(result.strophen[0].markups[0].typ).toBe("TIMECODE");
    });
  });

  describe("Reine Funktion", () => {
    it("verändert die Eingabedaten nicht", () => {
      const originalZeile = makeZeile({
        istKommentar: true,
        markups: [makeMarkup("ATMUNG")],
      });
      const originalStrophe = makeStrophe({
        istInstrumental: true,
        analyse: "Analyse",
        zeilen: [originalZeile],
        markups: [makeMarkup("BELT")],
      });
      const song = makeSong([originalStrophe]);

      // Deep-copy für Vergleich
      const songSnapshot = JSON.parse(JSON.stringify(song));

      applyExportOptions(song, ALL_OFF);

      expect(JSON.parse(JSON.stringify(song))).toEqual(songSnapshot);
    });
  });
});
