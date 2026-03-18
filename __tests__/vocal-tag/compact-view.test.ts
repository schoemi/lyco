import { describe, it, expect } from "vitest";
import { parseChordPro } from "@/lib/vocal-tag/chordpro-parser";
import type { TagDefinitionData, ChordProNode } from "@/types/vocal-tag";

/**
 * Unit tests for CompactView component logic.
 *
 * Since the test environment is node (not jsdom), we test the core rendering
 * logic: parsing text, resolving tag definitions, and verifying that the
 * compact view produces the correct node structure (icons only, no zusatztext).
 *
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

function makeTags(count: number): TagDefinitionData[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `id-${i + 1}`,
    tag: `tag${i + 1}`,
    label: `Label ${i + 1}`,
    icon: `fa-solid fa-${i + 1}`,
    color: `#${String(i + 1).padStart(6, "0")}`,
    indexNr: i + 1,
  }));
}

const UNKNOWN_ICON = "fa-solid fa-circle-question";
const UNKNOWN_COLOR = "#9ca3af";

/**
 * Simulates the compact view rendering logic:
 * parse text, then for each node decide what to render.
 */
function compactViewNodes(
  text: string,
  tagDefinitions: TagDefinitionData[]
): Array<{ type: "text"; content: string } | { type: "icon"; icon: string; color: string; label: string }> {
  const knownTags = tagDefinitions.map((d) => d.tag);
  const { nodes } = parseChordPro(text, knownTags);

  return nodes.map((node) => {
    if (node.type === "text") {
      return { type: "text" as const, content: node.content ?? "" };
    }
    const definition = tagDefinitions.find((d) => d.tag === node.tag);
    return {
      type: "icon" as const,
      icon: definition?.icon ?? UNKNOWN_ICON,
      color: definition?.color ?? UNKNOWN_COLOR,
      label: definition?.label ?? node.tag ?? "",
    };
  });
}

describe("CompactView logic", () => {
  describe("text rendering without ChordPro syntax (Req 9.1)", () => {
    it("renders plain text without modification", () => {
      const tags = makeTags(2);
      const result = compactViewNodes("Hello world", tags);

      expect(result).toEqual([{ type: "text", content: "Hello world" }]);
    });

    it("strips ChordPro syntax from output", () => {
      const tags = makeTags(2);
      const text = "Sing {tag1: softly} here";
      const result = compactViewNodes(text, tags);

      // No raw ChordPro syntax in any text node
      const textContent = result
        .filter((n) => n.type === "text")
        .map((n) => (n as { type: "text"; content: string }).content)
        .join("");
      expect(textContent).not.toContain("{");
      expect(textContent).not.toContain("}");
      expect(textContent).toContain("Sing ");
      expect(textContent).toContain(" here");
    });
  });

  describe("icon rendering (Req 9.2, 9.3)", () => {
    it("renders an icon node for each ChordPro tag", () => {
      const tags = makeTags(2);
      const text = "Hello {tag1: loud} world {tag2: soft}";
      const result = compactViewNodes(text, tags);

      const iconNodes = result.filter((n) => n.type === "icon");
      expect(iconNodes).toHaveLength(2);
    });

    it("uses the tag definition icon and color", () => {
      const tags = makeTags(2);
      const text = "Hello {tag1: loud}";
      const result = compactViewNodes(text, tags);

      const iconNode = result.find((n) => n.type === "icon") as { type: "icon"; icon: string; color: string; label: string };
      expect(iconNode).toBeDefined();
      expect(iconNode.icon).toBe("fa-solid fa-1");
      expect(iconNode.color).toBe("#000001");
    });
  });

  describe("zusatztext suppression (Req 9.4)", () => {
    it("does not include zusatztext in the output", () => {
      const tags = makeTags(2);
      const text = "Hello {tag1: sing loudly with vibrato}";
      const result = compactViewNodes(text, tags);

      // The zusatztext should not appear anywhere in the rendered output
      const allContent = result.map((n) => {
        if (n.type === "text") return n.content;
        return `${n.icon} ${n.color} ${n.label}`;
      }).join(" ");

      expect(allContent).not.toContain("sing loudly with vibrato");
    });

    it("does not include zusatztext even when it is empty", () => {
      const tags = makeTags(2);
      const text = "Hello {tag1:}";
      const result = compactViewNodes(text, tags);

      const iconNodes = result.filter((n) => n.type === "icon");
      expect(iconNodes).toHaveLength(1);
    });
  });

  describe("text flow preservation (Req 9.5)", () => {
    it("preserves text segments around tags", () => {
      const tags = makeTags(2);
      const text = "Before {tag1: x} middle {tag2: y} after";
      const result = compactViewNodes(text, tags);

      expect(result).toHaveLength(5); // text, icon, text, icon, text
      expect(result[0]).toEqual({ type: "text", content: "Before " });
      expect(result[1]).toMatchObject({ type: "icon" });
      expect(result[2]).toEqual({ type: "text", content: " middle " });
      expect(result[3]).toMatchObject({ type: "icon" });
      expect(result[4]).toEqual({ type: "text", content: " after" });
    });
  });

  describe("unknown tag handling (Req 9.6)", () => {
    it("uses generic warning icon for unknown tags", () => {
      const tags = makeTags(1);
      const text = "Hello {unknowntag: something}";
      const result = compactViewNodes(text, tags);

      const iconNode = result.find((n) => n.type === "icon") as { type: "icon"; icon: string; color: string; label: string };
      expect(iconNode).toBeDefined();
      expect(iconNode.icon).toBe(UNKNOWN_ICON);
      expect(iconNode.color).toBe(UNKNOWN_COLOR);
    });

    it("uses the tag name as label for unknown tags", () => {
      const tags = makeTags(1);
      const text = "Hello {mystery: hint}";
      const result = compactViewNodes(text, tags);

      const iconNode = result.find((n) => n.type === "icon") as { type: "icon"; icon: string; color: string; label: string };
      expect(iconNode.label).toBe("mystery");
    });
  });

  describe("edge cases", () => {
    it("handles empty text", () => {
      const tags = makeTags(2);
      const result = compactViewNodes("", tags);
      expect(result).toHaveLength(0);
    });

    it("handles text with no tags", () => {
      const tags = makeTags(2);
      const result = compactViewNodes("Just plain text", tags);
      expect(result).toEqual([{ type: "text", content: "Just plain text" }]);
    });

    it("handles empty tag definitions array", () => {
      const text = "Hello {belt: loud}";
      const result = compactViewNodes(text, []);

      const iconNode = result.find((n) => n.type === "icon") as { type: "icon"; icon: string; color: string; label: string };
      expect(iconNode.icon).toBe(UNKNOWN_ICON);
    });

    it("handles multiple tags in sequence", () => {
      const tags = makeTags(3);
      const text = "{tag1: a}{tag2: b}{tag3: c}";
      const result = compactViewNodes(text, tags);

      expect(result).toHaveLength(3);
      expect(result.every((n) => n.type === "icon")).toBe(true);
    });
  });
});
