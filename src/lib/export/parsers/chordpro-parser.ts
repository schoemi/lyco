/**
 * ChordPro-Parser für Song-Import
 *
 * Parst eine ChordPro-Textdatei zurück in SongExportData.
 * Garantiert Round-Trip: parse(format(song)) ≅ song
 *
 * Erkennt:
 * - {title:} und {artist:} Direktiven
 * - Sektions-Direktiven ({start_of_verse:}, {start_of_chorus}, {start_of_bridge}, {start_of_tab})
 * - {comment: [Instrumental]} als Instrumental-Marker (wird übersprungen)
 * - {comment: [<MarkupTyp>] <Wert>} als Vocal-Tag-Markup
 * - {comment: ↳ <Übersetzung>} als Übersetzung der vorherigen Zeile
 * - {comment: <Text>} als Kommentar-Zeile
 * - Regulärer Text als Liedzeile mit Unescaping: \{ → {, \} → }
 *
 * Vocal-Tag-Zuordnung:
 * - Vocal-Tags vor der ersten Zeile einer Sektion → Strophe-Level-Markups
 * - Vocal-Tags unmittelbar vor einer Zeile (nach der ersten) → Zeile-Level-Markups
 *
 * Reine Funktion ohne Seiteneffekte.
 */

import type {
  ExportMarkupData,
  ExportStropheData,
  ExportZeileData,
  SongExportData,
} from "../export-types";
import type { MarkupTyp } from "@/generated/prisma/client";
import { VOCAL_TAG_TYPES } from "../export-types";

// ---------------------------------------------------------------------------
// Vocal-Tag type set for fast lookup
// ---------------------------------------------------------------------------

const VOCAL_TAG_TYPE_SET = new Set<string>(VOCAL_TAG_TYPES as string[]);

// ---------------------------------------------------------------------------
// Unescaping
// ---------------------------------------------------------------------------

/**
 * Unescaped ChordPro-Escaping in Liedtexten:
 * \{ → {, \} → }
 */
function unescapeChordProText(text: string): string {
  return text.replace(/\\\{/g, "{").replace(/\\\}/g, "}");
}

// ---------------------------------------------------------------------------
// Directive parsing
// ---------------------------------------------------------------------------

/**
 * Versucht eine Zeile als ChordPro-Direktive zu parsen.
 * Gibt null zurück, wenn die Zeile keine Direktive ist.
 *
 * Format: {name: value} oder {name}
 */
function parseDirective(
  line: string,
): { name: string; value: string | null } | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return null;

  // Remove outer braces
  const inner = trimmed.slice(1, -1);

  // Find the colon separator (if any)
  const colonIndex = inner.indexOf(":");
  if (colonIndex === -1) {
    return { name: inner.trim(), value: null };
  }

  const name = inner.slice(0, colonIndex).trim();
  const value = inner.slice(colonIndex + 1).trimStart();

  return { name, value };
}

// ---------------------------------------------------------------------------
// Section name mapping (inverse of formatter)
// ---------------------------------------------------------------------------

/**
 * Mappt eine Sektions-Start-Direktive zurück auf Strophen-Name und istInstrumental.
 */
function mapSectionToStrophe(
  directiveName: string,
  directiveValue: string | null,
): { name: string; istInstrumental: boolean } {
  switch (directiveName) {
    case "start_of_chorus":
      return { name: "Chorus", istInstrumental: false };
    case "start_of_bridge":
      return { name: "Bridge", istInstrumental: false };
    case "start_of_tab":
      return { name: directiveValue ?? "Instrumental", istInstrumental: true };
    case "start_of_verse":
      return { name: directiveValue ?? "Verse", istInstrumental: false };
    default:
      return { name: directiveValue ?? "Verse", istInstrumental: false };
  }
}

// ---------------------------------------------------------------------------
// Comment directive parsing
// ---------------------------------------------------------------------------

/**
 * Prüft ob ein Kommentar-Wert ein Vocal-Tag ist.
 * Format: [<MarkupTyp>] <Wert> oder [<MarkupTyp>]
 */
function parseVocalTagComment(
  value: string,
): { typ: MarkupTyp; wert: string } | null {
  const match = value.match(/^\[([A-ZÄÖÜ]+)\](.*)$/);
  if (!match) return null;

  const typ = match[1];
  if (!VOCAL_TAG_TYPE_SET.has(typ)) return null;

  // The wert part: trim leading space (the formatter adds a space after ])
  const wert = match[2].startsWith(" ") ? match[2].slice(1) : match[2];

  return { typ: typ as MarkupTyp, wert };
}

/**
 * Prüft ob ein Kommentar-Wert eine Übersetzung ist.
 * Format: ↳ <Übersetzung>
 */
function parseTranslationComment(value: string): string | null {
  if (!value.startsWith("↳ ")) return null;
  return unescapeChordProText(value.slice(2));
}

/**
 * Prüft ob ein Kommentar-Wert der Instrumental-Marker ist.
 * Format: [Instrumental]
 */
function isInstrumentalMarker(value: string): boolean {
  return value === "[Instrumental]";
}

// ---------------------------------------------------------------------------
// Helper: create a markup data object
// ---------------------------------------------------------------------------

