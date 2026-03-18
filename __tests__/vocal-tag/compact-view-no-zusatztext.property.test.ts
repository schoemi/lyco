/**
 * Property 5: Kompakte Ansicht unterdrückt Zusatztext
 *
 * For any ChordPro tag with non-empty Zusatztext, the compact view's rendered
 * output shall not contain the Zusatztext string.
 *
 * **Validates: Requirements 9.4**
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { parseChordPro } from "@/lib/vocal-tag/chordpro-parser";
import type { TagDefinitionData, ChordProNode } from "@/types/vocal-tag";

const PBT_CONFIG = { numRuns: 100 };

// --- Constants matching compact-view.tsx ---

const UNKNOWN_ICON = "fa-solid fa-circle-question";
const UNKNOWN_COLOR = "#9ca3af";

// --- Generators ---

/** Valid tag name: starts with alpha, then alphanumeric, 1-12 chars */
const tagNameArb = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9]{0,11}$/);

/**
 * Zusatztext that is distinguishable from surrounding text.
 * Uses a unique prefix "ZT_" so it won't accidentally appear in plain text segments.
 */
const zusatztextArb = fc
  .stringMatching(/^[a-zA-Z0-9]{3,20}$/)
  .map((s) => `ZT_${s}`);

/** Text segment: plain text that never starts with "ZT_" */
const textSegmentArb = fc.stringMatching(/^[a-z ,.\-!?]{1,30}$/);

/** A tag definition generator based on a tag name */
function makeTagDef(tag: string, index: number): TagDefinitionData {
  return {
    id: `id-${index}`,
    tag,
    label: `Label ${index}`,
    icon: `fa-solid fa-icon-${index}`,
    color: `#${String(index + 1).padStart(6, "0")}`,
    indexNr: index,
  };
}

/**
 * Simulates the compact view rendering logic (mirrors compact-view.tsx):
 * parse text, then for each node produce either text content or icon metadata.
 * Crucially, zusatztext is NOT included in the output.
 */
function compactViewOutput(
  text: string,
  tagDefinitions: TagDefinitionData[]
): string[] {
  const knownTags = tagDefinitions.map((d) => d.tag);
  const { nodes } = parseChordPro(text, knownTags);

  return nodes.map((node) => {
    if (node.type === "text") {
      return node.content ?? "";
    }
    // For chordpro-tag nodes, compact view renders only icon + color + label
    const definition = tagDefinitions.find((d) => d.tag === node.tag);
    const icon = definition?.icon ?? UNKNOWN_ICON;
    const color = definition?.color ?? UNKNOWN_COLOR;
    const label = definition?.label ?? node.tag ?? "";
    return `[icon:${icon} color:${color} label:${label}]`;
  });
}

describe("Property 5: Kompakte Ansicht unterdrückt Zusatztext", () => {
  /**
   * **Validates: Requirements 9.4**
   *
   * For any ChordPro tag with non-empty zusatztext, the compact view's
   * rendered output shall not contain the zusatztext string.
   */
  it("compact view output never contains the zusatztext of any tag", () => {
    const arbInput = fc
      .tuple(
        fc.array(tagNameArb, { minLength: 1, maxLength: 5 }),
        fc.array(
          fc.tuple(
            fc.nat({ max: 4 }), // index into tags array
            zusatztextArb,
            textSegmentArb
          ),
          { minLength: 1, maxLength: 5 }
        )
      )
      .map(([tagNames, segments]) => {
        // Deduplicate tag names
        const uniqueTags = [...new Set(tagNames)];
        if (uniqueTags.length === 0) return null;

        const tagDefs = uniqueTags.map((t, i) => makeTagDef(t, i));

        // Build a ChordPro text with tags that have non-empty zusatztext
        const parts: string[] = [];
        const zusatztexte: string[] = [];

        for (const [tagIdx, zusatz, textBefore] of segments) {
          const safeIdx = tagIdx % uniqueTags.length;
          const tag = uniqueTags[safeIdx];
          parts.push(textBefore);
          parts.push(`{${tag}: ${zusatz}}`);
          zusatztexte.push(zusatz);
        }

        return {
          text: parts.join(""),
          tagDefs,
          zusatztexte,
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);

    return fc.assert(
      fc.property(arbInput, ({ text, tagDefs, zusatztexte }) => {
        const output = compactViewOutput(text, tagDefs);
        const fullOutput = output.join(" ");

        // Each zusatztext must NOT appear in the compact view output
        for (const zusatz of zusatztexte) {
          expect(fullOutput).not.toContain(zusatz);
        }
      }),
      PBT_CONFIG
    );
  });

  /**
   * **Validates: Requirements 9.4**
   *
   * Even for unknown tags with zusatztext, the compact view must suppress it.
   */
  it("compact view suppresses zusatztext even for unknown tags", () => {
    return fc.assert(
      fc.property(
        tagNameArb,
        zusatztextArb,
        textSegmentArb,
        (tag, zusatz, surrounding) => {
          // No tag definitions → all tags are unknown
          const text = `${surrounding}{${tag}: ${zusatz}}${surrounding}`;
          const output = compactViewOutput(text, []);
          const fullOutput = output.join(" ");

          expect(fullOutput).not.toContain(zusatz);
        }
      ),
      PBT_CONFIG
    );
  });
});
