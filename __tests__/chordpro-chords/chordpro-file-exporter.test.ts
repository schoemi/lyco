/**
 * Unit-Tests für ChordPro-Datei-Exporter
 *
 * Spezifische Beispiele: Song mit Akkorden, mit BPM/Taktart, mit Vocal-Tags
 * Edge Cases: Song ohne Akkorde, Song ohne Metadaten
 *
 * _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_
 */

import { describe, it, expect } from "vitest";
import { exportToChordPro } from "@/lib/chords/chordpro-file-exporter";
import type { SongDetail, StropheDetail, ZeileDetail, MarkupResponse } from "@/types/song";
import type { TagDefinitionData } from "@/types/vocal-tag";
import type { BeatErgebnisResponse } from "@/types/beat-detection";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeZeile(overrides: Partial<ZeileDetail> & { text: string; orderIndex: number }): ZeileDetail {
  return {
    id: `zeile-${overrides.orderIndex}`,
    uebersetzung: null,
    istKommentar: false,
    startTakt: null,
    endTakt: null,
    markups: [],
    ...overrides,
  };
}

function makeStrophe(
  overrides: Partial<StropheDetail> & { name: string; orderIndex: number; zeilen: ZeileDetail[] },
): StropheDetail {
  return {
    id: `strophe-${overrides.orderIndex}`,
    progress: 0,
    notiz: null,
    analyse: null,
    istInstrumental: false,
    startTakt: null,
    endTakt: null,
    markups: [],
    ...overrides,
  };
}

function makeBeatErgebnis(overrides: Partial<BeatErgebnisResponse> = {}): BeatErgebnisResponse {
  return {
    id: "beat-1",
    songId: "song-1",
    bpm: 0,
    methode: "MANUELL",
    konfidenz: null,
    beatPositionenMs: [],
    frequenzUntergrenze: null,
    frequenzObergrenze: null,
    offsetMs: 0,
    taktZaehler: 0,
    taktNenner: 0,
    ...overrides,
  };
}

function makeSong(overrides: Partial<SongDetail> = {}): SongDetail {
  return {
    id: "song-1",
    titel: "Test Song",
    kuenstler: null,
    sprache: null,
    emotionsTags: [],
    coverUrl: null,
    tonart: null,
    progress: 0,
    sessionCount: 0,
    analyse: null,
    coachTipp: null,
    strophen: [],
    audioQuellen: [],
    sets: [],
    beatErgebnis: null,
    ...overrides,
  };
}

function makeMarkup(overrides: Partial<MarkupResponse> & { typ: string }): MarkupResponse {
  return {
    id: `markup-${Math.random().toString(36).slice(2, 8)}`,
    ziel: "ZEILE" as MarkupResponse["ziel"],
    wert: null,
    timecodeMs: null,
    wortIndex: null,
    ...overrides,
  } as MarkupResponse;
}

