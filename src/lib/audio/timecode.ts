/**
 * Timecode-Utilities für das Format [mm:ss].
 *
 * - mm ∈ [0, 99]
 * - ss ∈ [0, 59]
 * - Intern werden Millisekunden gespeichert.
 */

const TIMECODE_REGEX = /^\[(\d{2}):(\d{2})\]$/;

/**
 * Konvertiert "[mm:ss]" → Millisekunden.
 * Gibt null zurück bei ungültigem Format.
 */
export function parseTimecode(input: string): number | null {
  const match = input.match(TIMECODE_REGEX);
  if (!match) return null;

  const mm = parseInt(match[1], 10);
  const ss = parseInt(match[2], 10);

  if (mm < 0 || mm > 99 || ss < 0 || ss > 59) return null;

  return (mm * 60 + ss) * 1000;
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
