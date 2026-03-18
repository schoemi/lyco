/**
 * Timecode-Utilities für das Format [mm:ss].
 *
 * - mm ∈ [0, 99]
 * - ss ∈ [0, 59]
 * - Intern werden Millisekunden gespeichert.
 */

const TIMECODE_REGEX = /^\[(\d{2}):(\d{2})\]$/;

/**
 * Flexible Regex: akzeptiert mit/ohne Klammern, ein-/zweistellige Zahlen.
 * Formate: [mm:ss], mm:ss, m:ss, :ss, ss (nur Sekunden)
 */
const FLEXIBLE_TIMECODE_REGEX = /^\[?(\d{1,2}):(\d{1,2})\]?$/;
const SECONDS_ONLY_REGEX = /^\[?(\d{1,3})\]?$/;

/**
 * Konvertiert "[mm:ss]" → Millisekunden.
 * Gibt null zurück bei ungültigem Format.
 */
export function parseTimecode(input: string): number | null {
  const trimmed = input.trim();

  // Try flexible mm:ss format (with or without brackets)
  const matchFlex = trimmed.match(FLEXIBLE_TIMECODE_REGEX);
  if (matchFlex) {
    const mm = parseInt(matchFlex[1], 10);
    const ss = parseInt(matchFlex[2], 10);
    if (mm < 0 || mm > 99 || ss < 0 || ss > 59) return null;
    return (mm * 60 + ss) * 1000;
  }

  // Try seconds-only format (e.g. "17" → 00:17)
  const matchSec = trimmed.match(SECONDS_ONLY_REGEX);
  if (matchSec) {
    const totalSec = parseInt(matchSec[1], 10);
    if (totalSec < 0 || totalSec > 5999) return null; // max 99:59
    const mm = Math.floor(totalSec / 60);
    const ss = totalSec % 60;
    if (mm > 99) return null;
    return (mm * 60 + ss) * 1000;
  }

  return null;
}

/**
 * Konvertiert Millisekunden → "[mm:ss]".
 * Rundet ms auf die nächste ganze Sekunde vor der Formatierung.
 */
export function formatTimecode(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;

  return `[${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}]`;
}

/**
 * Validiert ob ein String ein gültiger Timecode im Format [mm:ss] ist.
 * mm ∈ [0, 99], ss ∈ [0, 59]
 */
export function isValidTimecode(input: string): boolean {
  return parseTimecode(input) !== null;
}