const emptyTagDefs: TagDefinitionData[] = [];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("exportToChordPro", () => {
  describe("Song mit Akkorden", () => {
    it("exportiert Strophen mit Akkorden in [Akkord]-Notation", () => {
      const song = makeSong({
        titel: "Mein Lied",
        strophen: [
          makeStrophe({
            name: "Verse 1",
            orderIndex: 0,
            zeilen: [
              makeZeile({ text: "[Am]Erste Zeile [G]Text", orderIndex: 0 }),
              makeZeile({ text: "Zweite Zeile", orderIndex: 1 }),
            ],
          }),
          makeStrophe({
            name: "Chorus",
            orderIndex: 1,
            zeilen: [
              makeZeile({ text: "[C]Refrain [F]Text", orderIndex: 0 }),
            ],
          }),
        ],
      });

      const result = exportToChordPro(song, emptyTagDefs);
      const lines = result.split("\n");

      expect(lines).toContain("{title: Mein Lied}");
      expect(lines).toContain("{start_of_verse: Verse 1}");
      expect(lines).toContain("[Am]Erste Zeile [G]Text");
      expect(lines).toContain("Zweite Zeile");
      expect(lines).toContain("{end_of_verse}");
      expect(lines).toContain("{start_of_chorus: Chorus}");
      expect(lines).toContain("[C]Refrain [F]Text");
      expect(lines).toContain("{end_of_chorus}");
    });

    it("erhält komplexe Akkordnamen wie Cmaj7#11 und Slash-Akkorde", () => {
      const song = makeSong({
        titel: "Jazz Song",
        strophen: [
          makeStrophe({
            name: "Verse 1",
            orderIndex: 0,
            zeilen: [
              makeZeile({ text: "[Cmaj7#11]Komplex [Bb/D]Slash", orderIndex: 0 }),
            ],
          }),
        ],
      });

      const result = exportToChordPro(song, emptyTagDefs);

      expect(result).toContain("[Cmaj7#11]Komplex [Bb/D]Slash");
    });
  });

  describe("Metadaten-Direktiven (Req 10.2)", () => {
    it("exportiert title, artist und key als Direktiven", () => {
      const song = makeSong({
        titel: "Songname",
        kuenstler: "Künstler",
        tonart: "Am",
      });

      const result = exportToChordPro(song, emptyTagDefs);
      const lines = result.split("\n");

      expect(lines).toContain("{title: Songname}");
      expect(lines).toContain("{artist: Künstler}");
      expect(lines).toContain("{key: Am}");
    });

    it("lässt artist weg wenn kuenstler null ist", () => {
      const song = makeSong({
        titel: "Nur Titel",
        kuenstler: null,
      });

      const result = exportToChordPro(song, emptyTagDefs);

      expect(result).toContain("{title: Nur Titel}");
      expect(result).not.toContain("{artist:");
    });

    it("lässt artist weg wenn kuenstler leer ist", () => {
      const song = makeSong({
        titel: "Nur Titel",
        kuenstler: "  ",
      });

      const result = exportToChordPro(song, emptyTagDefs);

      expect(result).not.toContain("{artist:");
    });

    it("lässt key weg wenn tonart null ist", () => {
      const song = makeSong({
        titel: "Ohne Tonart",
        tonart: null,
      });

      const result = exportToChordPro(song, emptyTagDefs);

      expect(result).not.toContain("{key:");
    });
  });

  describe("BPM und Taktart (Req 10.3, 10.4)", () => {
    it("exportiert tempo-Direktive wenn BPM vorhanden", () => {
      const song = makeSong({
        titel: "Tempo Song",
        beatErgebnis: makeBeatErgebnis({ bpm: 120 }),
      });

      const result = exportToChordPro(song, emptyTagDefs);

      expect(result).toContain("{tempo: 120}");
    });

    it("exportiert time-Direktive wenn Taktart vorhanden", () => {
      const song = makeSong({
        titel: "Taktart Song",
        beatErgebnis: makeBeatErgebnis({
          bpm: 100,
          taktZaehler: 3,
          taktNenner: 4,
        }),
      });

      const result = exportToChordPro(song, emptyTagDefs);

      expect(result).toContain("{tempo: 100}");
      expect(result).toContain("{time: 3/4}");
    });

    it("lässt tempo weg wenn bpm 0 ist", () => {
      const song = makeSong({
        titel: "Kein Tempo",
        beatErgebnis: makeBeatErgebnis({ bpm: 0 }),
      });

      const result = exportToChordPro(song, emptyTagDefs);

      expect(result).not.toContain("{tempo:");
    });

    it("lässt time weg wenn taktZaehler oder taktNenner 0 ist", () => {
      const song = makeSong({
        titel: "Keine Taktart",
        beatErgebnis: makeBeatErgebnis({
          bpm: 120,
          taktZaehler: 0,
          taktNenner: 4,
        }),
      });

      const result = exportToChordPro(song, emptyTagDefs);

      expect(result).toContain("{tempo: 120}");
      expect(result).not.toContain("{time:");
    });

    it("lässt tempo und time weg wenn kein beatErgebnis", () => {
      const song = makeSong({
        titel: "Ohne Beat",
        beatErgebnis: null,
      });

      const result = exportToChordPro(song, emptyTagDefs);

      expect(result).not.toContain("{tempo:");
      expect(result).not.toContain("{time:");
    });
  });

  describe("Sektions-Direktiven (Req 10.5)", () => {
    it("mappt Verse auf start_of_verse/end_of_verse", () => {
      const song = makeSong({
        titel: "Test",
        strophen: [
          makeStrophe({
            name: "Verse 1",
            orderIndex: 0,
            zeilen: [makeZeile({ text: "Zeile", orderIndex: 0 })],
          }),
        ],
      });

      const result = exportToChordPro(song, emptyTagDefs);

      expect(result).toContain("{start_of_verse: Verse 1}");
      expect(result).toContain("{end_of_verse}");
    });

    it("mappt Chorus auf start_of_chorus/end_of_chorus", () => {
      const song = makeSong({
        titel: "Test",
        strophen: [
          makeStrophe({
            name: "Chorus",
            orderIndex: 0,
            zeilen: [makeZeile({ text: "Zeile", orderIndex: 0 })],
          }),
        ],
      });

      const result = exportToChordPro(song, emptyTagDefs);

      expect(result).toContain("{start_of_chorus: Chorus}");
      expect(result).toContain("{end_of_chorus}");
    });

    it("mappt Refrain auf start_of_chorus/end_of_chorus", () => {
      const song = makeSong({
        titel: "Test",
        strophen: [
          makeStrophe({
            name: "Refrain",
            orderIndex: 0,
            zeilen: [makeZeile({ text: "Zeile", orderIndex: 0 })],
          }),
        ],
      });

      const result = exportToChordPro(song, emptyTagDefs);

      expect(result).toContain("{start_of_chorus: Refrain}");
      expect(result).toContain("{end_of_chorus}");
    });

    it("mappt Bridge auf start_of_bridge/end_of_bridge", () => {
      const song = makeSong({
        titel: "Test",
        strophen: [
          makeStrophe({
            name: "Bridge",
            orderIndex: 0,
            zeilen: [makeZeile({ text: "Zeile", orderIndex: 0 })],
          }),
        ],
      });

      const result = exportToChordPro(song, emptyTagDefs);

      expect(result).toContain("{start_of_bridge: Bridge}");
      expect(result).toContain("{end_of_bridge}");
    });

    it("mappt unbekannte Sektionsnamen auf start_of_verse", () => {
      const song = makeSong({
        titel: "Test",
        strophen: [
          makeStrophe({
            name: "Intro",
            orderIndex: 0,
            zeilen: [makeZeile({ text: "Zeile", orderIndex: 0 })],
          }),
        ],
      });

      const result = exportToChordPro(song, emptyTagDefs);

      expect(result).toContain("{start_of_verse: Intro}");
      expect(result).toContain("{end_of_verse}");
    });

    it("sortiert Strophen nach orderIndex", () => {
      const song = makeSong({
        titel: "Test",
        strophen: [
          makeStrophe({
            name: "Chorus",
            orderIndex: 1,
            zeilen: [makeZeile({ text: "Refrain", orderIndex: 0 })],
          }),
          makeStrophe({
            name: "Verse 1",
            orderIndex: 0,
            zeilen: [makeZeile({ text: "Strophe", orderIndex: 0 })],
          }),
        ],
      });

      const result = exportToChordPro(song, emptyTagDefs);
      const verseIdx = result.indexOf("{start_of_verse: Verse 1}");
      const chorusIdx = result.indexOf("{start_of_chorus: Chorus}");

      expect(verseIdx).toBeLessThan(chorusIdx);
    });

    it("sortiert Zeilen innerhalb einer Strophe nach orderIndex", () => {
      const song = makeSong({
        titel: "Test",
        strophen: [
          makeStrophe({
            name: "Verse 1",
            orderIndex: 0,
            zeilen: [
              makeZeile({ text: "Zweite", orderIndex: 1 }),
              makeZeile({ text: "Erste", orderIndex: 0 }),
            ],
          }),
        ],
      });

      const result = exportToChordPro(song, emptyTagDefs);
      const ersteIdx = result.indexOf("Erste");
      const zweiteIdx = result.indexOf("Zweite");

      expect(ersteIdx).toBeLessThan(zweiteIdx);
    });
  });

  describe("Vocal-Tags (Req 10.6, 10.7)", () => {
    it("exportiert keine Vocal-Tags wenn includeVocalTags nicht gesetzt", () => {
      const song = makeSong({
        titel: "Test",
        strophen: [
          makeStrophe({
            name: "Verse 1",
            orderIndex: 0,
            zeilen: [
              makeZeile({
                text: "Zeile mit Tag",
                orderIndex: 0,
                markups: [
                  makeMarkup({ typ: "KOPFSTIMME", wert: "leicht" }),
                ],
              }),
            ],
          }),
        ],
      });

      const result = exportToChordPro(song, emptyTagDefs);

      expect(result).not.toContain("{comment:");
    });

    it("exportiert keine Vocal-Tags wenn includeVocalTags false ist", () => {
      const song = makeSong({
        titel: "Test",
        strophen: [
          makeStrophe({
            name: "Verse 1",
            orderIndex: 0,
            zeilen: [
              makeZeile({
                text: "Zeile mit Tag",
                orderIndex: 0,
                markups: [
                  makeMarkup({ typ: "ATMUNG", wert: "tief" }),
                ],
              }),
            ],
          }),
        ],
      });

      const result = exportToChordPro(song, emptyTagDefs, { includeVocalTags: false });

      expect(result).not.toContain("{comment:");
    });

    it("exportiert Zeilen-Level Vocal-Tags als comment-Direktiven wenn includeVocalTags true", () => {
      const song = makeSong({
        titel: "Test",
        strophen: [
          makeStrophe({
            name: "Verse 1",
            orderIndex: 0,
            zeilen: [
              makeZeile({
                text: "[Am]Gesang",
                orderIndex: 0,
                markups: [
                  makeMarkup({ typ: "KOPFSTIMME", wert: "leicht" }),
                ],
              }),
            ],
          }),
        ],
      });

      const result = exportToChordPro(song, emptyTagDefs, { includeVocalTags: true });

      expect(result).toContain("{comment: [KOPFSTIMME] leicht}");
      expect(result).toContain("[Am]Gesang");
    });

    it("exportiert Strophen-Level Vocal-Tags als comment-Direktiven", () => {
      const song = makeSong({
        titel: "Test",
        strophen: [
          makeStrophe({
            name: "Verse 1",
            orderIndex: 0,
            markups: [
              makeMarkup({ typ: "BRUSTSTIMME", ziel: "STROPHE" as MarkupResponse["ziel"], wert: "kräftig" }),
            ],
            zeilen: [
              makeZeile({ text: "Zeile", orderIndex: 0 }),
            ],
          }),
        ],
      });

      const result = exportToChordPro(song, emptyTagDefs, { includeVocalTags: true });

      expect(result).toContain("{comment: [BRUSTSTIMME] kräftig}");
    });

    it("exportiert mehrere Vocal-Tag-Typen", () => {
      const song = makeSong({
        titel: "Test",
        strophen: [
          makeStrophe({
            name: "Verse 1",
            orderIndex: 0,
            zeilen: [
              makeZeile({
                text: "Zeile",
                orderIndex: 0,
                markups: [
                  makeMarkup({ typ: "ATMUNG", wert: "tief" }),
                  makeMarkup({ typ: "BELT", wert: "stark" }),
                  makeMarkup({ typ: "FALSETT", wert: "" }),
                ],
              }),
            ],
          }),
        ],
      });

      const result = exportToChordPro(song, emptyTagDefs, { includeVocalTags: true });

      expect(result).toContain("{comment: [ATMUNG] tief}");
      expect(result).toContain("{comment: [BELT] stark}");
      expect(result).toContain("{comment: [FALSETT] }");
    });

    it("ignoriert TIMECODE-Markups beim Vocal-Tag-Export", () => {
      const song = makeSong({
        titel: "Test",
        strophen: [
          makeStrophe({
            name: "Verse 1",
            orderIndex: 0,
            zeilen: [
              makeZeile({
                text: "Zeile",
                orderIndex: 0,
                markups: [
                  makeMarkup({ typ: "TIMECODE", wert: "1000", timecodeMs: 1000 }),
                  makeMarkup({ typ: "PAUSE", wert: "kurz" }),
                ],
              }),
            ],
          }),
        ],
      });

      const result = exportToChordPro(song, emptyTagDefs, { includeVocalTags: true });

      expect(result).not.toContain("[TIMECODE]");
      expect(result).toContain("{comment: [PAUSE] kurz}");
    });

    it("platziert Vocal-Tag-Kommentare vor der zugehörigen Zeile", () => {
      const song = makeSong({
        titel: "Test",
        strophen: [
          makeStrophe({
            name: "Verse 1",
            orderIndex: 0,
            zeilen: [
              makeZeile({
                text: "Textzeile",
                orderIndex: 0,
                markups: [
                  makeMarkup({ typ: "KOPFSTIMME", wert: "sanft" }),
                ],
              }),
            ],
          }),
        ],
      });

      const result = exportToChordPro(song, emptyTagDefs, { includeVocalTags: true });
      const lines = result.split("\n");

      const commentIdx = lines.findIndex((l) => l.includes("{comment: [KOPFSTIMME] sanft}"));
      const textIdx = lines.findIndex((l) => l === "Textzeile");

      expect(commentIdx).toBeGreaterThan(-1);
      expect(textIdx).toBeGreaterThan(-1);
      expect(commentIdx).toBeLessThan(textIdx);
    });
  });

  describe("Edge Cases", () => {
    it("Song ohne Akkorde – Zeilen werden als reiner Text exportiert", () => {
      const song = makeSong({
        titel: "Ohne Akkorde",
        kuenstler: "Testband",
        strophen: [
          makeStrophe({
            name: "Verse 1",
            orderIndex: 0,
            zeilen: [
              makeZeile({ text: "Nur Text hier", orderIndex: 0 }),
              makeZeile({ text: "Noch eine Zeile", orderIndex: 1 }),
            ],
          }),
        ],
      });

      const result = exportToChordPro(song, emptyTagDefs);

      expect(result).toContain("{title: Ohne Akkorde}");
      expect(result).toContain("{artist: Testband}");
      expect(result).toContain("Nur Text hier");
      expect(result).toContain("Noch eine Zeile");
      expect(result).not.toMatch(/\[.*?\]/);
    });

    it("Song ohne Metadaten – nur Titel wird exportiert", () => {
      const song = makeSong({
        titel: "Minimal",
        kuenstler: null,
        tonart: null,
        beatErgebnis: null,
        strophen: [],
      });

      const result = exportToChordPro(song, emptyTagDefs);

      expect(result).toBe("{title: Minimal}");
    });

    it("Song ohne Strophen – nur Metadaten-Header", () => {
      const song = makeSong({
        titel: "Leer",
        kuenstler: "Band",
        tonart: "C",
        strophen: [],
      });

      const result = exportToChordPro(song, emptyTagDefs);
      const lines = result.split("\n");

      expect(lines).toContain("{title: Leer}");
      expect(lines).toContain("{artist: Band}");
      expect(lines).toContain("{key: C}");
      expect(result).not.toContain("{start_of_");
    });

    it("Leerzeile zwischen Metadaten und erster Strophe", () => {
      const song = makeSong({
        titel: "Test",
        strophen: [
          makeStrophe({
            name: "Verse 1",
            orderIndex: 0,
            zeilen: [makeZeile({ text: "Zeile", orderIndex: 0 })],
          }),
        ],
      });

      const result = exportToChordPro(song, emptyTagDefs);
      const lines = result.split("\n");

      // After {title: Test} there should be an empty line before {start_of_verse: Verse 1}
      const titleIdx = lines.indexOf("{title: Test}");
      const verseIdx = lines.indexOf("{start_of_verse: Verse 1}");

      expect(titleIdx).toBeGreaterThan(-1);
      expect(verseIdx).toBeGreaterThan(-1);
      expect(lines[titleIdx + 1]).toBe("");
      expect(verseIdx).toBe(titleIdx + 2);
    });

    it("vollständiges Beispiel aus dem Design-Dokument", () => {
      const song = makeSong({
        titel: "Songname",
        kuenstler: "Künstler",
        tonart: "Am",
        beatErgebnis: makeBeatErgebnis({
          bpm: 120,
          taktZaehler: 4,
          taktNenner: 4,
        }),
        strophen: [
          makeStrophe({
            name: "Verse 1",
            orderIndex: 0,
            zeilen: [
              makeZeile({ text: "[Am]Erste Zeile [G]Text", orderIndex: 0 }),
              makeZeile({ text: "Zweite Zeile", orderIndex: 1 }),
            ],
          }),
          makeStrophe({
            name: "Chorus",
            orderIndex: 1,
            zeilen: [
              makeZeile({ text: "[C]Refrain [F]Text", orderIndex: 0 }),
            ],
          }),
        ],
      });

      const result = exportToChordPro(song, emptyTagDefs);

      const expected = [
        "{title: Songname}",
        "{artist: Künstler}",
        "{key: Am}",
        "{tempo: 120}",
        "{time: 4/4}",
        "",
        "{start_of_verse: Verse 1}",
        "[Am]Erste Zeile [G]Text",
        "Zweite Zeile",
        "{end_of_verse}",
        "",
        "{start_of_chorus: Chorus}",
        "[C]Refrain [F]Text",
        "{end_of_chorus}",
      ].join("\n");

      expect(result).toBe(expected);
    });
  });
});
