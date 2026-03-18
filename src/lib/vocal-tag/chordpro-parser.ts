import type {
  ChordProParseResult,
  ChordProNode,
  ChordProParseError,
} from "@/types/vocal-tag";

/**
 * Parses a ChordPro raw text string into a structured result of nodes, warnings, and errors.
 *
 * Pattern: `{tag: zusatztext}` or `{tag:}` for empty zusatztext.
 * Regex: \{([a-zA-Z][a-zA-Z0-9]*):([^}]*)\}
 *
 * - Known tags are parsed normally.
 * - Unknown tags (not in knownTags) are parsed with `unknown: true` and a warning.
 * - Unclosed `{` without matching `}` produce a ChordProParseError with position info.
 * - Tags without zusatztext (`{tag:}`) are parsed with `zusatztext: ''`.
 */
export function parseChordPro(
  rawText: string,
  knownTags: string[]
): ChordProParseResult {
  const nodes: ChordProNode[] = [];
  const warnings: string[] = [];
  const errors: ChordProParseError[] = [];

  const knownSet = new Set(knownTags);
  const tagPattern = /\{([a-zA-Z][a-zA-Z0-9]*):([^}]*)\}/g;

  let lastIndex = 0;

  // First pass: find all valid tag matches
  const matches: Array<{ match: RegExpExecArray; start: number; end: number }> =
    [];
  let m: RegExpExecArray | null;

  while ((m = tagPattern.exec(rawText)) !== null) {
    matches.push({
      match: m,
      start: m.index,
      end: m.index + m[0].length,
    });
  }

  // Second pass: detect unclosed braces (a `{` that is not part of any valid match)
  for (let i = 0; i < rawText.length; i++) {
    if (rawText[i] === "{") {
      const isPartOfMatch = matches.some(
        (entry) => i >= entry.start && i < entry.end
      );
      if (!isPartOfMatch) {
        // This is an unclosed or invalid brace
        const line = computeLine(rawText, i);
        errors.push({
          message: `Ungültige oder nicht geschlossene Klammer bei Position ${i}`,
          position: i,
          line,
        });
      }
    }
  }

  // Third pass: build nodes from matches and text segments
  for (const entry of matches) {
    const { match, start, end } = entry;

    // Add preceding text node if any
    if (start > lastIndex) {
      const textContent = rawText.slice(lastIndex, start);
      if (textContent.length > 0) {
        nodes.push({ type: "text", content: textContent });
      }
    }

    const tag = match[1];
    const zusatztext = match[2].trim();
    const isUnknown = !knownSet.has(tag);

    const node: ChordProNode = {
      type: "chordpro-tag",
      tag,
      zusatztext,
    };

    if (isUnknown) {
      node.unknown = true;
      warnings.push(`Unbekannter Tag: "${tag}"`);
    }

    nodes.push(node);
    lastIndex = end;
  }

  // Add trailing text node if any
  if (lastIndex < rawText.length) {
    const textContent = rawText.slice(lastIndex);
    if (textContent.length > 0) {
      nodes.push({ type: "text", content: textContent });
    }
  }

  return { nodes, warnings, errors };
}

/** Compute 1-based line number for a given position in the text. */
function computeLine(text: string, position: number): number {
  let line = 1;
  for (let i = 0; i < position && i < text.length; i++) {
    if (text[i] === "\n") {
      line++;
    }
  }
  return line;
}

/**
 * Strips all ChordPro tags from raw text, returning only the plain text content.
 * `{tag: zusatztext}` → removed entirely, leaving surrounding text intact.
 */
export function stripChordPro(rawText: string): string {
  return rawText.replace(/\{[a-zA-Z][a-zA-Z0-9]*:[^}]*\}/g, "").trim();
}
