import type {
  ChordProParseResult,
  ChordProNode,
  ChordProParseError,
} from "@/types/vocal-tag";

/**
 * Parses a ChordPro raw text string into a structured result of nodes, warnings, and errors.
 *
 * Supports two tag forms:
 * 1. Inline tags: `{tag: zusatztext}` or `{tag:}` — point markers
 * 2. Range tags:  `{tag: zusatztext}rangeText{/tag}` — marks a text span
 *
 * Range tags are detected when an opening tag `{tag:...}` is followed by text
 * and then a matching closing tag `{/tag}`. If no closing tag is found, the
 * opening tag is treated as a regular inline tag.
 */
export function parseChordPro(
  rawText: string,
  knownTags: string[]
): ChordProParseResult {
  const nodes: ChordProNode[] = [];
  const warnings: string[] = [];
  const errors: ChordProParseError[] = [];

  const knownSet = new Set(knownTags);

  // Combined pattern: opening tags and closing tags
  // Group 1: opening tag name, Group 2: zusatztext
  // Group 3: closing tag name
  const tokenPattern = /\{([a-zA-Z][a-zA-Z0-9]*):([^}]*)\}|\{\/([a-zA-Z][a-zA-Z0-9]*)\}/g;

  let lastIndex = 0;

  // First pass: collect all tokens
  interface Token {
    type: "open" | "close";
    tag: string;
    zusatztext?: string;
    start: number;
    end: number;
  }
  const tokens: Token[] = [];
  let tm: RegExpExecArray | null;

  while ((tm = tokenPattern.exec(rawText)) !== null) {
    if (tm[1] !== undefined) {
      // Opening tag
      tokens.push({
        type: "open",
        tag: tm[1],
        zusatztext: tm[2].trim(),
        start: tm.index,
        end: tm.index + tm[0].length,
      });
    } else if (tm[3] !== undefined) {
      // Closing tag
      tokens.push({
        type: "close",
        tag: tm[3],
        start: tm.index,
        end: tm.index + tm[0].length,
      });
    }
  }

  // Detect unclosed braces that are not part of any token
  for (let i = 0; i < rawText.length; i++) {
    if (rawText[i] === "{") {
      const isPartOfToken = tokens.some(
        (t) => i >= t.start && i < t.end
      );
      if (!isPartOfToken) {
        const line = computeLine(rawText, i);
        errors.push({
          message: `Ungültige oder nicht geschlossene Klammer bei Position ${i}`,
          position: i,
          line,
        });
      }
    }
  }

  // Build nodes: pair opening tags with closing tags for ranges
  const consumed = new Set<number>(); // indices of tokens consumed as part of a range

  // Pre-scan: for each opening tag, check if a matching close follows
  const rangeMap = new Map<number, number>(); // openIdx → closeIdx
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type !== "open") continue;
    // Look for the next matching close tag
    for (let j = i + 1; j < tokens.length; j++) {
      if (consumed.has(j)) continue;
      const candidate = tokens[j];
      if (candidate.type === "close" && candidate.tag === t.tag) {
        // Check that the range text is between the open end and close start
        const rangeText = rawText.slice(t.end, candidate.start);
        // Only treat as range if there is actual text content (not empty)
        if (rangeText.length > 0) {
          rangeMap.set(i, j);
          consumed.add(i);
          consumed.add(j);
        }
        break;
      }
      // If we hit another open tag of the same type, stop looking
      if (candidate.type === "open" && candidate.tag === t.tag) break;
    }
  }

  // Build final node list
  let tokenIdx = 0;
  lastIndex = 0;

  while (tokenIdx < tokens.length) {
    const token = tokens[tokenIdx];

    // Add preceding text
    if (token.start > lastIndex) {
      const textContent = rawText.slice(lastIndex, token.start);
      if (textContent.length > 0) {
        nodes.push({ type: "text", content: textContent });
      }
    }

    if (token.type === "open" && rangeMap.has(tokenIdx)) {
      // Range tag
      const closeIdx = rangeMap.get(tokenIdx)!;
      const closeToken = tokens[closeIdx];
      const rangeText = rawText.slice(token.end, closeToken.start);
      const isUnknown = !knownSet.has(token.tag);

      const node: ChordProNode = {
        type: "chordpro-range",
        tag: token.tag,
        zusatztext: token.zusatztext ?? "",
        rangeText,
      };

      if (isUnknown) {
        node.unknown = true;
        warnings.push(`Unbekannter Tag: "${token.tag}"`);
      }

      nodes.push(node);
      lastIndex = closeToken.end;

      // Skip all tokens between open and close (they are inside the range text)
      tokenIdx = closeIdx + 1;
      continue;
    } else if (token.type === "open") {
      // Inline tag (no matching close)
      const isUnknown = !knownSet.has(token.tag);
      const node: ChordProNode = {
        type: "chordpro-tag",
        tag: token.tag,
        zusatztext: token.zusatztext ?? "",
      };

      if (isUnknown) {
        node.unknown = true;
        warnings.push(`Unbekannter Tag: "${token.tag}"`);
      }

      nodes.push(node);
      lastIndex = token.end;
    } else {
      // Orphan closing tag — treat as text
      lastIndex = token.end;
    }

    tokenIdx++;
  }

  // Add trailing text
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
 * Handles both inline tags and range tags (preserving range text).
 */
export function stripChordPro(rawText: string): string {
  // First remove closing tags, then opening tags
  return rawText
    .replace(/\{\/[a-zA-Z][a-zA-Z0-9]*\}/g, "")
    .replace(/\{[a-zA-Z][a-zA-Z0-9]*:[^}]*\}/g, "")
    .trim();
}
