import { describe, it, expect } from "vitest";
import {
  importChordProText,
  formatImportErrors,
} from "@/lib/vocal-tag/chordpro-import";
import type { ChordProParseError } from "@/types/vocal-tag";

const KNOWN_TAGS = ["belt", "falsett", "hauch", "vibrato"];

describe("ChordPro Import", () => {
  describe("importChordProText", () => {
    it("parst gültigen ChordPro-Text in Nodes", () => {
      const result = importChordProText(
        "Sing {belt: kräftig} hier",
        KNOWN_TAGS,
      );

      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.nodes).toHaveLength(3);
      expect(result.nodes[0]).toEqual({ type: "text", content: "Sing " });
      expect(result.nodes[1]).toEqual({
        type: "chordpro-tag",
        tag: "belt",
        zusatztext: "kräftig",
      });
      expect(result.nodes[2]).toEqual({ type: "text", content: " hier" });
    });

    it("parst Tags mit leerem Zusatztext", () => {
      const result = importChordProText("{belt:}", KNOWN_TAGS);

      expect(result.errors).toHaveLength(0);
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0]).toEqual({
        type: "chordpro-tag",
        tag: "belt",
        zusatztext: "",
      });
    });

    it("markiert unbekannte Tags mit unknown: true und erzeugt Warnung", () => {
      const result = importChordProText(
        "{unbekannt: test}",
        KNOWN_TAGS,
      );

      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain("unbekannt");
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0]).toEqual({
        type: "chordpro-tag",
        tag: "unbekannt",
        zusatztext: "test",
        unknown: true,
      });
    });

    it("liefert Fehler mit Zeilennummer bei nicht geschlossener Klammer", () => {
      const result = importChordProText(
        "Zeile 1\nZeile 2 {offen\nZeile 3",
        KNOWN_TAGS,
      );

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].line).toBe(2);
      expect(result.errors[0].position).toBeGreaterThan(0);
    });

    it("parst leeren Text ohne Fehler", () => {
      const result = importChordProText("", KNOWN_TAGS);

      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.nodes).toHaveLength(0);
    });

    it("parst reinen Text ohne Tags", () => {
      const result = importChordProText("Nur Text ohne Tags", KNOWN_TAGS);

      expect(result.errors).toHaveLength(0);
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0]).toEqual({
        type: "text",
        content: "Nur Text ohne Tags",
      });
    });

    it("parst mehrere Tags in einer Zeile", () => {
      const result = importChordProText(
        "{belt: laut} Text {falsett: leise}",
        KNOWN_TAGS,
      );

      expect(result.errors).toHaveLength(0);
      expect(result.nodes).toHaveLength(3);
      expect(result.nodes[0].type).toBe("chordpro-tag");
      expect(result.nodes[0].tag).toBe("belt");
      expect(result.nodes[1].type).toBe("text");
      expect(result.nodes[2].type).toBe("chordpro-tag");
      expect(result.nodes[2].tag).toBe("falsett");
    });

    it("parst mehrzeiligen Text korrekt", () => {
      const result = importChordProText(
        "Zeile 1 {belt: kräftig}\nZeile 2 {hauch:}",
        KNOWN_TAGS,
      );

      expect(result.errors).toHaveLength(0);
      expect(result.nodes).toHaveLength(4);
    });

    it("liefert Fehler bei mehreren ungültigen Klammern", () => {
      const result = importChordProText(
        "{offen1\n{offen2",
        KNOWN_TAGS,
      );

      expect(result.errors.length).toBe(2);
      expect(result.errors[0].line).toBe(1);
      expect(result.errors[1].line).toBe(2);
    });

    it("importiert gemischte bekannte und unbekannte Tags", () => {
      const result = importChordProText(
        "{belt: laut} {xyz: test} {falsett: leise}",
        KNOWN_TAGS,
      );

      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.nodes).toHaveLength(5);

      // belt is known
      expect(result.nodes[0].unknown).toBeUndefined();
      // xyz is unknown
      expect(result.nodes[2].unknown).toBe(true);
      // falsett is known
      expect(result.nodes[4].unknown).toBeUndefined();
    });
  });

  describe("formatImportErrors", () => {
    it("formatiert Fehler mit Zeilennummer", () => {
      const errors: ChordProParseError[] = [
        { message: "Ungültige Klammer", position: 10, line: 3 },
      ];

      const formatted = formatImportErrors(errors);

      expect(formatted).toHaveLength(1);
      expect(formatted[0]).toBe("Zeile 3: Ungültige Klammer");
    });

    it("formatiert Fehler ohne Zeilennummer", () => {
      const errors: ChordProParseError[] = [
        { message: "Allgemeiner Fehler", position: 0 },
      ];

      const formatted = formatImportErrors(errors);

      expect(formatted).toHaveLength(1);
      expect(formatted[0]).toBe("Allgemeiner Fehler");
    });

    it("formatiert mehrere Fehler", () => {
      const errors: ChordProParseError[] = [
        { message: "Fehler A", position: 5, line: 1 },
        { message: "Fehler B", position: 20, line: 3 },
      ];

      const formatted = formatImportErrors(errors);

      expect(formatted).toHaveLength(2);
      expect(formatted[0]).toBe("Zeile 1: Fehler A");
      expect(formatted[1]).toBe("Zeile 3: Fehler B");
    });

    it("gibt leeres Array für leere Fehlerliste zurück", () => {
      const formatted = formatImportErrors([]);
      expect(formatted).toHaveLength(0);
    });
  });
});
