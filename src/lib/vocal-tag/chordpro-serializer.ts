import type { ChordProNode } from "@/types/vocal-tag";

/**
 * Serializes an array of ChordProNodes back into ChordPro raw text.
 *
 * - Text nodes are output directly via their `content`.
 * - ChordPro tag nodes are serialized as `{tag: zusatztext}`.
 * - Tags with empty zusatztext are serialized as `{tag:}`.
 */
export function serializeChordPro(nodes: ChordProNode[]): string {
  return nodes
    .map((node) => {
      if (node.type === "text") {
        return node.content ?? "";
      }

      // chordpro-tag node
      const tag = node.tag ?? "";
      const zusatztext = node.zusatztext ?? "";

      if (zusatztext === "") {
        return `{${tag}:}`;
      }

      return `{${tag}: ${zusatztext}}`;
    })
    .join("");
}
