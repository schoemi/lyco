import type { StropheDetail } from "@/types/song";
import type { Uebungsbereich } from "@/types/phrase-trainer";
import { hatTimecode } from "@/lib/phrase-trainer/utils";

/**
 * Extrahiert den Strophen-Timecode (in ms) aus den Markups einer Strophe.
 * Gibt den timecodeMs-Wert des ersten Markups mit typ === 'TIMECODE'
 * und ziel === 'STROPHE' zurück, oder null falls keiner vorhanden.
 */
function extrahiereTimecodeMs(strophe: StropheDetail): number | null {
  const markup = strophe.markups.find(
    (m) => m.typ === "TIMECODE" && m.ziel === "STROPHE" && m.timecodeMs != null,
  );
  return markup?.timecodeMs ?? null;
}

/**
 * Berechnet den Übungsbereich (Start- und End-Timecode) basierend auf
 * den ausgewählten Strophen.
 *
 * Logik:
 * 1. Alle Strophen nach orderIndex sortieren
 * 2. startMs = Timecode der ersten ausgewählten Strophe
 * 3. endMs = Timecode der nächsten Strophe nach der letzten ausgewählten
 * 4. Falls die letzte ausgewählte Strophe die letzte im Song ist:
 *    endMs = instrumentalDauerMs
 * 5. Nicht-zusammenhängende Auswahlen werden als ein durchgehender Bereich
 *    behandelt (vom ersten bis zum letzten ausgewählten)
 */
export function berechneUebungsbereich(
  strophen: StropheDetail[],
  ausgewaehlteIds: Set<string>,
  instrumentalDauerMs: number,
): Uebungsbereich {
  // 1. Alle Strophen nach orderIndex sortieren
  const sortiert = [...strophen].sort((a, b) => a.orderIndex - b.orderIndex);

  // Finde die Indizes der ausgewählten Strophen in der sortierten Liste
  const ausgewaehlteIndizes: number[] = [];
  for (let i = 0; i < sortiert.length; i++) {
    if (ausgewaehlteIds.has(sortiert[i].id)) {
      ausgewaehlteIndizes.push(i);
    }
  }

  if (ausgewaehlteIndizes.length === 0) {
    return { startMs: 0, endMs: 0 };
  }

  const ersterIndex = ausgewaehlteIndizes[0];
  const letzterIndex = ausgewaehlteIndizes[ausgewaehlteIndizes.length - 1];

  const ersteStrophe = sortiert[ersterIndex];
  const letzteStrophe = sortiert[letzterIndex];

  // 2. startMs = Timecode der ersten ausgewählten Strophe
  const startMs = extrahiereTimecodeMs(ersteStrophe) ?? 0;

  // 3. endMs = Timecode der nächsten Strophe nach der letzten ausgewählten
  // 4. Falls letzte Strophe im Song: endMs = instrumentalDauerMs
  let endMs: number;
  const naechsterIndex = letzterIndex + 1;

  if (naechsterIndex < sortiert.length) {
    // Es gibt eine nächste Strophe — verwende deren Timecode
    const naechsteStrophe = sortiert[naechsterIndex];
    const naechsterTimecode = extrahiereTimecodeMs(naechsteStrophe);
    endMs = naechsterTimecode ?? instrumentalDauerMs;
  } else {
    // Letzte Strophe im Song — verwende Instrumental-Dauer
    endMs = instrumentalDauerMs;
  }

  return { startMs, endMs };
}
