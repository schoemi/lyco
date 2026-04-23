/**
 * ChordPro-Datei-Exporter
 *
 * Exportiert einen Song als ChordPro-String mit Metadaten-Direktiven,
 * Sektions-Direktiven und Akkorden in eckiger Klammer-Notation.
 *
 * Ausgabeformat:
 * ```
 * {title: Songname}
 * {artist: Künstler}
 * {key: Am}
 * {tempo: 120}
 * {time: 4/4}
 *
 * {start_of_verse: Verse 1}
 * [Am]Erste Zeile [G]Text
 * Zweite Zeile
 * {end_of_verse}
 *
 * {start_of_chorus: Chorus}
 * [C]Refrain [F]Text
 * {end_of_chorus}
 * ```
 *
 * Vocal-Tags können optional als `{comment: [TYP] Wert}`-Direktiven
 * exportiert werden (Toggle-Option `includeVocalTags`).
 */

import type { SongDetail, StropheDetail, ZeileDetail, MarkupResponse } from "@/types/song";
import type { TagDefinitionData } from "@/types/vocal-tag";
import { getSectionType } from "@/lib/chords/section-type";

// ---------------------------------------------------------------------------
// Export-Optionen
// ---------------------------------------------------------------------------

export interface ChordProExportOptions {
  /** Vocal-Tags als ChordPro-Direktiven exportieren (Standard: false) */
  includeVocalTags?: boolean;
}

// ---------------------------------------------------------------------------
// Vocal-Tag-Typen (alle MarkupTyp-Werte außer TIMECODE)
// ---------------------------------------------------------------------------

const VOCAL_TAG_TYPES = new Set([
  "ATMUNG",
  "KOPFSTIMME",
  "BRUSTSTIMME",
  "BELT",
  "FALSETT",
  "PAUSE",
  "WIEDERHOLUNG",
]);

// ---------------------------------------------------------------------------
// Section directives
// ---------------------------------------------------------------------------

function sectionStartDirective(
  sectionType: "verse" | "chorus" | "bridge" | "unknown",
  name: string,
): string {
  switch (sectionType) {
    case "chorus":
      return `{start_of_chorus: ${name}}`;
    case "bridge":
      return `{start_of_bridge: ${name}}`;
    case "verse":
    case "unknown":
    default:
      return `{start_of_verse: ${name}}`;
  }
}

function sectionEndDirective(
  sectionType: "verse" | "chorus" | "bridge" | "unknown",
): string {
  switch (sectionType) {
    case "chorus":
      return "{end_of_chorus}";
    case "bridge":
      return "{end_of_bridge}";
    case "verse":
    case "unknown":
    default:
      return "{end_of_verse}";
  }
}

// ---------------------------------------------------------------------------
// Vocal-Tag formatting
// ---------------------------------------------------------------------------

/**
 * Formatiert Markup-Einträge als `{comment: [TYP] Wert}`-Direktiven.
 * Nur Vocal-Tag-Typen werden berücksichtigt (kein TIMECODE).
 */
function formatVocalTagMarkups(
  markups: MarkupResponse[],
  _tagDefinitions: TagDefinitionData[],
): string[] {
  const lines: string[] = [];
  for (const markup of markups) {
    if (VOCAL_TAG_TYPES.has(markup.typ)) {
      const wert = markup.wert ?? "";
      lines.push(`{comment: [${markup.typ}] ${wert}}`);
    }
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Zeile formatting
// ---------------------------------------------------------------------------

/**
 * Formatiert eine einzelne Zeile. Der Text enthält bereits Akkorde
 * in `[Akkord]`-Notation und wird unverändert ausgegeben.
 */
function formatZeile(
  zeile: ZeileDetail,
  includeVocalTags: boolean,
  tagDefinitions: TagDefinitionData[],
): string[] {
  const lines: string[] = [];

  // Vocal-Tags auf Zeilen-Ebene (vor der Zeile)
  if (includeVocalTags) {
    lines.push(...formatVocalTagMarkups(zeile.markups, tagDefinitions));
  }

  // Zeilentext (enthält bereits [Akkord]-Notation)
  lines.push(zeile.text);

  return lines;
}

// ---------------------------------------------------------------------------
// Strophe formatting
// ---------------------------------------------------------------------------

/**
 * Formatiert eine Strophe als ChordPro-Sektion mit Start-/End-Direktiven.
 */
function formatStrophe(
  strophe: StropheDetail,
  includeVocalTags: boolean,
  tagDefinitions: TagDefinitionData[],
): string[] {
  const sectionType = getSectionType(strophe.name);
  const lines: string[] = [];

  // Sektions-Start
  lines.push(sectionStartDirective(sectionType, strophe.name));

  // Strophen-Level Vocal-Tags
  if (includeVocalTags) {
    lines.push(...formatVocalTagMarkups(strophe.markups, tagDefinitions));
  }

  // Zeilen sortiert nach orderIndex
  const sortedZeilen = [...strophe.zeilen].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );

  for (const zeile of sortedZeilen) {
    lines.push(...formatZeile(zeile, includeVocalTags, tagDefinitions));
  }

  // Sektions-Ende
  lines.push(sectionEndDirective(sectionType));

  return lines;
}

// ---------------------------------------------------------------------------
// Metadaten-Direktiven
// ---------------------------------------------------------------------------

/**
 * Erzeugt die Metadaten-Direktiven für den Song-Header.
 */
function formatMetadata(song: SongDetail): string[] {
  const lines: string[] = [];

  // Titel (immer vorhanden)
  lines.push(`{title: ${song.titel}}`);

  // Künstler (optional)
  if (song.kuenstler != null && song.kuenstler.trim() !== "") {
    lines.push(`{artist: ${song.kuenstler}}`);
  }

  // Tonart (optional)
  if (song.tonart != null && song.tonart.trim() !== "") {
    lines.push(`{key: ${song.tonart}}`);
  }

  // BPM aus beatErgebnis (optional)
  if (song.beatErgebnis != null && song.beatErgebnis.bpm > 0) {
    lines.push(`{tempo: ${song.beatErgebnis.bpm}}`);
  }

  // Taktart aus beatErgebnis (optional)
  if (
    song.beatErgebnis != null &&
    song.beatErgebnis.taktZaehler > 0 &&
    song.beatErgebnis.taktNenner > 0
  ) {
    lines.push(
      `{time: ${song.beatErgebnis.taktZaehler}/${song.beatErgebnis.taktNenner}}`,
    );
  }

  return lines;
}

// ---------------------------------------------------------------------------
// Main export function
// ---------------------------------------------------------------------------

/**
 * Exportiert einen Song als ChordPro-String.
 *
 * @param song - Die Song-Detail-Daten mit Strophen, Zeilen und Metadaten
 * @param tagDefinitions - Die Tag-Definitionen für Vocal-Tag-Auflösung
 * @param options - Export-Optionen (z.B. `includeVocalTags`)
 * @returns ChordPro-formatierter String
 */
export function exportToChordPro(
  song: SongDetail,
  tagDefinitions: TagDefinitionData[],
  options?: ChordProExportOptions,
): string {
  const includeVocalTags = options?.includeVocalTags ?? false;

  const outputLines: string[] = [];

  // Metadaten-Header
  outputLines.push(...formatMetadata(song));

  // Strophen sortiert nach orderIndex
  const sortedStrophen = [...song.strophen].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );

  for (const strophe of sortedStrophen) {
    // Leerzeile vor jeder Strophe
    outputLines.push("");
    outputLines.push(...formatStrophe(strophe, includeVocalTags, tagDefinitions));
  }

  return outputLines.join("\n");
}
