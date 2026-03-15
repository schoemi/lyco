import type { ParsedSong, ParsedStrophe } from "@/types/import";
import { isNoiseLine } from "./noise-filter";

const SECTION_MARKER = /^\[(.+)\]$/;

/**
 * Parses raw songtext (e.g. pasted from Genius) into structured strophes.
 *
 * Supports three modes:
 * 1. [Section Name] markers → strophes named by marker
 * 2. Blank-line separation without markers → auto-named "Verse 1", "Verse 2", …
 * 3. No markers and no blank-line separation → single strophe named "Verse"
 */
export function parseSongtext(text: string): ParsedSong {
  const lines = text.split("\n").map((l) => l.trim());

  // Filter noise lines, keeping empty lines and section markers intact
  const filtered = lines.filter(
    (line) => !isNoiseLine(line)
  );

  const hasMarkers = filtered.some((line) => SECTION_MARKER.test(line));

  if (hasMarkers) {
    return parseWithMarkers(filtered);
  }

  // Check if there are blank-line separations among content lines
  const hasBlankSeparation = hasBlankLineSeparation(filtered);

  if (hasBlankSeparation) {
    return parseByBlankLines(filtered);
  }

  return parseSingleStrophe(filtered);
}

/**
 * Parse text that contains [Section Name] markers.
 */
function parseWithMarkers(lines: string[]): ParsedSong {
  const strophen: ParsedStrophe[] = [];
  let current: ParsedStrophe | null = null;

  for (const line of lines) {
    const match = line.match(SECTION_MARKER);

    if (match) {
      // Close previous strophe if it has lines
      if (current && current.zeilen.length > 0) {
        strophen.push(current);
      }
      // Start new strophe (don't push yet — might be empty)
      current = { name: match[1], zeilen: [] };
      continue;
    }

    if (line === "") {
      // Empty line closes current strophe if it has content
      if (current && current.zeilen.length > 0) {
        strophen.push(current);
        current = null;
      }
      continue;
    }

    // Text line — add to current strophe or start an implicit one
    if (!current) {
      current = { name: "Verse", zeilen: [] };
    }
    current.zeilen.push(line);
  }

  // Don't forget the last strophe
  if (current && current.zeilen.length > 0) {
    strophen.push(current);
  }

  return { strophen };
}

/**
 * Parse text separated by blank lines (no section markers).
 * Auto-names strophes as "Verse 1", "Verse 2", etc.
 */
function parseByBlankLines(lines: string[]): ParsedSong {
  const strophen: ParsedStrophe[] = [];
  let currentLines: string[] = [];
  let verseCount = 0;

  for (const line of lines) {
    if (line === "") {
      if (currentLines.length > 0) {
        verseCount++;
        strophen.push({ name: `Verse ${verseCount}`, zeilen: currentLines });
        currentLines = [];
      }
      continue;
    }

    currentLines.push(line);
  }

  // Last group
  if (currentLines.length > 0) {
    verseCount++;
    strophen.push({ name: `Verse ${verseCount}`, zeilen: currentLines });
  }

  return { strophen };
}

/**
 * All content lines as a single strophe named "Verse".
 */
function parseSingleStrophe(lines: string[]): ParsedSong {
  const zeilen = lines.filter((l) => l !== "");

  if (zeilen.length === 0) {
    return { strophen: [] };
  }

  return { strophen: [{ name: "Verse", zeilen }] };
}

/**
 * Checks whether the filtered lines contain blank-line separation
 * between content lines (ignoring leading/trailing blanks).
 */
function hasBlankLineSeparation(lines: string[]): boolean {
  // Strip leading and trailing empty lines
  let start = 0;
  while (start < lines.length && lines[start] === "") start++;
  let end = lines.length - 1;
  while (end >= start && lines[end] === "") end--;

  const trimmed = lines.slice(start, end + 1);

  // Check if there's at least one blank line among the content
  let seenContent = false;
  for (const line of trimmed) {
    if (line !== "") {
      seenContent = true;
    } else if (seenContent) {
      return true;
    }
  }

  return false;
}
