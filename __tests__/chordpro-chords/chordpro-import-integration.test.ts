/**
 * Integrationstests für die ChordPro Import-Pipeline
 *
 * Test: ChordPro-Datei → parseChordProFile() → chordProToImportInput() → valides ImportSongInput
 * Test: Akkorde, Metadaten und Strophenstruktur korrekt übertragen
 *
 * _Requirements: 6.3, 6.4_
 */
import { describe, it, expect } from "vitest";
import {
  parseChordProFile,
  chordProToImportInput,
} from "@/lib/chords/chordpro-file-parser";
import type { ImportSongInput } from "@/types/song";

describe("ChordPro Import-Pipeline Integration", () => {
  describe("vollständige Pipeline: parse → convert → validate", () => {
    it("konvertiert eine realistische ChordPro-Datei in ein valides ImportSongInput", () => {
      const chordProContent = [
        "{title: Wonderwall}",
        "{artist: Oasis}",
        "{key: F#m}",
        "{tempo: 87}",
        "{time: 4/4}",
        "",
        "{start_of_verse: Verse 1}",
        "[Em7]Today is [G]gonna be the day",
        "That they're [Dsus4]gonna throw it back to [A7sus4]you",
        "[Em7]By now you [G]should've somehow",
        "Realized [Dsus4]what you gotta [A7sus4]do",
        "{end_of_verse}",
        "",
        "{start_of_chorus: Chorus}",
        "[C]Because [D]maybe",
        "[Em]You're gonna be the one that [C]saves me",
        "[C]And [D]after [Em]all",
        "You're my wonder[C]wall",
        "{end_of_chorus}",
        "",
        "{start_of_bridge: Bridge}",
        "[Em]I said [G]maybe",
        "{end_of_bridge}",
      ].join("\n");

      const parseResult = parseChordProFile(chordProContent);
      const importInput = chordProToImportInput(parseResult);

      // Metadata mapping
      expect(importInput.titel).toBe("Wonderwall");
      expect(importInput.kuenstler).toBe("Oasis");
      expect(importInput.tonart).toBe("F#m");
      expect(importInput.bpm).toBe(87);
      expect(importInput.taktZaehler).toBe(4);
      expect(importInput.taktNenner).toBe(4);

      // Strophe structure
      expect(importInput.strophen).toHaveLength(3);

      // Verse 1
      expect(importInput.strophen[0].name).toBe("Verse 1");
      expect(importInput.strophen[0].zeilen).toHaveLength(4);
      expect(importInput.strophen[0].zeilen[0].text).toBe(
        "[Em7]Today is [G]gonna be the day",
      );
      expect(importInput.strophen[0].zeilen[1].text).toBe(
        "That they're [Dsus4]gonna throw it back to [A7sus4]you",
      );

      // Chorus
      expect(importInput.strophen[1].name).toBe("Chorus");
      expect(importInput.strophen[1].zeilen).toHaveLength(4);
      expect(importInput.strophen[1].zeilen[0].text).toBe(
        "[C]Because [D]maybe",
      );

      // Bridge
      expect(importInput.strophen[2].name).toBe("Bridge");
      expect(importInput.strophen[2].zeilen).toHaveLength(1);
      expect(importInput.strophen[2].zeilen[0].text).toBe(
        "[Em]I said [G]maybe",
      );
    });

    it("konvertiert eine deutsche ChordPro-Datei korrekt", () => {
      const chordProContent = [
        "{title: 99 Luftballons}",
        "{artist: Nena}",
        "{key: E}",
        "{tempo: 196}",
        "{time: 4/4}",
        "",
        "{start_of_verse: Strophe 1}",
        "[E]Hast du etwas [F#m]Zeit für mich",
        "Dann [A]singe ich ein [B]Lied für dich",
        "{end_of_verse}",
        "",
        "{start_of_chorus: Refrain}",
        "[E]99 Luft[F#m]ballons",
        "Auf [A]ihrem Weg zum [B]Horizont",
        "{end_of_chorus}",
      ].join("\n");

      const parseResult = parseChordProFile(chordProContent);
      const importInput = chordProToImportInput(parseResult);

      expect(importInput.titel).toBe("99 Luftballons");
      expect(importInput.kuenstler).toBe("Nena");
      expect(importInput.tonart).toBe("E");
      expect(importInput.bpm).toBe(196);
      expect(importInput.taktZaehler).toBe(4);
      expect(importInput.taktNenner).toBe(4);

      expect(importInput.strophen).toHaveLength(2);
      expect(importInput.strophen[0].name).toBe("Strophe 1");
      expect(importInput.strophen[0].zeilen).toHaveLength(2);
      expect(importInput.strophen[1].name).toBe("Refrain");
      expect(importInput.strophen[1].zeilen).toHaveLength(2);
    });
  });

  describe("Metadaten-Mapping", () => {
    it("mappt title auf titel", () => {
      const content = "{title: Test Song}";
      const result = chordProToImportInput(parseChordProFile(content));

      expect(result.titel).toBe("Test Song");
    });

    it("mappt artist auf kuenstler", () => {
      const content = "{artist: Test Artist}";
      const result = chordProToImportInput(parseChordProFile(content));

      expect(result.kuenstler).toBe("Test Artist");
    });

    it("mappt key auf tonart", () => {
      const content = "{key: Bb}";
      const result = chordProToImportInput(parseChordProFile(content));

      expect(result.tonart).toBe("Bb");
    });

    it("mappt tempo auf bpm", () => {
      const content = "{tempo: 140}";
      const result = chordProToImportInput(parseChordProFile(content));

      expect(result.bpm).toBe(140);
    });

    it("mappt time auf taktZaehler und taktNenner", () => {
      const content = "{time: 3/4}";
      const result = chordProToImportInput(parseChordProFile(content));

      expect(result.taktZaehler).toBe(3);
      expect(result.taktNenner).toBe(4);
    });

    it("mappt 6/8-Taktart korrekt", () => {
      const content = "{time: 6/8}";
      const result = chordProToImportInput(parseChordProFile(content));

      expect(result.taktZaehler).toBe(6);
      expect(result.taktNenner).toBe(8);
    });

    it("setzt Fallback-Titel 'Untitled' wenn kein title vorhanden", () => {
      const content = [
        "{artist: Unbekannt}",
        "{start_of_verse}",
        "Zeile",
        "{end_of_verse}",
      ].join("\n");
      const result = chordProToImportInput(parseChordProFile(content));

      expect(result.titel).toBe("Untitled");
    });

    it("lässt optionale Felder undefined wenn nicht vorhanden", () => {
      const content = "{title: Minimal}";
      const result = chordProToImportInput(parseChordProFile(content));

      expect(result.titel).toBe("Minimal");
      expect(result.kuenstler).toBeUndefined();
      expect(result.tonart).toBeUndefined();
      expect(result.bpm).toBeUndefined();
      expect(result.taktZaehler).toBeUndefined();
      expect(result.taktNenner).toBeUndefined();
    });
  });

  describe("Strophenstruktur", () => {
    it("mappt Sektionen auf Strophen mit korrekten Namen", () => {
      const content = [
        "{start_of_verse: Verse 1}",
        "Zeile A",
        "{end_of_verse}",
        "{start_of_chorus: Chorus}",
        "Zeile B",
        "{end_of_chorus}",
        "{start_of_bridge: Bridge}",
        "Zeile C",
        "{end_of_bridge}",
      ].join("\n");

      const result = chordProToImportInput(parseChordProFile(content));

      expect(result.strophen).toHaveLength(3);
      expect(result.strophen[0].name).toBe("Verse 1");
      expect(result.strophen[1].name).toBe("Chorus");
      expect(result.strophen[2].name).toBe("Bridge");
    });

    it("mappt Zeilen innerhalb von Strophen korrekt", () => {
      const content = [
        "{start_of_verse: Verse 1}",
        "Erste Zeile",
        "Zweite Zeile",
        "Dritte Zeile",
        "{end_of_verse}",
      ].join("\n");

      const result = chordProToImportInput(parseChordProFile(content));

      expect(result.strophen[0].zeilen).toHaveLength(3);
      expect(result.strophen[0].zeilen[0].text).toBe("Erste Zeile");
      expect(result.strophen[0].zeilen[1].text).toBe("Zweite Zeile");
      expect(result.strophen[0].zeilen[2].text).toBe("Dritte Zeile");
    });

    it("mappt mehrere Strophen desselben Typs", () => {
      const content = [
        "{start_of_verse: Verse 1}",
        "Strophe eins",
        "{end_of_verse}",
        "{start_of_verse: Verse 2}",
        "Strophe zwei",
        "{end_of_verse}",
        "{start_of_verse: Verse 3}",
        "Strophe drei",
        "{end_of_verse}",
      ].join("\n");

      const result = chordProToImportInput(parseChordProFile(content));

      expect(result.strophen).toHaveLength(3);
      expect(result.strophen[0].name).toBe("Verse 1");
      expect(result.strophen[1].name).toBe("Verse 2");
      expect(result.strophen[2].name).toBe("Verse 3");
    });
  });

  describe("Akkord-Erhaltung in der Pipeline", () => {
    it("erhält einfache Akkorde im Zeilentext", () => {
      const content = [
        "{start_of_verse}",
        "[Am]Hallo [G]Welt",
        "{end_of_verse}",
      ].join("\n");

      const result = chordProToImportInput(parseChordProFile(content));

      expect(result.strophen[0].zeilen[0].text).toBe("[Am]Hallo [G]Welt");
    });

    it("erhält komplexe Akkorde (Maj7, Slash, Erweiterungen)", () => {
      const content = [
        "{start_of_verse}",
        "[Cmaj7#11]Erster [Bb/D]Teil [Asus4]Ende",
        "{end_of_verse}",
      ].join("\n");

      const result = chordProToImportInput(parseChordProFile(content));

      expect(result.strophen[0].zeilen[0].text).toBe(
        "[Cmaj7#11]Erster [Bb/D]Teil [Asus4]Ende",
      );
    });

    it("erhält Zeilen ohne Akkorde unverändert", () => {
      const content = [
        "{start_of_verse}",
        "[Am]Zeile mit Akkord",
        "Zeile ohne Akkord",
        "{end_of_verse}",
      ].join("\n");

      const result = chordProToImportInput(parseChordProFile(content));

      expect(result.strophen[0].zeilen[0].text).toBe("[Am]Zeile mit Akkord");
      expect(result.strophen[0].zeilen[1].text).toBe("Zeile ohne Akkord");
    });

    it("erhält Akkorde über mehrere Strophen hinweg", () => {
      const content = [
        "{start_of_verse: Verse 1}",
        "[Am]Verse Zeile",
        "{end_of_verse}",
        "{start_of_chorus: Chorus}",
        "[C]Chorus [G]Zeile",
        "{end_of_chorus}",
      ].join("\n");

      const result = chordProToImportInput(parseChordProFile(content));

      expect(result.strophen[0].zeilen[0].text).toBe("[Am]Verse Zeile");
      expect(result.strophen[1].zeilen[0].text).toBe("[C]Chorus [G]Zeile");
    });
  });

  describe("Edge Cases", () => {
    it("behandelt Datei mit nur Metadaten (keine Sektionen)", () => {
      const content = [
        "{title: Nur Metadaten}",
        "{artist: Testband}",
        "{key: C}",
        "{tempo: 100}",
        "{time: 4/4}",
      ].join("\n");

      const result = chordProToImportInput(parseChordProFile(content));

      expect(result.titel).toBe("Nur Metadaten");
      expect(result.kuenstler).toBe("Testband");
      expect(result.tonart).toBe("C");
      expect(result.bpm).toBe(100);
      expect(result.taktZaehler).toBe(4);
      expect(result.taktNenner).toBe(4);
      expect(result.strophen).toHaveLength(0);
    });

    it("behandelt Datei ohne Titel — Fallback auf 'Untitled'", () => {
      const content = [
        "{key: Am}",
        "{start_of_verse}",
        "[Am]Zeile",
        "{end_of_verse}",
      ].join("\n");

      const result = chordProToImportInput(parseChordProFile(content));

      expect(result.titel).toBe("Untitled");
      expect(result.tonart).toBe("Am");
      expect(result.strophen).toHaveLength(1);
    });

    it("behandelt leere Datei", () => {
      const result = chordProToImportInput(parseChordProFile(""));

      expect(result.titel).toBe("Untitled");
      expect(result.strophen).toHaveLength(0);
    });

    it("ignoriert nicht unterstützte Direktiven in der Pipeline", () => {
      const content = [
        "{title: Mit Tabs}",
        "{define: Am base-fret 0 frets 0 0 2 2 1 0}",
        "{start_of_tab}",
        "e|---0---",
        "B|---1---",
        "{end_of_tab}",
        "{start_of_verse: Verse 1}",
        "[Am]Echte Zeile",
        "{end_of_verse}",
      ].join("\n");

      const result = chordProToImportInput(parseChordProFile(content));

      expect(result.titel).toBe("Mit Tabs");
      expect(result.strophen).toHaveLength(1);
      expect(result.strophen[0].zeilen).toHaveLength(1);
      expect(result.strophen[0].zeilen[0].text).toBe("[Am]Echte Zeile");
    });

    it("erzeugt valides ImportSongInput-Objekt mit allen Pflichtfeldern", () => {
      const content = [
        "{title: Validierungstest}",
        "{start_of_verse: Verse 1}",
        "[G]Test",
        "{end_of_verse}",
      ].join("\n");

      const result = chordProToImportInput(parseChordProFile(content));

      // Validate the shape matches ImportSongInput
      expect(result).toHaveProperty("titel");
      expect(result).toHaveProperty("strophen");
      expect(typeof result.titel).toBe("string");
      expect(Array.isArray(result.strophen)).toBe(true);

      // Each strophe has required fields
      for (const strophe of result.strophen) {
        expect(strophe).toHaveProperty("name");
        expect(strophe).toHaveProperty("zeilen");
        expect(typeof strophe.name).toBe("string");
        expect(Array.isArray(strophe.zeilen)).toBe(true);

        // Each zeile has required text field
        for (const zeile of strophe.zeilen) {
          expect(zeile).toHaveProperty("text");
          expect(typeof zeile.text).toBe("string");
        }
      }
    });

    it("behandelt Datei mit Windows-Zeilenumbrüchen (CRLF)", () => {
      const content =
        "{title: CRLF Test}\r\n{start_of_verse}\r\n[Am]Zeile\r\n{end_of_verse}";

      const result = chordProToImportInput(parseChordProFile(content));

      expect(result.titel).toBe("CRLF Test");
      expect(result.strophen).toHaveLength(1);
      expect(result.strophen[0].zeilen[0].text).toBe("[Am]Zeile");
    });
  });
});
