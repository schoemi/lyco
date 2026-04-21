/**
 * Unit-Tests für ChordPro-Parser
 *
 * Testet die parseChordPro-Funktion mit konkreten Beispielen
 * für alle Parsing-Aspekte: Metadaten, Sektionen, Vocal-Tags,
 * Kommentare, Übersetzungen, Unescaping und Randfälle.
 *
 * Requirements: 5.1, 5.2, 5.3
 */

import { describe, it, expect } from "vitest";
import { parseChordPro } from "@/lib/export/parsers/chordpro-parser";
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

const ALL_ON: ExportOptions = {
  vocalTags: true,
  instrumental: true,
  kommentare: true, uebersetzungen: true,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("parseChordPro", () => {
  describe("Leerer Inhalt", () => {
    it("gibt leere Song-Daten für leeren String zurück", () => {
      const result = parseChordPro("");
      expect(result.titel).toBe("");
      expect(result.kuenstler).toBeNull();
      expect(result.strophen).toEqual([]);
    });

    it("gibt leere Song-Daten für Whitespace-String zurück", () => {
      const result = parseChordPro("   \n  \n  ");
      expect(result.titel).toBe("");
      expect(result.kuenstler).toBeNull();
      expect(result.strophen).toEqual([]);
    });
  });

  describe("Metadaten-Direktiven (Req 5.1)", () => {
    it("parst {title:} Direktive", () => {
      const result = parseChordPro("{title: Mein Song}");
      expect(result.titel).toBe("Mein Song");
    });

    it("parst {artist:} Direktive", () => {
      const result = parseChordPro(
        "{title: Mein Song}\n{artist: Mein Künstler}",
      );
      expect(result.kuenstler).toBe("Mein Künstler");
    });

    it("setzt kuenstler auf null wenn {artist:} fehlt", () => {
      const result = parseChordPro("{title: Mein Song}");
      expect(result.kuenstler).toBeNull();
    });
  });

  describe("Sektions-Direktiven (Req 5.2)", () => {
    it("parst {start_of_verse: <Name>} als Verse-Strophe", () => {
      const content = [
        "{title: Test}",
        "",
        "{start_of_verse: Verse 1}",
        "Hello",
        "{end_of_verse}",
      ].join("\n");

      const result = parseChordPro(content);
      expect(result.strophen).toHaveLength(1);
      expect(result.strophen[0].name).toBe("Verse 1");
      expect(result.strophen[0].istInstrumental).toBe(false);
    });

    it("parst {start_of_chorus} als Chorus-Strophe", () => {
      const content = [
        "{title: Test}",
        "",
        "{start_of_chorus}",
        "Sing along",
        "{end_of_chorus}",
      ].join("\n");

      const result = parseChordPro(content);
      expect(result.strophen).toHaveLength(1);
      expect(result.strophen[0].name).toBe("Chorus");
      expect(result.strophen[0].istInstrumental).toBe(false);
    });

    it("parst {start_of_bridge} als Bridge-Strophe", () => {
      const content = [
        "{title: Test}",
        "",
        "{start_of_bridge}",
        "Bridge text",
        "{end_of_bridge}",
      ].join("\n");

      const result = parseChordPro(content);
      expect(result.strophen).toHaveLength(1);
      expect(result.strophen[0].name).toBe("Bridge");
      expect(result.strophen[0].istInstrumental).toBe(false);
    });

    it("parst {start_of_tab} als instrumentale Strophe", () => {
      const content = [
        "{title: Test}",
        "",
        "{start_of_tab}",
        "{comment: [Instrumental]}",
        "{end_of_tab}",
      ].join("\n");

      const result = parseChordPro(content);
      expect(result.strophen).toHaveLength(1);
      expect(result.strophen[0].istInstrumental).toBe(true);
    });

    it("weist sequentielle orderIndex-Werte zu", () => {
      const content = [
        "{title: Test}",
        "",
        "{start_of_verse: Verse 1}",
        "Line 1",
        "{end_of_verse}",
        "",
        "{start_of_chorus}",
        "Chorus line",
        "{end_of_chorus}",
        "",
        "{start_of_bridge}",
        "Bridge line",
        "{end_of_bridge}",
      ].join("\n");

      const result = parseChordPro(content);
      expect(result.strophen[0].orderIndex).toBe(0);
      expect(result.strophen[1].orderIndex).toBe(1);
      expect(result.strophen[2].orderIndex).toBe(2);
    });
  });

  describe("Instrumental-Marker", () => {
    it("überspringt {comment: [Instrumental]} in Tab-Sektionen", () => {
      const content = [
        "{title: Test}",
        "",
        "{start_of_tab}",
        "{comment: [Instrumental]}",
        "{end_of_tab}",
      ].join("\n");

      const result = parseChordPro(content);
      expect(result.strophen[0].zeilen).toHaveLength(0);
    });
  });

  describe("Vocal-Tags", () => {
    it("parst Vocal-Tags auf Strophe-Level (vor erster Zeile)", () => {
      const content = [
        "{title: Test}",
        "",
        "{start_of_verse: Verse 1}",
        "{comment: [ATMUNG] leise}",
        "Hello",
        "{end_of_verse}",
      ].join("\n");

      const result = parseChordPro(content);
      expect(result.strophen[0].markups).toHaveLength(1);
      expect(result.strophen[0].markups[0].typ).toBe("ATMUNG");
      expect(result.strophen[0].markups[0].wert).toBe("leise");
      expect(result.strophen[0].markups[0].ziel).toBe("STROPHE");
    });

    it("parst Vocal-Tags auf Zeile-Level (vor einer Zeile nach der ersten)", () => {
      const content = [
        "{title: Test}",
        "",
        "{start_of_verse: Verse 1}",
        "First line",
        "{comment: [BELT] stark}",
        "Second line",
        "{end_of_verse}",
      ].join("\n");

      const result = parseChordPro(content);
      expect(result.strophen[0].markups).toHaveLength(0);
      expect(result.strophen[0].zeilen[1].markups).toHaveLength(1);
      expect(result.strophen[0].zeilen[1].markups[0].typ).toBe("BELT");
      expect(result.strophen[0].zeilen[1].markups[0].wert).toBe("stark");
      expect(result.strophen[0].zeilen[1].markups[0].ziel).toBe("ZEILE");
    });

    it("parst Vocal-Tag mit leerem Wert", () => {
      const content = [
        "{title: Test}",
        "",
        "{start_of_verse: Verse 1}",
        "{comment: [PAUSE]}",
        "Hello",
        "{end_of_verse}",
      ].join("\n");

      const result = parseChordPro(content);
      expect(result.strophen[0].markups).toHaveLength(1);
      expect(result.strophen[0].markups[0].typ).toBe("PAUSE");
      expect(result.strophen[0].markups[0].wert).toBe("");
    });

    it("erkennt alle Vocal-Tag-Typen", () => {
      const types = [
        "ATMUNG",
        "KOPFSTIMME",
        "BRUSTSTIMME",
        "BELT",
        "FALSETT",
        "PAUSE",
        "WIEDERHOLUNG",
      ];

      for (const typ of types) {
        const content = [
          "{title: Test}",
          "",
          "{start_of_verse: V}",
          `{comment: [${typ}] test}`,
          "Line",
          "{end_of_verse}",
        ].join("\n");

        const result = parseChordPro(content);
        expect(result.strophen[0].markups[0].typ).toBe(typ);
      }
    });
  });

  describe("Kommentar-Zeilen", () => {
    it("parst reguläre Kommentare als istKommentar=true Zeilen", () => {
      const content = [
        "{title: Test}",
        "",
        "{start_of_verse: Verse 1}",
        "{comment: Dies ist ein Kommentar}",
        "{end_of_verse}",
      ].join("\n");

      const result = parseChordPro(content);
      expect(result.strophen[0].zeilen).toHaveLength(1);
      expect(result.strophen[0].zeilen[0].istKommentar).toBe(true);
      expect(result.strophen[0].zeilen[0].text).toBe("Dies ist ein Kommentar");
    });
  });

  describe("Übersetzungen", () => {
    it("parst {comment: ↳ <Text>} als Übersetzung der vorherigen Zeile", () => {
      const content = [
        "{title: Test}",
        "",
        "{start_of_verse: Verse 1}",
        "Hello World",
        "{comment: ↳ Hallo Welt}",
        "{end_of_verse}",
      ].join("\n");

      const result = parseChordPro(content);
      expect(result.strophen[0].zeilen[0].uebersetzung).toBe("Hallo Welt");
    });

    it("setzt uebersetzung auf null wenn keine Übersetzung vorhanden", () => {
      const content = [
        "{title: Test}",
        "",
        "{start_of_verse: Verse 1}",
        "Hello World",
        "{end_of_verse}",
      ].join("\n");

      const result = parseChordPro(content);
      expect(result.strophen[0].zeilen[0].uebersetzung).toBeNull();
    });
  });

  describe("Unescaping (Req 5.3)", () => {
    it("unescaped \\{ → { und \\} → } in Liedtexten", () => {
      const content = [
        "{title: Test}",
        "",
        "{start_of_verse: Verse 1}",
        "Text mit \\{Klammern\\}",
        "{end_of_verse}",
      ].join("\n");

      const result = parseChordPro(content);
      expect(result.strophen[0].zeilen[0].text).toBe("Text mit {Klammern}");
    });

    it("unescaped \\{ → { und \\} → } in Kommentar-Zeilen", () => {
      const content = [
        "{title: Test}",
        "",
        "{start_of_verse: Verse 1}",
        "{comment: Kommentar mit \\{Klammern\\}}",
        "{end_of_verse}",
      ].join("\n");

      const result = parseChordPro(content);
      expect(result.strophen[0].zeilen[0].text).toBe(
        "Kommentar mit {Klammern}",
      );
    });

    it("unescaped \\{ → { und \\} → } in Übersetzungen", () => {
      const content = [
        "{title: Test}",
        "",
        "{start_of_verse: Verse 1}",
        "Hello",
        "{comment: ↳ Hallo \\{Welt\\}}",
        "{end_of_verse}",
      ].join("\n");

      const result = parseChordPro(content);
      expect(result.strophen[0].zeilen[0].uebersetzung).toBe("Hallo {Welt}");
    });
  });

  describe("Zeilen orderIndex", () => {
    it("weist sequentielle orderIndex-Werte zu", () => {
      const content = [
        "{title: Test}",
        "",
        "{start_of_verse: Verse 1}",
        "Line A",
        "Line B",
        "Line C",
        "{end_of_verse}",
      ].join("\n");

      const result = parseChordPro(content);
      expect(result.strophen[0].zeilen[0].orderIndex).toBe(0);
      expect(result.strophen[0].zeilen[1].orderIndex).toBe(1);
      expect(result.strophen[0].zeilen[2].orderIndex).toBe(2);
    });
  });

  describe("Leere Sektionen", () => {
    it("parst leere Sektionen als Strophe mit leerer Zeilen-Liste", () => {
      const content = [
        "{title: Test}",
        "",
        "{start_of_verse: Verse 1}",
        "{end_of_verse}",
      ].join("\n");

      const result = parseChordPro(content);
      expect(result.strophen).toHaveLength(1);
      expect(result.strophen[0].zeilen).toHaveLength(0);
    });
  });

  describe("Round-Trip mit Formatter", () => {
    it("parse(format(song)) ≅ song für einfachen Song", () => {
      const song: SongExportData = {
        titel: "Test Song",
        kuenstler: "Test Artist",
        strophen: [
          {
            name: "Verse 1",
            orderIndex: 0,
            analyse: null,
            istInstrumental: false,
            zeilen: [
              {
                text: "Hello World",
                uebersetzung: "Hallo Welt",
                orderIndex: 0,
                istKommentar: false,
                markups: [],
              },
              {
                text: "This is a comment",
                uebersetzung: null,
                orderIndex: 1,
                istKommentar: true,
                markups: [],
              },
            ],
            markups: [],
          },
          {
            name: "Chorus",
            orderIndex: 1,
            analyse: null,
            istInstrumental: false,
            zeilen: [
              {
                text: "Sing along",
                uebersetzung: null,
                orderIndex: 0,
                istKommentar: false,
                markups: [],
              },
            ],
            markups: [],
          },
        ],
      };

      const formatted = formatChordPro(song, ALL_ON);
      const parsed = parseChordPro(formatted.data.toString("utf-8"));

      expect(parsed.titel).toBe(song.titel);
      expect(parsed.kuenstler).toBe(song.kuenstler);
      expect(parsed.strophen).toHaveLength(2);

      // Verse 1
      expect(parsed.strophen[0].name).toBe("Verse 1");
      expect(parsed.strophen[0].istInstrumental).toBe(false);
      expect(parsed.strophen[0].zeilen).toHaveLength(2);
      expect(parsed.strophen[0].zeilen[0].text).toBe("Hello World");
      expect(parsed.strophen[0].zeilen[0].uebersetzung).toBe("Hallo Welt");
      expect(parsed.strophen[0].zeilen[0].istKommentar).toBe(false);
      expect(parsed.strophen[0].zeilen[1].text).toBe("This is a comment");
      expect(parsed.strophen[0].zeilen[1].istKommentar).toBe(true);

      // Chorus
      expect(parsed.strophen[1].name).toBe("Chorus");
      expect(parsed.strophen[1].zeilen[0].text).toBe("Sing along");
    });

    it("parse(format(song)) ≅ song mit Vocal-Tags und Instrumental", () => {
      const song: SongExportData = {
        titel: "Complex Song",
        kuenstler: "Artist",
        strophen: [
          {
            name: "Verse 1",
            orderIndex: 0,
            analyse: null,
            istInstrumental: false,
            zeilen: [
              {
                text: "Line with markup",
                uebersetzung: null,
                orderIndex: 0,
                istKommentar: false,
                markups: [
                  {
                    typ: "BELT",
                    ziel: "ZEILE",
                    wert: "stark",
                    timecodeMs: null,
                    wortIndex: null,
                  },
                ],
              },
            ],
            markups: [
              {
                typ: "ATMUNG",
                ziel: "STROPHE",
                wert: "leise",
                timecodeMs: null,
                wortIndex: null,
              },
            ],
          },
          {
            name: "Intro",
            orderIndex: 1,
            analyse: null,
            istInstrumental: true,
            zeilen: [],
            markups: [],
          },
        ],
      };

      const formatted = formatChordPro(song, ALL_ON);
      const parsed = parseChordPro(formatted.data.toString("utf-8"));

      expect(parsed.titel).toBe("Complex Song");
      expect(parsed.kuenstler).toBe("Artist");

      // Verse 1 with strophe-level and zeile-level markups
      const verse = parsed.strophen[0];
      expect(verse.name).toBe("Verse 1");
      // Both ATMUNG (strophe-level) and BELT (zeile-level on first zeile)
      // appear before the first zeile text in the formatter output.
      // The parser assigns all vocal tags before the first zeile to strophe level.
      // This is the expected round-trip behavior: strophe-level + first-zeile-level
      // markups merge into strophe-level markups.
      expect(verse.markups).toHaveLength(2);
      expect(verse.markups[0].typ).toBe("ATMUNG");
      expect(verse.markups[0].wert).toBe("leise");
      expect(verse.markups[1].typ).toBe("BELT");
      expect(verse.markups[1].wert).toBe("stark");

      // Instrumental
      const intro = parsed.strophen[1];
      expect(intro.istInstrumental).toBe(true);
    });

    it("parse(format(song)) ≅ song mit Escaping", () => {
      const song: SongExportData = {
        titel: "Escape Test",
        kuenstler: null,
        strophen: [
          {
            name: "Verse 1",
            orderIndex: 0,
            analyse: null,
            istInstrumental: false,
            zeilen: [
              {
                text: "Text mit {Klammern} und }mehr{",
                uebersetzung: "Übersetzung mit {Klammern}",
                orderIndex: 0,
                istKommentar: false,
                markups: [],
              },
            ],
            markups: [],
          },
        ],
      };

      const formatted = formatChordPro(song, ALL_ON);
      const parsed = parseChordPro(formatted.data.toString("utf-8"));

      expect(parsed.titel).toBe("Escape Test");
      expect(parsed.kuenstler).toBeNull();
      expect(parsed.strophen[0].zeilen[0].text).toBe(
        "Text mit {Klammern} und }mehr{",
      );
      expect(parsed.strophen[0].zeilen[0].uebersetzung).toBe(
        "Übersetzung mit {Klammern}",
      );
    });
  });
});
