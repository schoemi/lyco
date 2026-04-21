/**
 * ChordPro-Formatter für Song-Export
 *
 * Serialisiert Song-Daten in das ChordPro-Textformat.
 * Escaped geschweifte Klammern in Liedtexten.
 *
 * Sektions-Mapping:
 * - Name enthält "Chorus"/"Refrain" → {start_of_chorus}/{end_of_chorus}
 * - Name enthält "Bridge"/"Brücke" → {start_of_bridge}/{end_of_bridge}
 * - Instrumental → {start_of_tab}/{end_of_tab} + {comment: [Instrumental]}
 * - Sonst → {start_of_verse: <Name>}/{end_of_verse}
 *
 * Vocal-Tags → {comment: [<MarkupTyp>] <Wert>}
 * Kommentar-Zeilen → {comment: <Text>}
 * Übersetzungen → {comment: ↳ <Übersetzung>}
 * Escaping: { → \{, } → \} in Liedtexten
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
import { parseChordPro as parseInlineChordPro, stripChordPro } from "@/lib/vocal-tag/chordpro-parser";

// ---------------------------------------------------------------------------
// Section type mapping
// ---------------------------------------------------------------------------

type ChordProSectionType = "verse" | "chorus" | "bridge" | "tab";

/**
 * Mappt einen Strophen-Namen auf den ChordPro-Sektionstyp.
 */
function mapStropheToSection(
  name: string,
  istInstrumental: boolean,
): ChordProSectionType {
  if (istInstrumental) return "tab";
  const lower = name.toLowerCase();
  if (lower.includes("chorus") || lower.includes("refrain")) return "chorus";
  if (lower.includes("bridge") || lower.includes("brücke")) return "bridge";
  return "verse";
}

// ---------------------------------------------------------------------------
// Escaping
// ---------------------------------------------------------------------------

/**
 * Escaped geschweifte Klammern in Liedtexten,
 * damit sie nicht als ChordPro-Direktiven interpretiert werden.
 */
function escapeChordProText(text: string): string {
  return text.replace(/\{/g, "\\{").replace(/\}/g, "\\}");
}

// ---------------------------------------------------------------------------
// Section directives
// ---------------------------------------------------------------------------

function sectionStartDirective(
  sectionType: ChordProSectionType,
  name: string,
): string {
  switch (sectionType) {
    case "chorus":
      return "{start_of_chorus}";
    case "bridge":
      return "{start_of_bridge}";
    case "tab":
      return "{start_of_tab}";
    case "verse":
      return `{start_of_verse: ${name}}`;
  }
}

function sectionEndDirective(sectionType: ChordProSectionType): string {
  switch (sectionType) {
    case "chorus":
      return "{end_of_chorus}";
    case "bridge":
      return "{end_of_bridge}";
    case "tab":
      return "{end_of_tab}";
    case "verse":
      return "{end_of_verse}";
  }
}

// ---------------------------------------------------------------------------
// Vocal-Tag formatting
// ---------------------------------------------------------------------------

/**
 * Formatiert Strophen-Level Vocal-Tags als {comment:} Direktiven.
 */
function formatStropheVocalTags(strophe: ExportStropheData): string[] {
  const lines: string[] = [];
  for (const markup of strophe.markups) {
    if ((VOCAL_TAG_TYPES as string[]).includes(markup.typ)) {
      const wert = markup.wert ?? "";
      lines.push(`{comment: [${markup.typ}] ${wert}}`);
    }
  }
  return lines;
}

/**
 * Formatiert Zeilen-Level Vocal-Tags als {comment:} Direktiven.
 */
