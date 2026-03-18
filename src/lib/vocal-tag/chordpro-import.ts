import type { ChordProNode, ChordProParseError } from "@/types/vocal-tag";
import { parseChordPro } from "./chordpro-parser";

/**
 * Ergebnis eines ChordPro-Imports.
 */
export interface ChordProImportResult {
  /** Erfolgreich geparste Nodes (leer bei Fehlern) */
  nodes: ChordProNode[];
  /** Warnungen (z.B. unbekannte Tags) */
  warnings: string[];
  /** Parse-Fehler mit Zeilennummer */
  errors: ChordProParseError[];
}

/**
 * Liest eine `.chopro`-Datei und parst den Inhalt mit dem ChordPro-Parser.
 *
 * @param file - Die zu importierende Datei
 * @param knownTags - Liste bekannter Tag-Kürzel
 * @returns Import-Ergebnis mit Nodes, Warnungen und Fehlern
 *
 * Validates: Requirements 14.1, 14.2, 14.3
 */
export async function importChordProFile(
  file: File,
  knownTags: string[],
): Promise<ChordProImportResult> {
  const rawText = await file.text();
  return importChordProText(rawText, knownTags);
}

/**
 * Parst einen ChordPro-Rohtext und gibt ein Import-Ergebnis zurück.
 *
 * - Bei Parse-Fehlern werden Nodes trotzdem zurückgegeben (partielle Ergebnisse).
 * - Unbekannte Tags werden als Warn-Nodes mit `unknown: true` importiert.
 * - Fehler enthalten Zeilennummern für die Anzeige.
 *
 * @param rawText - ChordPro-Rohtext
 * @param knownTags - Liste bekannter Tag-Kürzel
 * @returns Import-Ergebnis mit Nodes, Warnungen und Fehlern
 *
 * Validates: Requirements 14.1, 14.2, 14.3
 */
export function importChordProText(
  rawText: string,
  knownTags: string[],
): ChordProImportResult {
  const result = parseChordPro(rawText, knownTags);

  return {
    nodes: result.nodes,
    warnings: result.warnings,
    errors: result.errors,
  };
}

/**
 * Formatiert Parse-Fehler als benutzerfreundliche Fehlermeldungen mit Zeilennummer.
 *
 * @param errors - Array von Parse-Fehlern
 * @returns Formatierte Fehlermeldungen
 *
 * Validates: Requirements 14.2
 */
export function formatImportErrors(errors: ChordProParseError[]): string[] {
  return errors.map((error) => {
    if (error.line != null) {
      return `Zeile ${error.line}: ${error.message}`;
    }
    return error.message;
  });
}
