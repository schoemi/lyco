/**
 * OnSong-Formatter für Song-Export
 *
 * Serialisiert Song-Daten in das OnSong-Textformat.
 *
 * OnSong-Mapping:
 * - Zeile 1: Titel, Zeile 2: Künstler (oder leer), Zeile 3: Leerzeile
 * - Sektions-Header: `Verse 1:`, `Chorus:`, `Bridge:` etc. basierend auf Strophen-Name
 * - Instrumentale Strophen → `Instrumental:` als Sektions-Header
 * - Vocal-Tags → `;[<MarkupTyp>] <Wert>` (Kommentarzeile mit `;`)
 * - Kommentar-Zeilen → `;<Text>`
 * - Übersetzungen → `; ↳ <Übersetzung>` nach der Zeile
 *
 * Reine Funktion ohne Seiteneffekte.
 */

import type {
  ExportOptions,
  ExportStropheData,
  ExportZeileData,
  FormatterResult,
  SongExportData,
} from "../export-types";
import { VOCAL_TAG_TYPES } from "../export-types";
import { applyExportOptions } from "../format-filter";
import { generateExportFilename } from "../filename-generator";

// ---------------------------------------------------------------------------
// Vocal-Tag formatting
// ---------------------------------------------------------------------------

/**
 * Formatiert Strophen-Level Vocal-Tags als OnSong-Kommentarzeilen.
 */
function formatStropheVocalTags(strophe: ExportStropheData): string[] {
  const lines: string[] = [];
  for (const markup of strophe.markups) {
    if ((VOCAL_TAG_TYPES as string[]).includes(markup.typ)) {
      const wert = markup.wert ?? "";
      lines.push(`;[${markup.typ}] ${wert}`);
    }
  }
  return lines;
}

/**
 * Formatiert Zeilen-Level Vocal-Tags als OnSong-Kommentarzeilen.
 */
function formatZeileVocalTags(zeile: ExportZeileData): string[] {
  const lines: string[] = [];
  for (const markup of zeile.markups) {
    if ((VOCAL_TAG_TYPES as string[]).includes(markup.typ)) {
      const wert = markup.wert ?? "";
      lines.push(`;[${markup.typ}] ${wert}`);
    }
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Zeile formatting
// ---------------------------------------------------------------------------

/**
 * Formatiert eine einzelne Zeile inkl. Vocal-Tags und Übersetzung.
 */
function formatZeile(zeile: ExportZeileData): string[] {
  const lines: string[] = [];

  // Vocal-Tags vor der Zeile
  lines.push(...formatZeileVocalTags(zeile));

  if (zeile.istKommentar) {
    // Kommentar-Zeilen mit führendem ";"
    lines.push(`;${zeile.text}`);
  } else {
    // Reguläre Zeile
    lines.push(zeile.text);
  }

  // Übersetzung nach der Zeile
  if (zeile.uebersetzung != null && zeile.uebersetzung !== "") {
    lines.push(`; ↳ ${zeile.uebersetzung}`);
  }

  return lines;
}

// ---------------------------------------------------------------------------
// Strophe formatting
// ---------------------------------------------------------------------------

/**
 * Ermittelt den Sektions-Header für eine Strophe.
 * Instrumentale Strophen → "Instrumental:"
 * Sonst → Strophen-Name gefolgt von ":"
 */
function sectionHeader(strophe: ExportStropheData): string {
  if (strophe.istInstrumental) {
    return "Instrumental:";
  }
  return `${strophe.name}:`;
}

/**
 * Formatiert eine Strophe als OnSong-Sektion.
 */
function formatStrophe(strophe: ExportStropheData): string[] {
  const lines: string[] = [];

  // Sektions-Header
  lines.push(sectionHeader(strophe));

  // Strophen-Level Vocal-Tags
  lines.push(...formatStropheVocalTags(strophe));

  // Zeilen sortiert nach orderIndex
  const sortedZeilen = [...strophe.zeilen].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );

  for (const zeile of sortedZeilen) {
    lines.push(...formatZeile(zeile));
  }

  return lines;
}

// ---------------------------------------------------------------------------
// Main formatter
// ---------------------------------------------------------------------------

/**
 * Formatiert Song-Daten im OnSong-Format.
 *
 * - Wendet Export-Optionen an (Format-Filter)
 * - Sortiert Strophen nach orderIndex aufsteigend
 * - Sortiert Zeilen innerhalb jeder Strophe nach orderIndex aufsteigend
 * - Gibt FormatterResult mit Buffer zurück
 *
 * @param song - Die Song-Export-Daten
 * @param options - Die Export-Optionen
 * @returns FormatterResult mit OnSong-Text als Buffer
 */
export function formatOnSong(
  song: SongExportData,
  options: ExportOptions,
): FormatterResult {
  // Format-Filter anwenden
  const filtered = applyExportOptions(song, options);

  const outputLines: string[] = [];

  // Zeile 1: Titel
  outputLines.push(filtered.titel);

  // Zeile 2: Künstler (oder leer)
  outputLines.push(filtered.kuenstler ?? "");

  // Zeile 3: Leerzeile (Separator)
  outputLines.push("");

  // Strophen sortiert nach orderIndex
  const sortedStrophen = [...filtered.strophen].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );

  for (let i = 0; i < sortedStrophen.length; i++) {
    // Leerzeile zwischen Strophen für Lesbarkeit
    if (i > 0) {
      outputLines.push("");
    }
    outputLines.push(...formatStrophe(sortedStrophen[i]));
  }

  const text = outputLines.join("\n");
  const filename = generateExportFilename(
    song.titel,
    song.kuenstler,
    "onsong",
  );

  return {
    data: Buffer.from(text, "utf-8"),
    filename,
    contentType: "text/plain; charset=utf-8",
    extension: "onsong",
  };
}
