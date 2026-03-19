import type { ChordProNode } from "@/types/vocal-tag";

/**
 * Serializes an array of ChordProNodes back into ChordPro raw text.
 *
 * - Text nodes are output directly via their `content`.
 * - Inline tag nodes are serialized as `{tag: zusatztext}` or `{tag:}`.
 * - Range tag nodes are serialized as `{tag: zusatztext}rangeText{/tag}`.
 */
export function serializeChordPro(nodes: ChordProNode[]): string {
  return nodes
    .map((node) => {
      if (node.type === "text") {
        return node.content ?? "";
      }

      const tag = node.tag ?? "";
      const zusatztext = node.zusatztext ?? "";

      // Range tag: {tag: zusatztext}rangeText{/tag}
      if (node.type === "chordpro-range") {
        const rangeText = node.rangeText ?? "";
        const opening = zusatztext === "" ? `{${tag}:}` : `{${tag}: ${zusatztext}}`;
        return `${opening}${rangeText}{/${tag}}`;
      }

      // Inline tag
      if (zusatztext === "") {
        return `{${tag}:}`;
      }

      return `{${tag}: ${zusatztext}}`;
    })
    .join("");
}
