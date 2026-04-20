/**
 * Export-Typen und Interfaces für den Song-Format-Export
 *
 * Definiert alle TypeScript-Typen für die vier Ausgabeformate
 * (PDF, ChordPro, OnSong, SongbookPro) sowie die zugehörigen
 * Export-Optionen und Datenstrukturen.
 */

import type { MarkupTyp, MarkupZiel } from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Export-Formate
// ---------------------------------------------------------------------------

/** Unterstützte Export-Formate */
export type ExportFormat = "pdf" | "chordpro" | "onsong" | "songbookpro";

// ---------------------------------------------------------------------------
// Export-Optionen
// ---------------------------------------------------------------------------

/** Export-Optionen vom Client */
export interface ExportOptions {
  /** Vocal-Tag-Markups in der Ausgabe einschließen */
  vocalTags: boolean;
  /** Instrumentale Strophen in der Ausgabe einschließen */
  instrumental: boolean;
  /** Kommentar-Zeilen und Strophen-Analysen in der Ausgabe einschließen */
  kommentare: boolean;
}

// ---------------------------------------------------------------------------
// Formatter-Ergebnis
// ---------------------------------------------------------------------------

/** Ergebnis eines Formatter-Aufrufs */
export interface FormatterResult {
  /** Binärdaten der erzeugten Datei */
  data: Buffer;
  /** Generierter Dateiname inkl. Endung */
  filename: string;
  /** HTTP Content-Type für die Response */
  contentType: string;
  /** Dateiendung ohne Punkt (z.B. "pdf", "cho") */
  extension: string;
}

// ---------------------------------------------------------------------------
// Formatter-Funktionssignatur
// ---------------------------------------------------------------------------

/** Funktionssignatur für alle Format-Formatter */
export type SongFormatter = (
  song: SongExportData,
  options: ExportOptions,
) => FormatterResult | Promise<FormatterResult>;

// ---------------------------------------------------------------------------
// Format-Konfiguration
// ---------------------------------------------------------------------------

/** Mapping von Format zu Content-Type und Dateiendung */
export const FORMAT_CONFIG: Record<ExportFormat, { contentType: string; extension: string }> = {
  pdf:         { contentType: "application/pdf",              extension: "pdf" },
  chordpro:    { contentType: "text/plain; charset=utf-8",    extension: "cho" },
  onsong:      { contentType: "text/plain; charset=utf-8",    extension: "onsong" },
  songbookpro: { contentType: "text/plain; charset=utf-8",    extension: "sbp" },
};

// ---------------------------------------------------------------------------
// Vocal-Tag-Typen
// ---------------------------------------------------------------------------

/**
 * Alle MarkupTyp-Werte, die als Vocal-Tags gelten.
 * Enthält alle Typen außer TIMECODE.
 */
export const VOCAL_TAG_TYPES: MarkupTyp[] = [
  "ATMUNG",
  "KOPFSTIMME",
  "BRUSTSTIMME",
  "BELT",
  "FALSETT",
  "PAUSE",
  "WIEDERHOLUNG",
];

// ---------------------------------------------------------------------------
// Song-Export-Datenstruktur
// ---------------------------------------------------------------------------

/** Markup-Daten für den Export */
export interface ExportMarkupData {
  typ: MarkupTyp;
  ziel: MarkupZiel;
  wert: string | null;
  timecodeMs: number | null;
  wortIndex: number | null;
}

/** Zeile mit Markups für den Export */
export interface ExportZeileData {
  text: string;
  uebersetzung: string | null;
  orderIndex: number;
  istKommentar: boolean;
  markups: ExportMarkupData[];
}

/** Strophe mit Zeilen und Markups für den Export */
export interface ExportStropheData {
  name: string;
  orderIndex: number;
  analyse: string | null;
  istInstrumental: boolean;
  zeilen: ExportZeileData[];
  markups: ExportMarkupData[];
}

/**
 * Song-Datenstruktur für den Format-Export.
 *
 * Enthält alle für die Formatierung relevanten Felder,
 * einschließlich `istInstrumental` und `istKommentar` Flags
 * sowie `uebersetzung` auf Zeilen-Ebene.
 */
export interface SongExportData {
  titel: string;
  kuenstler: string | null;
  strophen: ExportStropheData[];
}
