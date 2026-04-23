/**
 * Unit-Tests für ChordPro-Datei-Parser (parseChordProFile)
 *
 * Spezifische Beispiele: vollständige ChordPro-Datei, nur Metadaten, nur Sektionen
 * Edge Cases: leere Datei, fehlende End-Direktiven, ungültige Syntax
 *
 * _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_
 */
import { describe, it, expect } from "vitest";
import { parseChordProFile } from "@/lib/chords/chordpro-file-parser";

describe("parseChordProFile", () => {
  describe("vollständige ChordPro-Datei", () => {
    it("parst eine vollständige ChordPro-Datei mit Metadaten und Sektionen", () => {
      const content = [
        "{title: Amazing Grace}",
        "{artist: John Newton}",
        "{key: G}",
        "{tempo: 80}",
        "{time: 3/4}",
        "",
        "{start_of_verse: Verse 1}",
        "[G]Amazing [G7]grace how [C]sweet the [G]sound",
        "That [G]saved a [Em]wretch like [D]me",
        "{end_of_verse}",
        "",
        "{start_of_chorus: Chorus}",
        "[G]I once was [G7]lost but [C]now am [G]found",
        "{end_of_chorus}",
      ].join("\n");

      const result = parseChordProFile(content);

      expect(result.metadata.title).toBe("Amazing Grace");
      expect(result.metadata.artist).toBe("John Newton");
      expect(result.metadata.key).toBe("G");
      expect(result.metadata.tempo).toBe(80);
      expect(result.metadata.time).toEqual({ zaehler: 3, nenner: 4 });
      expect(result.sections).toHaveLength(2);
      expect(result.sections[0].type).toBe("verse");
      expect(result.sections[0].name).toBe("Verse 1");
      expect(result.sections[0].lines).toEqual([
        "[G]Amazing [G7]grace how [C]sweet the [G]sound",
        "That [G]saved a [Em]wretch like [D]me",
      ]);
      expect(result.sections[1].type).toBe("chorus");
      expect(result.sections[1].name).toBe("Chorus");
      expect(result.sections[1].lines).toEqual([
        "[G]I once was [G7]lost but [C]now am [G]found",
      ]);
      expect(result.warnings).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it("parst eine Datei mit Verse, Chorus und Bridge", () => {
      const content = [
        "{title: Test Song}",
        "{start_of_verse: Verse 1}",
        "[Am]Erste Zeile",
        "{end_of_verse}",
        "{start_of_chorus: Chorus}",
        "[C]Refrain Zeile",
        "{end_of_chorus}",
        "{start_of_bridge: Bridge}",
        "[F]Bridge Zeile",
        "{end_of_bridge}",
      ].join("\n");

      const result = parseChordProFile(content);

      expect(result.sections).toHaveLength(3);
      expect(result.sections[0].type).toBe("verse");
      expect(result.sections[1].type).toBe("chorus");
      expect(result.sections[2].type).toBe("bridge");
    });
  });

  describe("Metadaten-Direktiven", () => {
    it("parst title-Direktive", () => {
      const result = parseChordProFile("{title: Mein Song}");

      expect(result.metadata.title).toBe("Mein Song");
    });

    it("parst t-Kurzform für title", () => {
      const result = parseChordProFile("{t: Mein Song}");

      expect(result.metadata.title).toBe("Mein Song");
    });

    it("parst artist-Direktive", () => {
      const result = parseChordProFile("{artist: Die Band}");

      expect(result.metadata.artist).toBe("Die Band");
    });

    it("parst subtitle als artist", () => {
      const result = parseChordProFile("{subtitle: Die Band}");

      expect(result.metadata.artist).toBe("Die Band");
    });

    it("parst st-Kurzform als artist", () => {
      const result = parseChordProFile("{st: Die Band}");

      expect(result.metadata.artist).toBe("Die Band");
    });

    it("parst key-Direktive", () => {
      const result = parseChordProFile("{key: Am}");

      expect(result.metadata.key).toBe("Am");
    });

    it("parst tempo-Direktive als Zahl", () => {
      const result = parseChordProFile("{tempo: 120}");

      expect(result.metadata.tempo).toBe(120);
    });

    it("parst time-Direktive als Zähler/Nenner", () => {
      const result = parseChordProFile("{time: 3/4}");

      expect(result.metadata.time).toEqual({ zaehler: 3, nenner: 4 });
    });

    it("parst 4/4-Taktart", () => {
      const result = parseChordProFile("{time: 4/4}");

      expect(result.metadata.time).toEqual({ zaehler: 4, nenner: 4 });
    });

    it("parst 6/8-Taktart", () => {
      const result = parseChordProFile("{time: 6/8}");

      expect(result.metadata.time).toEqual({ zaehler: 6, nenner: 8 });
    });

    it("parst nur Metadaten ohne Sektionen", () => {
      const content = [
        "{title: Nur Metadaten}",
        "{artist: Testband}",
        "{key: C}",
        "{tempo: 100}",
        "{time: 4/4}",
      ].join("\n");

      const result = parseChordProFile(content);

      expect(result.metadata.title).toBe("Nur Metadaten");
      expect(result.metadata.artist).toBe("Testband");
      expect(result.metadata.key).toBe("C");
      expect(result.metadata.tempo).toBe(100);
      expect(result.metadata.time).toEqual({ zaehler: 4, nenner: 4 });
      expect(result.sections).toEqual([]);
    });

    it("lässt fehlende Metadaten als undefined", () => {
      const result = parseChordProFile("{title: Nur Titel}");

      expect(result.metadata.title).toBe("Nur Titel");
      expect(result.metadata.artist).toBeUndefined();
      expect(result.metadata.key).toBeUndefined();
      expect(result.metadata.tempo).toBeUndefined();
      expect(result.metadata.time).toBeUndefined();
    });
  });

  describe("Sektions-Direktiven", () => {
    it("parst verse-Sektion", () => {
      const content = [
        "{start_of_verse: Verse 1}",
        "Erste Zeile",
        "Zweite Zeile",
        "{end_of_verse}",
      ].join("\n");

      const result = parseChordProFile(content);

      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].type).toBe("verse");
      expect(result.sections[0].name).toBe("Verse 1");
      expect(result.sections[0].lines).toEqual([
        "Erste Zeile",
        "Zweite Zeile",
      ]);
    });

    it("parst chorus-Sektion", () => {
      const content = [
        "{start_of_chorus: Refrain}",
        "Refrain Zeile",
        "{end_of_chorus}",
      ].join("\n");

      const result = parseChordProFile(content);

      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].type).toBe("chorus");
      expect(result.sections[0].name).toBe("Refrain");
    });

    it("parst bridge-Sektion", () => {
      const content = [
        "{start_of_bridge: Bridge}",
        "Bridge Zeile",
        "{end_of_bridge}",
      ].join("\n");

      const result = parseChordProFile(content);

      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].type).toBe("bridge");
      expect(result.sections[0].name).toBe("Bridge");
    });

    it("verwendet Sektionstyp als Name wenn kein Name angegeben", () => {
      const content = [
        "{start_of_verse}",
        "Zeile",
        "{end_of_verse}",
      ].join("\n");

      const result = parseChordProFile(content);

      expect(result.sections[0].name).toBe("verse");
    });

    it("parst nur Sektionen ohne Metadaten", () => {
      const content = [
        "{start_of_verse: Verse 1}",
        "[Am]Zeile eins",
        "[G]Zeile zwei",
        "{end_of_verse}",
        "{start_of_chorus: Chorus}",
        "[C]Refrain",
        "{end_of_chorus}",
      ].join("\n");

      const result = parseChordProFile(content);

      expect(result.metadata.title).toBeUndefined();
      expect(result.metadata.artist).toBeUndefined();
      expect(result.sections).toHaveLength(2);
      expect(result.sections[0].lines).toEqual([
        "[Am]Zeile eins",
        "[G]Zeile zwei",
      ]);
      expect(result.sections[1].lines).toEqual(["[C]Refrain"]);
    });

    it("parst mehrere Sektionen desselben Typs", () => {
      const content = [
        "{start_of_verse: Verse 1}",
        "Erste Strophe",
        "{end_of_verse}",
        "{start_of_verse: Verse 2}",
        "Zweite Strophe",
        "{end_of_verse}",
      ].join("\n");

      const result = parseChordProFile(content);

      expect(result.sections).toHaveLength(2);
      expect(result.sections[0].name).toBe("Verse 1");
      expect(result.sections[0].lines).toEqual(["Erste Strophe"]);
      expect(result.sections[1].name).toBe("Verse 2");
      expect(result.sections[1].lines).toEqual(["Zweite Strophe"]);
    });
  });

  describe("Akkord-Erhaltung", () => {
    it("erhält Akkorde im Zeilentext", () => {
      const content = [
        "{start_of_verse}",
        "[Am]Hallo [G]Welt",
        "{end_of_verse}",
      ].join("\n");

      const result = parseChordProFile(content);

      expect(result.sections[0].lines[0]).toBe("[Am]Hallo [G]Welt");
    });

    it("erhält komplexe Akkorde im Zeilentext", () => {
      const content = [
        "{start_of_verse}",
        "[Cmaj7#11]Text [Bb/D]mehr",
        "{end_of_verse}",
      ].join("\n");

      const result = parseChordProFile(content);

      expect(result.sections[0].lines[0]).toBe("[Cmaj7#11]Text [Bb/D]mehr");
    });

    it("erhält Zeilen ohne Akkorde unverändert", () => {
      const content = [
        "{start_of_verse}",
        "Zeile ohne Akkorde",
        "{end_of_verse}",
      ].join("\n");

      const result = parseChordProFile(content);

      expect(result.sections[0].lines[0]).toBe("Zeile ohne Akkorde");
    });
  });

  describe("nicht unterstützte Direktiven", () => {
    it("ignoriert define-Direktive", () => {
      const content = [
        "{define: Am base-fret 0 frets 0 0 2 2 1 0}",
        "{start_of_verse}",
        "[Am]Text",
        "{end_of_verse}",
      ].join("\n");

      const result = parseChordProFile(content);

      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].lines).toEqual(["[Am]Text"]);
      expect(result.errors).toEqual([]);
    });

    it("ignoriert chord-Direktive", () => {
      const content = [
        "{chord: Am}",
        "{start_of_verse}",
        "Text",
        "{end_of_verse}",
      ].join("\n");

      const result = parseChordProFile(content);

      expect(result.sections).toHaveLength(1);
      expect(result.errors).toEqual([]);
    });

    it("ignoriert tab-Block komplett", () => {
      const content = [
        "{start_of_verse: Verse 1}",
        "[Am]Vor dem Tab",
        "{end_of_verse}",
        "{start_of_tab}",
        "e|---0---",
        "B|---1---",
        "{end_of_tab}",
        "{start_of_verse: Verse 2}",
        "[G]Nach dem Tab",
        "{end_of_verse}",
      ].join("\n");

      const result = parseChordProFile(content);

      expect(result.sections).toHaveLength(2);
      expect(result.sections[0].lines).toEqual(["[Am]Vor dem Tab"]);
      expect(result.sections[1].lines).toEqual(["[G]Nach dem Tab"]);
      expect(result.errors).toEqual([]);
    });

    it("ignoriert grid-Block komplett", () => {
      const content = [
        "{start_of_grid}",
        "| Am . . . | G . . . |",
        "{end_of_grid}",
      ].join("\n");

      const result = parseChordProFile(content);

      // Grid content should not appear in sections
      const allLines = result.sections.flatMap((s) => s.lines);
      expect(allLines).not.toContain("| Am . . . | G . . . |");
      expect(result.errors).toEqual([]);
    });

    it("ignoriert unbekannte Direktiven ohne Fehler", () => {
      const content = [
        "{comment: Dies ist ein Kommentar}",
        "{start_of_verse}",
        "Text",
        "{end_of_verse}",
      ].join("\n");

      const result = parseChordProFile(content);

      expect(result.sections).toHaveLength(1);
      expect(result.errors).toEqual([]);
    });
  });

  describe("Edge Cases", () => {
    it("gibt leeres Ergebnis für leere Datei zurück", () => {
      const result = parseChordProFile("");

      expect(result.metadata).toEqual({});
      expect(result.sections).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it("gibt leeres Ergebnis für Datei mit nur Leerzeilen zurück", () => {
      const result = parseChordProFile("\n\n\n");

      expect(result.metadata).toEqual({});
      expect(result.sections).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it("behandelt fehlende End-Direktive — Zeilen bleiben in der Sektion", () => {
      const content = [
        "{start_of_verse: Verse 1}",
        "Zeile eins",
        "Zeile zwei",
      ].join("\n");

      const result = parseChordProFile(content);

      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].type).toBe("verse");
      expect(result.sections[0].lines).toEqual(["Zeile eins", "Zeile zwei"]);
    });

    it("behandelt Zeilen außerhalb von Sektionen als implizite unknown-Sektion", () => {
      const content = [
        "Zeile ohne Sektion",
        "Noch eine Zeile",
      ].join("\n");

      const result = parseChordProFile(content);

      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].type).toBe("unknown");
      expect(result.sections[0].lines).toEqual([
        "Zeile ohne Sektion",
        "Noch eine Zeile",
      ]);
    });

    it("erzeugt Warnung bei ungültigem Tempo", () => {
      const result = parseChordProFile("{tempo: schnell}");

      expect(result.metadata.tempo).toBeUndefined();
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("Ungültiges Tempo");
    });

    it("erzeugt Warnung bei negativem Tempo", () => {
      const result = parseChordProFile("{tempo: -10}");

      expect(result.metadata.tempo).toBeUndefined();
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("erzeugt Warnung bei Tempo 0", () => {
      const result = parseChordProFile("{tempo: 0}");

      expect(result.metadata.tempo).toBeUndefined();
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("erzeugt Warnung bei ungültiger Taktart", () => {
      const result = parseChordProFile("{time: ungültig}");

      expect(result.metadata.time).toBeUndefined();
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("Ungültige Taktart");
    });

    it("erzeugt Warnung bei Taktart ohne Schrägstrich", () => {
      const result = parseChordProFile("{time: 44}");

      expect(result.metadata.time).toBeUndefined();
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("behandelt Leerzeichen in Direktiven korrekt", () => {
      const result = parseChordProFile("{  title  :  Mein Song  }");

      expect(result.metadata.title).toBe("Mein Song");
    });

    it("behandelt Groß-/Kleinschreibung in Direktiven", () => {
      const result = parseChordProFile("{Title: Test}");

      expect(result.metadata.title).toBe("Test");
    });

    it("parst Datei mit Windows-Zeilenumbrüchen (CRLF)", () => {
      const content = "{title: Test}\r\n{start_of_verse}\r\n[Am]Zeile\r\n{end_of_verse}";

      const result = parseChordProFile(content);

      expect(result.metadata.title).toBe("Test");
      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].lines).toEqual(["[Am]Zeile"]);
    });

    it("entfernt abschließende Leerzeilen aus Sektionen", () => {
      const content = [
        "{start_of_verse}",
        "Zeile eins",
        "",
        "",
        "{end_of_verse}",
      ].join("\n");

      const result = parseChordProFile(content);

      expect(result.sections[0].lines).toEqual(["Zeile eins"]);
    });

    it("erhält leere Zeilen innerhalb von Sektionen (nicht am Ende)", () => {
      const content = [
        "{start_of_verse}",
        "Zeile eins",
        "",
        "Zeile drei",
        "{end_of_verse}",
      ].join("\n");

      const result = parseChordProFile(content);

      expect(result.sections[0].lines).toEqual([
        "Zeile eins",
        "",
        "Zeile drei",
      ]);
    });

    it("behandelt aufeinanderfolgende Sektionen ohne Lücke", () => {
      const content = [
        "{start_of_verse}",
        "Verse",
        "{end_of_verse}",
        "{start_of_chorus}",
        "Chorus",
        "{end_of_chorus}",
      ].join("\n");

      const result = parseChordProFile(content);

      expect(result.sections).toHaveLength(2);
      expect(result.sections[0].type).toBe("verse");
      expect(result.sections[1].type).toBe("chorus");
    });

    it("parst Dezimal-Tempo als gültige Zahl", () => {
      const result = parseChordProFile("{tempo: 120.5}");

      expect(result.metadata.tempo).toBe(120.5);
      expect(result.warnings).toEqual([]);
    });
  });
});
