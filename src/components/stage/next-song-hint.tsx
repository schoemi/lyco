"use client";

/**
 * NextSongHint-Komponente
 *
 * Zeigt den Titel des nächsten Songs am unteren Bildschirmrand an,
 * wenn `visible === true`. Bei `nextSongTitle === null` wird "Ende der Setlist" angezeigt.
 *
 * Anforderungen: 11.1, 11.2, 11.3
 */

export interface NextSongHintProps {
  nextSongTitle: string | null; // null = letzter Song → "Ende der Setlist"
  visible: boolean;
}

/**
 * Berechnet, ob der Nächster-Song-Hinweis angezeigt werden soll.
 *
 * @param activeLineIndex - Index der aktuell aktiven Zeile (0-basiert)
 * @param totalLines - Gesamtanzahl der Zeilen im Song
 * @param isLastSong - Ob der aktuelle Song der letzte in der Setlist ist
 * @returns true wenn der Hinweis sichtbar sein soll
 */
export function shouldShowNextSongHint(
  activeLineIndex: number,
  totalLines: number,
  isLastSong: boolean,
): boolean {
  if (isLastSong) return false; // kein Hinweis für letzten Song (zeigt "Ende der Setlist" stattdessen)
  return activeLineIndex >= totalLines - 3;
}

export function NextSongHint({ nextSongTitle, visible }: NextSongHintProps) {
  if (!visible) return null;

  const label = nextSongTitle === null ? "Ende der Setlist" : nextSongTitle;

  return (
    <div
      className="fixed bottom-6 left-0 right-0 flex justify-center pointer-events-none"
      aria-live="polite"
      aria-label={`Nächster Song: ${label}`}
    >
      <span className="text-white/40 text-sm tracking-wide">
        {nextSongTitle === null ? "Ende der Setlist" : `Weiter: ${nextSongTitle}`}
      </span>
    </div>
  );
}
