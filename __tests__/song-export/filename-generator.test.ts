/**
 * Unit-Tests für Dateinamen-Generator
 *
 * Testet die generateExportFilename-Funktion mit konkreten Beispielen
 * für verschiedene Titel/Künstler-Kombinationen und Sonderzeichen.
 *
 * Requirements: 9.1, 9.2, 9.3
 */

import { describe, it, expect } from "vitest";
import { generateExportFilename } from "@/lib/export/filename-generator";

describe("generateExportFilename", () => {
  describe("Muster mit Künstler (Req 9.1)", () => {
    it("generiert '{Titel} - {Künstler}.{ext}' wenn Künstler vorhanden", () => {
      const result = generateExportFilename("Bohemian Rhapsody", "Queen", "pdf");
      expect(result).toBe("Bohemian Rhapsody - Queen.pdf");
    });

    it("funktioniert mit verschiedenen Dateiendungen", () => {
      expect(generateExportFilename("Song", "Artist", "cho")).toBe("Song - Artist.cho");
      expect(generateExportFilename("Song", "Artist", "onsong")).toBe("Song - Artist.onsong");
      expect(generateExportFilename("Song", "Artist", "sbp")).toBe("Song - Artist.sbp");
    });
  });

  describe("Muster ohne Künstler (Req 9.2)", () => {
    it("generiert '{Titel}.{ext}' wenn Künstler null ist", () => {
      const result = generateExportFilename("Unbekannter Song", null, "pdf");
      expect(result).toBe("Unbekannter Song.pdf");
    });

    it("generiert '{Titel}.{ext}' wenn Künstler leer ist", () => {
      const result = generateExportFilename("Unbekannter Song", "", "cho");
      expect(result).toBe("Unbekannter Song.cho");
    });

    it("generiert '{Titel}.{ext}' wenn Künstler nur Leerzeichen enthält", () => {
      const result = generateExportFilename("Unbekannter Song", "   ", "sbp");
      expect(result).toBe("Unbekannter Song.sbp");
    });
  });

  describe("Ungültige Zeichen entfernen (Req 9.3)", () => {
    it("entfernt / aus dem Dateinamen", () => {
      const result = generateExportFilename("AC/DC Song", "AC/DC", "pdf");
      expect(result).toBe("ACDC Song - ACDC.pdf");
    });

    it("entfernt \\ aus dem Dateinamen", () => {
      const result = generateExportFilename("Back\\Slash", "Art\\ist", "cho");
      expect(result).toBe("BackSlash - Artist.cho");
    });

    it("entfernt : aus dem Dateinamen", () => {
      const result = generateExportFilename("Song: Remix", null, "pdf");
      expect(result).toBe("Song Remix.pdf");
    });

    it("entfernt * aus dem Dateinamen", () => {
      const result = generateExportFilename("Star*Song", null, "pdf");
      expect(result).toBe("StarSong.pdf");
    });

    it("entfernt ? aus dem Dateinamen", () => {
      const result = generateExportFilename("Why?", null, "pdf");
      expect(result).toBe("Why.pdf");
    });

    it('entfernt " aus dem Dateinamen', () => {
      const result = generateExportFilename('"Quoted"', null, "pdf");
      expect(result).toBe("Quoted.pdf");
    });

    it("entfernt < und > aus dem Dateinamen", () => {
      const result = generateExportFilename("<Song>", null, "pdf");
      expect(result).toBe("Song.pdf");
    });

    it("entfernt | aus dem Dateinamen", () => {
      const result = generateExportFilename("Song|Title", null, "pdf");
      expect(result).toBe("SongTitle.pdf");
    });

    it("entfernt mehrere ungültige Zeichen gleichzeitig", () => {
      const result = generateExportFilename(
        'A/B\\C:D*E?F"G<H>I|J',
        null,
        "pdf",
      );
      expect(result).toBe("ABCDEFGHIJ.pdf");
    });

    it("entfernt ungültige Zeichen auch aus der Dateiendung", () => {
      const result = generateExportFilename("Song", null, "p|d:f");
      expect(result).toBe("Song.pdf");
    });
  });

  describe("Reine Funktion", () => {
    it("gibt immer einen String zurück", () => {
      expect(typeof generateExportFilename("", null, "pdf")).toBe("string");
      expect(typeof generateExportFilename("Titel", "Künstler", "cho")).toBe("string");
    });
  });
});
