import { StropheDetail } from '@/types/song';
import { taktZuMs, taktEndZuMs } from './takt-konverter';

/** Typ eines Annotationsbalkens */
export type AnnotationsTyp = 'instrumental' | 'kommentar';

/** Ein renderbarer Annotationsbalken */
export interface AnnotationsBalken {
  startMs: number;
  endMs: number;
  text: string;
  typ: AnnotationsTyp;
  /** Optional: Start-Takt (für Barrierefreiheit / title-Attribut) */
  startTakt?: number;
  /** Optional: End-Takt (für Barrierefreiheit / title-Attribut) */
  endTakt?: number;
}

/**
 * Erzeugt AnnotationsBalken aus Strophen- und Zeilen-Daten.
 *
 * Logik:
 * 1. Instrumental-Strophen mit Taktbereich → Balken via taktZuMs/taktEndZuMs
 * 2. Instrumental-Strophen ohne Taktbereich, mit Timecode-Markup → Fallback
 * 3. Kommentar-Zeilen mit Taktbereich → Balken via taktZuMs/taktEndZuMs
 * 4. Kommentar-Zeilen ohne Taktbereich → übersprungen
 * 5. Ergebnis sortiert nach startMs
 *
 * @param strophen - Alle Strophen des Songs (mit Zeilen und Markups)
 * @param beatPositionenMs - Beat-Zeitpunkte in ms
 * @param taktZaehler - Beats pro Takt
 * @returns Array von AnnotationsBalken, sortiert nach startMs
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8
 */
export function erzeugeAnnotationsBalken(
  strophen: StropheDetail[],
  beatPositionenMs: number[],
  taktZaehler: number,
): AnnotationsBalken[] {
  const balken: AnnotationsBalken[] = [];

  // Strophen nach orderIndex sortieren für Timecode-Fallback-Logik
  const sortiertNachOrder = [...strophen].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );

  for (const strophe of sortiertNachOrder) {
    if (strophe.istInstrumental) {
      if (strophe.startTakt !== null) {
        // Fall 1: Instrumental mit Taktbereich
        const startMs = taktZuMs(strophe.startTakt, beatPositionenMs, taktZaehler);
        const endTakt = strophe.endTakt ?? strophe.startTakt;
        const endMs = taktEndZuMs(endTakt, beatPositionenMs, taktZaehler);

        if (startMs !== null && endMs !== null) {
          balken.push({
            startMs,
            endMs,
            text: strophe.name,
            typ: 'instrumental',
            startTakt: strophe.startTakt,
            endTakt,
          });
        }
      } else {
        // Fall 2: Instrumental ohne Taktbereich — Timecode-Fallback
        const timecodeMarkup = strophe.markups.find(
          (m) => m.typ === 'TIMECODE' && m.ziel === 'STROPHE' && m.timecodeMs !== null,
        );

        if (timecodeMarkup && timecodeMarkup.timecodeMs !== null) {
          const startMs = timecodeMarkup.timecodeMs;

          // Ende: Timecode der nächsten Strophe (nach orderIndex) oder letzter Beat
          const naechsteStropheTimecodeMs = findeNaechstenStropheTimecode(
            strophe.orderIndex,
            sortiertNachOrder,
          );

          const endMs =
            naechsteStropheTimecodeMs ??
            (beatPositionenMs.length > 0
              ? beatPositionenMs[beatPositionenMs.length - 1]
              : null);

          if (endMs !== null) {
            balken.push({
              startMs,
              endMs,
              text: strophe.name,
              typ: 'instrumental',
            });
          }
        }
        // Fall: kein Taktbereich und kein Timecode → übersprungen (Req 5.6)
      }
    }

    // Fall 3 & 4: Kommentar-Zeilen
    for (const zeile of strophe.zeilen) {
      if (zeile.istKommentar && zeile.startTakt !== null) {
        const startMs = taktZuMs(zeile.startTakt, beatPositionenMs, taktZaehler);
        const endTakt = zeile.endTakt ?? zeile.startTakt;
        const endMs = taktEndZuMs(endTakt, beatPositionenMs, taktZaehler);

        if (startMs !== null && endMs !== null) {
          balken.push({
            startMs,
            endMs,
            text: zeile.text,
            typ: 'kommentar',
            startTakt: zeile.startTakt,
            endTakt,
          });
        }
      }
      // Kommentar ohne Taktbereich → übersprungen (Req 5.7)
    }
  }

  // Sortierung nach startMs (Req 5.8 implizit, Design-Vorgabe)
  balken.sort((a, b) => a.startMs - b.startMs);

  return balken;
}

/**
 * Findet den Timecode-Markup der nächsten Strophe (nach orderIndex).
 * Gibt null zurück, wenn keine nächste Strophe mit Timecode existiert.
 */
function findeNaechstenStropheTimecode(
  aktuellerOrderIndex: number,
  sortiertNachOrder: StropheDetail[],
): number | null {
  for (const strophe of sortiertNachOrder) {
    if (strophe.orderIndex > aktuellerOrderIndex) {
      const timecode = strophe.markups.find(
        (m) => m.typ === 'TIMECODE' && m.ziel === 'STROPHE' && m.timecodeMs !== null,
      );
      if (timecode && timecode.timecodeMs !== null) {
        return timecode.timecodeMs;
      }
    }
  }
  return null;
}
