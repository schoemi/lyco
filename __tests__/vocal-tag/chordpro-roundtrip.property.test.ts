/**
 * Property 3: Parse-Serialize Round-Trip
 *
 * For any valid ChordPro raw text, `parse(serialize(parse(text)))` shall produce
 * a result equivalent to `parse(text)`. This ensures the parser and serializer
 * are consistent inverses.
 *
 * **Validates: Requirements 4.5**
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { parseChordPro } from "@/lib/vocal-tag/chordpro-parser";
import { serializeChordPro } from "@/lib/vocal-tag/chordpro-serializer";

const PBT_CONFIG = { numRuns: 100 };

// --- Generators ---

/** Valid tag name: starts with alpha, then alphanumeric, 1-12 chars */
const tagNameArb = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9]{0,11}$/);

/** Zusatztext: non-empty string without `{` or `}` (word chars, spaces, umlauts) */
const zusatztextArb = fc.stringMatching(/^[a-zA-ZäöüÄÖÜß0-9 ]{1,30}$/);

/** Text segment: non-empty string without `{` or `}` */
const textSegmentArb = fc.stringMatching(/^[a-zA-ZäöüÄÖÜß0-9 ,.\-!?]{1,40}$/);

/** A ChordPro tag with zusatztext: `{tag: zusatztext}` */
const chordproTagWithZusatzArb = fc
  .tuple(tagNameArb, zusatztextArb)
  .map(([tag, zusatz]) => `{${tag}: ${zusatz}}`);

/** A ChordPro tag with empty zusatztext: `{tag:}` */
const chordproTagEmptyArb = tagNameArb.map((tag) => `{${tag}:}`);

/** A single ChordPro tag (with or without zusatztext) */
const chordproTagArb = fc.oneof(chordproTagWithZusatzArb, chordproTagEmptyArb);

/** A segment is either plain text or a ChordPro tag */
const segmentArb = fc.oneof(textSegmentArb, chordproTagArb);

/** A valid ChordPro text: concatenation of 1-6 segments */
const validChordProTextArb = fc
  .array(segmentArb, { minLength: 1, maxLength: 6 })
  .map((segments) => segments.join(""));

/**
 * Strip the `unknown` field from nodes for comparison,
 * since round-tripping doesn't preserve unknown status
 * (it depends on the knownTags list, not the text itself).
 */
function normalizeNodes(
  nodes: Array<{
    type: string;
    content?: string;
    tag?: string;
    zusatztext?: string;
    unknown?: boolean;
  }>
) {
  return nodes.map((node) => {
    if (node.type === "text") {
      return { type: node.type, content: node.content };
    }
    return { type: node.type, tag: node.tag, zusatztext: node.zusatztext };
  });
}

describe("Property 3: Parse-Serialize Round-Trip", () => {
  /**
   * **Validates: Requirements 4.5**
   *
   * For any valid ChordPro raw text:
   * parse(serialize(parse(text))) produces equivalent result to parse(text)
   */
  it("parse(serialize(parse(text))) ≡ parse(text) for valid ChordPro texts", () => {
    return fc.assert(
      fc.property(validChordProTextArb, (text) => {
        // All tags in the generated text are treated as known
        // Extract tag names from the text to build knownTags
        const tagPattern = /\{([a-zA-Z][a-zA-Z0-9]*):[^}]*\}/g;
        const knownTags: string[] = [];
        let match: RegExpExecArray | null;
        while ((match = tagPattern.exec(text)) !== null) {
          if (!knownTags.includes(match[1])) {
            knownTags.push(match[1]);
          }
        }

        // First parse
        const firstParse = parseChordPro(text, knownTags);

        // The generated text should be valid (no errors)
        expect(firstParse.errors).toHaveLength(0);

        // Serialize back
        const serialized = serializeChordPro(firstParse.nodes);

        // Parse again
        const secondParse = parseChordPro(serialized, knownTags);

        // Second parse should also be error-free
        expect(secondParse.errors).toHaveLength(0);

        // The nodes from both parses should be equivalent
        const firstNormalized = normalizeNodes(firstParse.nodes);
        const secondNormalized = normalizeNodes(secondParse.nodes);

        expect(secondNormalized).toEqual(firstNormalized);
      }),
      PBT_CONFIG
    );
  });
});
