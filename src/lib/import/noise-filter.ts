/**
 * Noise filter for lyrics imported from websites like Genius, AZLyrics, etc.
 * Detects and filters common non-lyric lines while preserving [Section] markers.
 */

const NOISE_PATTERNS: RegExp[] = [
  /^you might also like$/i,
  /^\d+\s*(embed|contributors?)$/i,
  /^see .+ live$/i,
  /^get tickets as low as/i,
];

/**
 * Checks whether a line is a noise line that should be filtered out during import.
 * [Section] markers (e.g. [Chorus], [Verse 1]) are never considered noise.
 */
export function isNoiseLine(line: string): boolean {
  const trimmed = line.trim();

  // Empty lines are not noise (they serve as stanza separators)
  if (trimmed === "") return false;

  // [Section] markers must NEVER be filtered as noise
  if (/^\[.*\]$/.test(trimmed)) return false;

  return NOISE_PATTERNS.some((pattern) => pattern.test(trimmed));
}
