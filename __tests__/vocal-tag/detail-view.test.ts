import { describe, it, expect } from "vitest";
import { parseChordPro } from "@/lib/vocal-tag/chordpro-parser";
import type { TagDefinitionData } from "@/types/vocal-tag";

/**
 * Unit tests for DetailView component logic.
 *
 * Since the test environment is node (not jsdom), we test the core rendering
 * logic: parsing text, resolving tag definitions, and verifying that the
 * detail view produces the correct node structure (icons AND zusatztext).
 *
 * Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
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
 * Simulates the detail view rendering logic:
 * parse text, then for each node decide what to render.
 * Detail view shows icon AND zusatztext (unlike compact which only shows icon).
 */
function detailViewNodes(
  text: string,
  tagDefinitions: TagDefinitionData[]
): Array<
  | { type: "text"; content: string }
  | { type: "annotation"; icon: string; color: string; label: string; zusatztext: string }
> {
  const knownTags = tagDefinitions.map((d) => d.tag);
  const { nodes } = parseChordPro(text, knownTags);

  return nodes.map((node) => {
    if (node.type === "text") {
      return { type: "text" as const, content: node.content ?? "" };
    }
    const definition = tagDefinitions.find((d) => d.tag === node.tag);
    return {
      type: "annotation" as const,
      icon: definition?.icon ?? UNKNOWN_ICON,
      color: definition?.color ?? UNKNOWN_COLOR,
      label: definition?.label ?? node.tag ?? "",
      zusatztext: node.zusatztext ?? "",
    };
  });
}

describe("DetailView logic", () => {
  describe("text rendering without ChordPro syntax (Req 10.5)", () => {
    it("renders plain text without modification", () => {
      const tags = makeTags(2);
      const result = detailViewNodes("Hello world", tags);
      expect(result).toEqual([{ type: "text", content: "Hello world" }]);
    });

    it("strips ChordPro syntax from output", () => {
      const tags = makeTags(2);
      const text = "Sing {tag1: softly} here";
      const result = detailViewNodes(text, tags);

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

  describe("icon rendering above word start (Req 10.2)", () => {
    it("renders an annotation node for each ChordPro tag", () => {
      const tags = makeTags(2);
      const text = "Hello {tag1: loud} world {tag2: soft}";
      const result = detailViewNodes(text, tags);

      const annotationNodes = result.filter((n) => n.type === "annotation");
      expect(annotationNodes).toHaveLength(2);
    });

    it("uses the tag definition icon and color", () => {
      const tags = makeTags(2);
      const text = "Hello {tag1: loud}";
      const result = detailViewNodes(text, tags);

      const ann = result.find((n) => n.type === "annotation") as {
        type: "annotation"; icon: string; color: string; label: string; zusatztext: string;
      };
      expect(ann).toBeDefined();
      expect(ann.icon).toBe("fa-solid fa-1");
      expect(ann.color).toBe("#000001");
    });
  });

  describe("zusatztext display (Req 10.3)", () => {
    it("includes zusatztext in annotation nodes", () => {
      const tags = makeTags(2);
      const text = "Hello {tag1: sing loudly with vibrato}";
      const result = detailViewNodes(text, tags);

      const ann = result.find((n) => n.type === "annotation") as {
        type: "annotation"; icon: string; color: string; label: string; zusatztext: string;
      };
      expect(ann).toBeDefined();
      expect(ann.zusatztext).toBe("sing loudly with vibrato");
    });

    it("shows empty zusatztext when tag has no zusatztext", () => {
      const tags = makeTags(2);
      const text = "Hello {tag1:}";
      const result = detailViewNodes(text, tags);

      const ann = result.find((n) => n.type === "annotation") as {
        type: "annotation"; icon: string; color: string; label: string; zusatztext: string;
      };
      expect(ann).toBeDefined();
      expect(ann.zusatztext).toBe("");
    });

    it("renders zusatztext in tag color", () => {
      const tags = makeTags(2);
      const text = "Hello {tag2: breathy}";
      const result = detailViewNodes(text, tags);

      const ann = result.find((n) => n.type === "annotation") as {
        type: "annotation"; icon: string; color: string; label: string; zusatztext: string;
      };
      expect(ann.color).toBe("#000002");
      expect(ann.zusatztext).toBe("breathy");
    });
  });

  describe("text flow preservation (Req 10.4)", () => {
    it("preserves text segments around tags", () => {
      const tags = makeTags(2);
      const text = "Before {tag1: x} middle {tag2: y} after";
      const result = detailViewNodes(text, tags);

      expect(result).toHaveLength(5);
      expect(result[0]).toEqual({ type: "text", content: "Before " });
      expect(result[1]).toMatchObject({ type: "annotation" });
      expect(result[2]).toEqual({ type: "text", content: " middle " });
      expect(result[3]).toMatchObject({ type: "annotation" });
      expect(result[4]).toEqual({ type: "text", content: " after" });
    });
  });

  describe("unknown tag handling (Req 10.6)", () => {
    it("uses generic warning icon for unknown tags", () => {
      const tags = makeTags(1);
      const text = "Hello {unknowntag: something}";
      const result = detailViewNodes(text, tags);

      const ann = result.find((n) => n.type === "annotation") as {
        type: "annotation"; icon: string; color: string; label: string; zusatztext: string;
      };
      expect(ann).toBeDefined();
      expect(ann.icon).toBe(UNKNOWN_ICON);
      expect(ann.color).toBe(UNKNOWN_COLOR);
    });

    it("still shows zusatztext for unknown tags in gray", () => {
      const tags = makeTags(1);
      const text = "Hello {mystery: hint text}";
      const result = detailViewNodes(text, tags);

      const ann = result.find((n) => n.type === "annotation") as {
        type: "annotation"; icon: string; color: string; label: string; zusatztext: string;
      };
      expect(ann.color).toBe(UNKNOWN_COLOR);
      expect(ann.zusatztext).toBe("hint text");
    });

    it("uses the tag name as label for unknown tags", () => {
      const tags = makeTags(1);
      const text = "Hello {mystery: hint}";
      const result = detailViewNodes(text, tags);

      const ann = result.find((n) => n.type === "annotation") as {
        type: "annotation"; icon: string; color: string; label: string; zusatztext: string;
      };
      expect(ann.label).toBe("mystery");
    });
  });

  describe("edge cases", () => {
    it("handles empty text", () => {
      const tags = makeTags(2);
      const result = detailViewNodes("", tags);
      expect(result).toHaveLength(0);
    });

    it("handles text with no tags", () => {
      const tags = makeTags(2);
      const result = detailViewNodes("Just plain text", tags);
      expect(result).toEqual([{ type: "text", content: "Just plain text" }]);
    });

    it("handles empty tag definitions array", () => {
      const text = "Hello {belt: loud}";
      const result = detailViewNodes(text, []);

      const ann = result.find((n) => n.type === "annotation") as {
        type: "annotation"; icon: string; color: string; label: string; zusatztext: string;
      };
      expect(ann.icon).toBe(UNKNOWN_ICON);
      expect(ann.zusatztext).toBe("loud");
    });

    it("handles multiple tags in sequence", () => {
      const tags = makeTags(3);
      const text = "{tag1: a}{tag2: b}{tag3: c}";
      const result = detailViewNodes(text, tags);

      expect(result).toHaveLength(3);
      expect(result.every((n) => n.type === "annotation")).toBe(true);
    });
  });
});
