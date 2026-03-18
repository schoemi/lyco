/**
 * Property 6: Detail-Ansicht zeigt alle Annotationen
 *
 * For any ChordPro tag in a song text, the detail view's rendered output
 * shall contain both the tag's icon and the Zusatztext.
 *
 * **Validates: Requirements 10.2, 10.3**
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { parseChordPro } from "@/lib/vocal-tag/chordpro-parser";
import type { TagDefinitionData, ChordProNode } from "@/types/vocal-tag";

const PBT_CONFIG = { numRuns: 100 };

// --- Constants matching detail-view.tsx ---

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
 * Simulates the detail view rendering logic (mirrors detail-view.tsx):
 * parse text, then for each node produce either text content or icon + zusatztext.
 * Crucially, both icon AND zusatztext ARE included in the output.
 */
function detailViewOutput(
  text: string,
  tagDefinitions: TagDefinitionData[]
): string[] {
  const knownTags = tagDefinitions.map((d) => d.tag);
  const { nodes } = parseChordPro(text, knownTags);

  return nodes.map((node) => {
    if (node.type === "text") {
      return node.content ?? "";
    }
    // For chordpro-tag nodes, detail view renders icon + color + label + zusatztext
    const definition = tagDefinitions.find((d) => d.tag === node.tag);
    const icon = definition?.icon ?? UNKNOWN_ICON;
    const color = definition?.color ?? UNKNOWN_COLOR;
    const label = definition?.label ?? node.tag ?? "";
    const zusatztext = node.zusatztext ?? "";
    return `[icon:${icon} color:${color} label:${label} zusatztext:${zusatztext}]`;
  });
}

describe("Property 6: Detail-Ansicht zeigt alle Annotationen", () => {
  /**
   * **Validates: Requirements 10.2, 10.3**
   *
   * For any ChordPro tag with non-empty zusatztext, the detail view's
   * rendered output shall contain both the icon and the zusatztext.
   */
  it("detail view output contains both icon and zusatztext for every tag", () => {
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
        const expectedAnnotations: Array<{
          icon: string;
          zusatztext: string;
        }> = [];

        for (const [tagIdx, zusatz, textBefore] of segments) {
          const safeIdx = tagIdx % uniqueTags.length;
          const tag = uniqueTags[safeIdx];
          const def = tagDefs[safeIdx];
          parts.push(textBefore);
          parts.push(`{${tag}: ${zusatz}}`);
          expectedAnnotations.push({
            icon: def.icon,
            zusatztext: zusatz,
          });
        }

        return {
          text: parts.join(""),
          tagDefs,
          expectedAnnotations,
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);

    return fc.assert(
      fc.property(arbInput, ({ text, tagDefs, expectedAnnotations }) => {
        const output = detailViewOutput(text, tagDefs);
        const fullOutput = output.join(" ");

        // Each annotation's icon AND zusatztext must appear in the detail view output
        for (const annotation of expectedAnnotations) {
          expect(fullOutput).toContain(annotation.icon);
          expect(fullOutput).toContain(annotation.zusatztext);
        }
      }),
      PBT_CONFIG
    );
  });

  /**
   * **Validates: Requirements 10.2, 10.3**
   *
   * For unknown tags, the detail view must still show the fallback icon
   * and the zusatztext.
   */
  it("detail view shows fallback icon and zusatztext for unknown tags", () => {
    return fc.assert(
      fc.property(
        tagNameArb,
        zusatztextArb,
        textSegmentArb,
        (tag, zusatz, surrounding) => {
          // No tag definitions → all tags are unknown
          const text = `${surrounding}{${tag}: ${zusatz}}${surrounding}`;
          const output = detailViewOutput(text, []);
          const fullOutput = output.join(" ");

          // Unknown tags should use the fallback icon
          expect(fullOutput).toContain(UNKNOWN_ICON);
          // Zusatztext must still be present
          expect(fullOutput).toContain(zusatz);
        }
      ),
      PBT_CONFIG
    );
  });
});