function createMarkup(
  typ: MarkupTyp,
  wert: string,
  ziel: "STROPHE" | "ZEILE",
): ExportMarkupData {
  return {
    typ,
    ziel,
    wert,
    timecodeMs: null,
    wortIndex: null,
  };
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

/**
 * Parst eine ChordPro-Datei zurück in SongExportData.
 *
 * Garantiert Round-Trip: parse(format(song)) ≅ song
 *
 * @param content - Der ChordPro-Textinhalt
 * @returns SongExportData mit geparsten Strophen, Zeilen und Markups
 */
export function parseChordPro(content: string): SongExportData {
  if (!content || content.trim() === "") {
    return { titel: "", kuenstler: null, strophen: [] };
  }

  const lines = content.split("\n");

  let titel = "";
  let kuenstler: string | null = null;
  const strophen: ExportStropheData[] = [];

  // Current section state
  let currentStrophe: ExportStropheData | null = null;
  let stropheIndex = 0;
  let zeileIndex = 0;

  // Whether we've seen any zeile (text or comment) in the current section
  let hasSeenZeileInSection = false;

  // Pending vocal tags that haven't been attached yet
  let pendingVocalTags: ExportMarkupData[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines
    if (trimmed === "") continue;

    const directive = parseDirective(trimmed);

    if (directive) {
      switch (directive.name) {
        case "title":
          titel = directive.value ?? "";
          break;

        case "artist":
          kuenstler = directive.value ?? null;
          break;

        case "start_of_verse":
        case "start_of_chorus":
        case "start_of_bridge":
        case "start_of_tab": {
          const { name, istInstrumental } = mapSectionToStrophe(
            directive.name,
            directive.value,
          );
          currentStrophe = {
            name,
            orderIndex: stropheIndex++,
            analyse: null,
            istInstrumental,
            zeilen: [],
            markups: [],
          };
          zeileIndex = 0;
          hasSeenZeileInSection = false;
          pendingVocalTags = [];
          break;
        }

        case "end_of_verse":
        case "end_of_chorus":
        case "end_of_bridge":
        case "end_of_tab": {
          if (currentStrophe) {
            // Any remaining pending vocal tags go to strophe level
            if (pendingVocalTags.length > 0) {
              for (const m of pendingVocalTags) {
                m.ziel = "STROPHE";
              }
              currentStrophe.markups.push(...pendingVocalTags);
              pendingVocalTags = [];
            }
            strophen.push(currentStrophe);
            currentStrophe = null;
          }
          break;
        }

        case "comment": {
          if (!currentStrophe || directive.value == null) break;

          const commentValue = directive.value;

          // 1. Check for instrumental marker — skip it
          if (isInstrumentalMarker(commentValue)) {
            break;
          }

          // 2. Check for translation → attach to last zeile
          const translation = parseTranslationComment(commentValue);
          if (translation !== null) {
            const lastZeile =
              currentStrophe.zeilen[currentStrophe.zeilen.length - 1];
            if (lastZeile) {
              lastZeile.uebersetzung = translation;
            }
            break;
          }

          // 3. Check for vocal tag → accumulate as pending
          const vocalTag = parseVocalTagComment(commentValue);
          if (vocalTag) {
            pendingVocalTags.push(
              createMarkup(vocalTag.typ, vocalTag.wert, "STROPHE"),
            );
            break;
          }

          // 4. Regular comment → becomes a comment zeile
          // Flush pending vocal tags: if no zeile seen yet, they're strophe-level
          if (!hasSeenZeileInSection && pendingVocalTags.length > 0) {
            for (const m of pendingVocalTags) {
              m.ziel = "STROPHE";
            }
            currentStrophe.markups.push(...pendingVocalTags);
            pendingVocalTags = [];
          }

          const commentZeile: ExportZeileData = {
            text: unescapeChordProText(commentValue),
            uebersetzung: null,
            orderIndex: zeileIndex++,
            istKommentar: true,
            markups: [],
          };

          // Attach remaining pending vocal tags to this zeile
          if (pendingVocalTags.length > 0) {
            for (const m of pendingVocalTags) {
              m.ziel = "ZEILE";
            }
            commentZeile.markups = [...pendingVocalTags];
            pendingVocalTags = [];
          }

          currentStrophe.zeilen.push(commentZeile);
          hasSeenZeileInSection = true;
          break;
        }

        default:
          // Unknown directive — ignore
          break;
      }
    } else if (currentStrophe) {
      // Regular text line inside a section
      // Flush pending vocal tags: if no zeile seen yet, they're strophe-level
      if (!hasSeenZeileInSection && pendingVocalTags.length > 0) {
        for (const m of pendingVocalTags) {
          m.ziel = "STROPHE";
        }
        currentStrophe.markups.push(...pendingVocalTags);
        pendingVocalTags = [];
      }

      const zeile: ExportZeileData = {
        text: unescapeChordProText(trimmed),
        uebersetzung: null,
        orderIndex: zeileIndex++,
        istKommentar: false,
        markups: [],
      };

      // Attach remaining pending vocal tags to this zeile
      if (pendingVocalTags.length > 0) {
        for (const m of pendingVocalTags) {
          m.ziel = "ZEILE";
        }
        zeile.markups = [...pendingVocalTags];
        pendingVocalTags = [];
      }

      currentStrophe.zeilen.push(zeile);
      hasSeenZeileInSection = true;
    }
  }

  // Handle unclosed section
  if (currentStrophe) {
    if (pendingVocalTags.length > 0) {
      for (const m of pendingVocalTags) {
        m.ziel = "STROPHE";
      }
      currentStrophe.markups.push(...pendingVocalTags);
    }
    strophen.push(currentStrophe);
  }

  return { titel, kuenstler, strophen };
}
