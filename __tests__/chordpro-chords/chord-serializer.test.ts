/**
 * Unit-Tests für Akkord-Serializer (serializeChords)
 *
 * Spezifische Beispiele: einfache Akkorde, komplexe Akkorde, Slash-Akkorde, leere Akkorde
 * Edge Cases: leerer Text, Text ohne Akkorde, nur Akkorde ohne Text
 *
 * _Requirements: 4.1, 4.2_
 */
import { describe, it, expect } from "vitest";
import { serializeChords } from "@/lib/chords/chord-serializer";

describe("serializeChords", () => {
  describe("einfache Akkorde", () => {
    it("serialisiert einen einzelnen Akkord am Anfang", () => {
      const result = serializeChords("Hallo", [{ name: "Am", position: 0 }]);

      expect(result).toBe("[Am]Hallo");
    });

    it("serialisiert zwei Akkorde in einer Zeile", () => {
      const result = serializeChords("Hallo Welt", [
        { name: "Am", position: 0 },
        { name: "G", position: 6 },
      ]);

      expect(result).toBe("[Am]Hallo [G]Welt");
    });

    it("serialisiert einen Akkord mitten im Text", () => {
      const result = serializeChords("Hallo Welt", [
        { name: "C", position: 6 },
      ]);

      expect(result).toBe("Hallo [C]Welt");
    });

    it("serialisiert einen Akkord am Ende des Textes", () => {
      const result = serializeChords("Hallo", [{ name: "D", position: 5 }]);

      expect(result).toBe("Hallo[D]");
    });
  });

  describe("komplexe Akkorde", () => {
    it("serialisiert Akkord mit Qualität (Cmaj7)", () => {
      const result = serializeChords("Text", [{ name: "Cmaj7", position: 0 }]);

      expect(result).toBe("[Cmaj7]Text");
    });

    it("serialisiert Akkord mit Erweiterung (Cmaj7#11)", () => {
      const result = serializeChords("Text", [
        { name: "Cmaj7#11", position: 0 },
      ]);

      expect(result).toBe("[Cmaj7#11]Text");
    });

    it("serialisiert Akkorde mit Vorzeichen (Bb, F#)", () => {
      const result = serializeChords("Eins Zwei", [
        { name: "Bb", position: 0 },
        { name: "F#", position: 5 },
      ]);

      expect(result).toBe("[Bb]Eins [F#]Zwei");
    });
  });

  describe("Slash-Akkorde", () => {
    it("serialisiert Slash-Akkord (Bb/D)", () => {
      const result = serializeChords("Text", [{ name: "Bb/D", position: 0 }]);

      expect(result).toBe("[Bb/D]Text");
    });

    it("serialisiert mehrere Slash-Akkorde", () => {
      const result = serializeChords("Eins Zwei", [
        { name: "C/E", position: 0 },
        { name: "G/B", position: 5 },
      ]);

      expect(result).toBe("[C/E]Eins [G/B]Zwei");
    });
  });

  describe("leere Akkorde (Platzhalter)", () => {
    it("serialisiert leeren Akkordnamen als []", () => {
      const result = serializeChords("Platzhalter", [
        { name: "", position: 0 },
      ]);

      expect(result).toBe("[]Platzhalter");
    });

    it("serialisiert gemischte leere und benannte Akkorde", () => {
      const result = serializeChords("Hallo Welt", [
        { name: "Am", position: 0 },
        { name: "", position: 6 },
      ]);

      expect(result).toBe("[Am]Hallo []Welt");
    });
  });

  describe("leere Akkordliste", () => {
    it("gibt reinen Text unverändert zurück bei leerer Akkordliste", () => {
      const result = serializeChords("Kein Akkord", []);

      expect(result).toBe("Kein Akkord");
    });

    it("gibt leeren String zurück bei leerem Text und leerer Akkordliste", () => {
      const result = serializeChords("", []);

      expect(result).toBe("");
    });
  });

  describe("Akkord-Position außerhalb des Textbereichs", () => {
    it("hängt Akkord am Textende an wenn Position zu groß", () => {
      const result = serializeChords("Hallo", [
        { name: "Am", position: 100 },
      ]);

      expect(result).toBe("Hallo[Am]");
    });

    it("klemmt negative Position auf 0", () => {
      const result = serializeChords("Hallo", [{ name: "Am", position: -5 }]);

      expect(result).toBe("[Am]Hallo");
    });
  });

  describe("Edge Cases", () => {
    it("serialisiert nur Akkorde ohne Text", () => {
      const result = serializeChords("", [
        { name: "Am", position: 0 },
        { name: "G", position: 0 },
      ]);

      expect(result).toBe("[Am][G]");
    });

    it("serialisiert Akkorde mit unsortierter Reihenfolge korrekt", () => {
      const result = serializeChords("Hallo Welt", [
        { name: "G", position: 6 },
        { name: "Am", position: 0 },
      ]);

      expect(result).toBe("[Am]Hallo [G]Welt");
    });

    it("serialisiert mehrere Akkorde an derselben Position", () => {
      const result = serializeChords("Text", [
        { name: "Am", position: 0 },
        { name: "G", position: 0 },
      ]);

      expect(result).toBe("[Am][G]Text");
    });

    it("serialisiert Akkorde mit Leerzeichen im Text", () => {
      const result = serializeChords("    ", [
        { name: "Am", position: 0 },
        { name: "G", position: 2 },
      ]);

      expect(result).toBe("[Am]  [G]  ");
    });
  });
});