function formatZeileVocalTags(zeile: ExportZeileData): string[] {
  const lines: string[] = [];
  for (const markup of zeile.markups) {
    if ((VOCAL_TAG_TYPES as string[]).includes(markup.typ)) {
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
 * Konvertiert internen ChordPro-Zeilentext in das Export-Format.
 * Vocal Tags werden als [* tag] Kommentare inline geschrieben.
 *
 * Beispiel: "Comin' down {pp:}(Hey){/pp}" → "Comin' down [* pp](Hey)"
 */
function convertVocalTagsForExport(text: string): string {
  // Parse the internal ChordPro format to extract nodes
  // We pass an empty knownTags array so all tags are parsed (unknown flag doesn't matter here)
  const { nodes } = parseInlineChordPro(text, []);

  return nodes
    .map((node) => {
      if (node.type === "text") {
        return escapeChordProText(node.content ?? "");
      }
      if (node.type === "chordpro-range") {
        const tag = node.tag ?? "";
        const rangeText = escapeChordProText(node.rangeText ?? "");
        return `[* ${tag}]${rangeText}`;
      }
      // Inline tag (no range text)
      const tag = node.tag ?? "";
      return `[* ${tag}]`;
    })
    .join("");
}

/**
 * Formatiert eine einzelne Zeile inkl. Vocal-Tags und Übersetzung.
 */
function formatZeile(zeile: ExportZeileData): string[] {
  const lines: string[] = [];

  // Vocal-Tags vor der Zeile (strophe/zeile-level markups)
  lines.push(...formatZeileVocalTags(zeile));

  if (zeile.istKommentar) {
    // Kommentar-Zeilen als {comment:} Direktive
    lines.push(`{comment: ${escapeChordProText(stripChordPro(zeile.text))}}`);
  } else {
    // Reguläre Zeile: Vocal Tags als [* tag] Kommentare exportieren
    lines.push(convertVocalTagsForExport(zeile.text));
  }

  // Übersetzung nach der Zeile
  if (zeile.uebersetzung != null && zeile.uebersetzung !== "") {
    lines.push(`{comment: ↳ ${escapeChordProText(zeile.uebersetzung)}}`);
  }

  return lines;
}

// ---------------------------------------------------------------------------
// Strophe formatting
// ---------------------------------------------------------------------------

/**
 * Formatiert eine Strophe als ChordPro-Sektion.
 */
function formatStrophe(strophe: ExportStropheData): string[] {
  const sectionType = mapStropheToSection(strophe.name, strophe.istInstrumental);
  const lines: string[] = [];

  // Sektions-Start
  lines.push(sectionStartDirective(sectionType, strophe.name));

  // Instrumental-Marker innerhalb der Tab-Sektion
  if (strophe.istInstrumental) {
    lines.push("{comment: [Instrumental]}");
  }

  // Strophen-Level Vocal-Tags
  lines.push(...formatStropheVocalTags(strophe));

  // Zeilen sortiert nach orderIndex
  const sortedZeilen = [...strophe.zeilen].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );

  for (const zeile of sortedZeilen) {
    lines.push(...formatZeile(zeile));
  }

  // Sektions-Ende
  lines.push(sectionEndDirective(sectionType));

  return lines;
}

// ---------------------------------------------------------------------------
// Main formatter
// ---------------------------------------------------------------------------

/**
 * Formatiert Song-Daten im ChordPro-Format.
 *
 * - Wendet Export-Optionen an (Format-Filter)
 * - Sortiert Strophen nach orderIndex aufsteigend
 * - Sortiert Zeilen innerhalb jeder Strophe nach orderIndex aufsteigend
 * - Escaped geschweifte Klammern in Liedtexten
 * - Gibt FormatterResult mit Buffer zurück
 *
 * @param song - Die Song-Export-Daten
 * @param options - Die Export-Optionen
 * @returns FormatterResult mit ChordPro-Text als Buffer
 */
export function formatChordPro(
  song: SongExportData,
  options: ExportOptions,
): FormatterResult {
  // Format-Filter anwenden
  const filtered = applyExportOptions(song, options);

  const outputLines: string[] = [];

  // Metadaten-Direktiven
  outputLines.push(`{title: ${filtered.titel}}`);
  if (filtered.kuenstler != null && filtered.kuenstler.trim() !== "") {
    outputLines.push(`{artist: ${filtered.kuenstler}}`);
  }

  // Strophen sortiert nach orderIndex
  const sortedStrophen = [...filtered.strophen].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );

  for (const strophe of sortedStrophen) {
    // Leerzeile vor jeder Strophe
    outputLines.push("");
    outputLines.push(...formatStrophe(strophe));
  }

  const text = outputLines.join("\n");
  const filename = generateExportFilename(
    song.titel,
    song.kuenstler,
    "cho",
  );

  return {
    data: Buffer.from(text, "utf-8"),
    filename,
    contentType: "text/plain; charset=utf-8",
    extension: "cho",
  };
}
