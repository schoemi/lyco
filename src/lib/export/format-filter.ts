/**
 * Format-Filter für Song-Export
 *
 * Wendet Export-Optionen auf Song-Daten an und entfernt
 * Vocal-Tags, instrumentale Strophen und Kommentare
 * basierend auf den gewählten Optionen.
 *
 * Reine Funktion ohne Seiteneffekte.
 */

import type { ExportOptions, SongExportData, ExportMarkupData } from "./export-types";
import { VOCAL_TAG_TYPES } from "./export-types";

/**
 * Prüft, ob ein Markup ein Vocal-Tag ist.
 */
function isVocalTag(markup: ExportMarkupData): boolean {
  return (VOCAL_TAG_TYPES as string[]).includes(markup.typ);
}

/**
 * Filtert Vocal-Tag-Markups aus einem Markup-Array.
 * Behält alle Nicht-Vocal-Markups (z.B. TIMECODE) bei.
 */
function filterVocalTagMarkups(markups: ExportMarkupData[]): ExportMarkupData[] {
  return markups.filter((m) => !isVocalTag(m));
}

/**
 * Wendet Export-Optionen auf Song-Daten an.
 *
 * - `vocalTags=false`: Entfernt alle Markups mit Typ ∈ VOCAL_TAG_TYPES
 *   aus Strophen und Zeilen. TIMECODE-Markups bleiben erhalten.
 * - `instrumental=false`: Entfernt alle Strophen mit `istInstrumental=true`.
 * - `kommentare=false`: Entfernt alle Zeilen mit `istKommentar=true`
 *   und setzt `analyse` auf `null` bei allen Strophen.
 *
 * Nicht-betroffene Daten werden niemals entfernt.
 *
 * @param song - Die Song-Export-Daten
 * @param options - Die Export-Optionen
 * @returns Eine neue SongExportData-Instanz mit angewandten Filtern
 */
export function applyExportOptions(
  song: SongExportData,
  options: ExportOptions,
): SongExportData {
  let strophen = song.strophen;

  // instrumental=false: Alle Strophen mit istInstrumental=true entfernen
  if (!options.instrumental) {
    strophen = strophen.filter((s) => !s.istInstrumental);
  }

  // Strophen transformieren für vocalTags und kommentare Optionen
  strophen = strophen.map((strophe) => {
    let zeilen = strophe.zeilen;
    let stropheMarkups = strophe.markups;
    let analyse = strophe.analyse;

    // kommentare=false: Kommentar-Zeilen entfernen und analyse auf null setzen
    if (!options.kommentare) {
      zeilen = zeilen.filter((z) => !z.istKommentar);
      analyse = null;
    }

    // vocalTags=false: Vocal-Tag-Markups aus Strophe und Zeilen entfernen
    if (!options.vocalTags) {
      stropheMarkups = filterVocalTagMarkups(stropheMarkups);
      zeilen = zeilen.map((zeile) => ({
        ...zeile,
        markups: filterVocalTagMarkups(zeile.markups),
      }));
    }

    return {
      ...strophe,
      zeilen,
      markups: stropheMarkups,
      analyse,
    };
  });

  return {
    ...song,
    strophen,
  };
}
