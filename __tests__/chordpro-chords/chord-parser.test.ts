/**
 * Unit-Tests für Akkord-Parser (parseChords)
 *
 * Spezifische Beispiele: einfache Akkorde, komplexe Akkorde, Slash-Akkorde, leere Akkorde
 * Edge Cases: leerer Text, Text ohne Akkorde, nur Akkorde ohne Text
 *
 * _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
 */
import { describe, it, expect } from "vitest";
import { parseChords } from "@/lib/chords/chord-parser";

describe("parseChords", () => {
  describe("einfache Akkorde", () => {
    it("parst einen einzelnen Akkord am Anfang", () => {
      const result = parseChords("[Am]Hallo");

      expect(result.plainText).toBe("Hallo");
      expect(result.chords).toEqual([{ name: "Am", position: 0 }]);
    });

    it("parst zwei Akkorde in einer Zeile", () => {
      const result = parseChords("[Am]Hallo [G]Welt");

      expect(result.plainText).toBe("Hallo Welt");
      expect(result.chords).toEqual([
        { name: "Am", position: 0 },
        { name: "G", position: 6 },
      ]);
    });

    it("parst einen Akkord mitten im Text", () => {
      const result = parseChords("Hallo [C]Welt");

      expect(result.plainText).toBe("Hallo Welt");
      expect(result.chords).toEqual([{ name: "C", position: 6 }]);
    });

    it("parst einen Akkord am Ende des Textes", () => {
      const result = parseChords("Hallo[D]");

      expect(result.plainText).toBe("Hallo");
      expect(result.chords).toEqual([{ name: "D", position: 5 }]);
    });
  });

  describe("komplexe Akkorde", () => {
    it("parst Akkord mit Qualität (maj7)", () => {
      const result = parseChords("[Cmaj7]Text");

      expect(result.plainText).toBe("Text");
      expect(result.chords).toEqual([{ name: "Cmaj7", position: 0 }]);
    });

    it("parst Akkord mit Erweiterung (Cmaj7#11)", () => {
      const result = parseChords("[Cmaj7#11]Text");

      expect(result.plainText).toBe("Text");
      expect(result.chords).toEqual([{ name: "Cmaj7#11", position: 0 }]);
    });

    it("parst Moll-Septakkord (Am7)", () => {
      const result = parseChords("[Am7]Zeile");

      expect(result.plainText).toBe("Zeile");
      expect(result.chords).toEqual([{ name: "Am7", position: 0 }]);
    });

    it("parst verminderten Akkord (Bdim)", () => {
      const result = parseChords("[Bdim]Wort");

      expect(result.plainText).toBe("Wort");
      expect(result.chords).toEqual([{ name: "Bdim", position: 0 }]);
    });

    it("parst Akkord mit Vorzeichen (Bb, F#)", () => {
      const result = parseChords("[Bb]Eins [F#]Zwei");

      expect(result.plainText).toBe("Eins Zwei");
      expect(result.chords).toEqual([
        { name: "Bb", position: 0 },
        { name: "F#", position: 5 },
      ]);
    });
  });

  describe("Slash-Akkorde", () => {
    it("parst Slash-Akkord (Bb/D)", () => {
      const result = parseChords("[Bb/D]Text");

      expect(result.plainText).toBe("Text");
      expect(result.chords).toEqual([{ name: "Bb/D", position: 0 }]);
    });

    it("parst Slash-Akkord mit komplexem Basston (Am7/G)", () => {
      const result = parseChords("[Am7/G]Zeile");

      expect(result.plainText).toBe("Zeile");
      expect(result.chords).toEqual([{ name: "Am7/G", position: 0 }]);
    });

    it("parst mehrere Slash-Akkorde", () => {
      const result = parseChords("[C/E]Eins [G/B]Zwei");

      expect(result.plainText).toBe("Eins Zwei");
      expect(result.chords).toEqual([
        { name: "C/E", position: 0 },
        { name: "G/B", position: 5 },
      ]);
    });
  });

  describe("leere Akkorde (Platzhalter)", () => {
    it("parst leere Klammern als leeren Akkord-Platzhalter", () => {
      const result = parseChords("[]Platzhalter");

      expect(result.plainText).toBe("Platzhalter");
      expect(result.chords).toEqual([{ name: "", position: 0 }]);
    });

    it("parst leere Klammern mitten im Text", () => {
      const result = parseChords("Hallo []Welt");

      expect(result.plainText).toBe("Hallo Welt");
      expect(result.chords).toEqual([{ name: "", position: 6 }]);
    });

    it("parst gemischte leere und benannte Akkorde", () => {
      const result = parseChords("[Am]Hallo []Welt");

      expect(result.plainText).toBe("Hallo Welt");
      expect(result.chords).toEqual([
        { name: "Am", position: 0 },
        { name: "", position: 6 },
      ]);
    });
  });

  describe("Edge Cases", () => {
    it("gibt leeren Text und leere Akkordliste für leeren String zurück", () => {
      const result = parseChords("");

      expect(result.plainText).toBe("");
      expect(result.chords).toEqual([]);
    });

    it("gibt Text ohne Akkorde unverändert zurück", () => {
      const result = parseChords("Kein Akkord");

      expect(result.plainText).toBe("Kein Akkord");
      expect(result.chords).toEqual([]);
    });

    it("parst nur Akkorde ohne Text", () => {
      const result = parseChords("[Am][G][C]");

      expect(result.plainText).toBe("");
      expect(result.chords).toEqual([
        { name: "Am", position: 0 },
        { name: "G", position: 0 },
        { name: "C", position: 0 },
      ]);
    });

    it("behandelt nicht geschlossene Klammer als normalen Text", () => {
      const result = parseChords("Text [ungeschlossen");

      expect(result.plainText).toBe("Text [ungeschlossen");
      expect(result.chords).toEqual([]);
    });

    it("parst mehrere Akkorde an derselben Position", () => {
      const result = parseChords("[Am][G]Text");

      expect(result.plainText).toBe("Text");
      expect(result.chords).toEqual([
        { name: "Am", position: 0 },
        { name: "G", position: 0 },
      ]);
    });

    it("parst Akkorde mit Leerzeichen im Text korrekt", () => {
      const result = parseChords("[Am]  [G]  ");

      expect(result.plainText).toBe("    ");
      expect(result.chords).toEqual([
        { name: "Am", position: 0 },
        { name: "G", position: 2 },
      ]);
    });
  });
});
