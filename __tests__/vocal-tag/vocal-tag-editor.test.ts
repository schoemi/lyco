import { describe, it, expect } from "vitest";
import type { ChordProNode } from "@/types/vocal-tag";

/**
 * Unit tests for VocalTagEditor helper logic.
 *
 * Tests the pure functions that convert between ChordPro nodes and TipTap JSON,
 * and the serialization/parsing round-trip used by the editor component.
 *
 * Validates: Requirements 5.1, 6.1, 7.1, 8.1
 */

// Re-implement the helper functions here for testing since they are module-private.
// This mirrors the logic in vocal-tag-editor.tsx.

import { parseChordPro } from "@/lib/vocal-tag/chordpro-parser";
import { serializeChordPro } from "@/lib/vocal-tag/chordpro-serializer";

function editorToChordProNodes(json: {
  content?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
      attrs?: Record<string, unknown>;
    }>;
  }>;
}): ChordProNode[] {
  const result: ChordProNode[] = [];

  for (const block of json.content ?? []) {
    if (result.length > 0) {
      result.push({ type: "text", content: "\n" });
    }

    for (const inline of block.content ?? []) {
      if (inline.type === "chordProNode") {
        result.push({
          type: "chordpro-tag",
          tag: (inline.attrs?.tag as string) ?? "",
          zusatztext: (inline.attrs?.zusatztext as string) ?? "",
          unknown: (inline.attrs?.unknown as boolean) ?? false,
        });
      } else if (inline.type === "text") {
        result.push({ type: "text", content: inline.text ?? "" });
      }
    }
  }

  return result;
}

function chordProNodesToTipTap(
  nodes: ChordProNode[],
): Record<string, unknown> {
  const paragraphs: ChordProNode[][] = [[]];

  for (const node of nodes) {
    if (node.type === "text" && node.content?.includes("\n")) {
      const parts = node.content.split("\n");
      for (let i = 0; i < parts.length; i++) {
        if (i > 0) {
          paragraphs.push([]);
        }
        if (parts[i]) {
          paragraphs[paragraphs.length - 1].push({
            type: "text",
            content: parts[i],
          });
        }
      }
    } else {
      paragraphs[paragraphs.length - 1].push(node);
    }
  }

  return {
    type: "doc",
    content: paragraphs.map((para) => ({
      type: "paragraph",
      content:
        para.length === 0
          ? undefined
          : para.map((node) => {
              if (node.type === "chordpro-tag") {
                return {
                  type: "chordProNode",
                  attrs: {
                    tag: node.tag ?? "",
                    zusatztext: node.zusatztext ?? "",
                    unknown: node.unknown ?? false,
                  },
                };
              }
              return {
                type: "text",
                text: node.content ?? "",
              };
            }),
    })),
  };
}

describe("VocalTagEditor helper: editorToChordProNodes", () => {
  it("extracts text nodes from TipTap JSON", () => {
    const json = {
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello world" }],
        },
      ],
    };
    const nodes = editorToChordProNodes(json);
    expect(nodes).toEqual([{ type: "text", content: "Hello world" }]);
  });

  it("extracts chordProNode nodes with attributes", () => {
    const json = {
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Sing " },
            {
              type: "chordProNode",
              attrs: { tag: "belt", zusatztext: "kräftig", unknown: false },
            },
            { type: "text", text: " hier" },
          ],
        },
      ],
    };
    const nodes = editorToChordProNodes(json);
    expect(nodes).toEqual([
      { type: "text", content: "Sing " },
      { type: "chordpro-tag", tag: "belt", zusatztext: "kräftig", unknown: false },
      { type: "text", content: " hier" },
    ]);
  });

  it("adds newline between paragraphs", () => {
    const json = {
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Zeile 1" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Zeile 2" }],
        },
      ],
    };
    const nodes = editorToChordProNodes(json);
    expect(nodes).toEqual([
      { type: "text", content: "Zeile 1" },
      { type: "text", content: "\n" },
      { type: "text", content: "Zeile 2" },
    ]);
  });

  it("handles empty first paragraph followed by text", () => {
    const json = {
      content: [
        { type: "paragraph", content: [{ type: "text", text: "A" }] },
        { type: "paragraph", content: [] },
        { type: "paragraph", content: [{ type: "text", text: "B" }] },
      ],
    };
    const nodes = editorToChordProNodes(json);
    // Empty paragraph still produces a newline separator
    expect(nodes).toEqual([
      { type: "text", content: "A" },
      { type: "text", content: "\n" },
      { type: "text", content: "\n" },
      { type: "text", content: "B" },
    ]);
  });
});

describe("VocalTagEditor helper: chordProNodesToTipTap", () => {
  it("converts simple text to a single paragraph", () => {
    const nodes: ChordProNode[] = [{ type: "text", content: "Hello" }];
    const doc = chordProNodesToTipTap(nodes);
    expect(doc).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello" }],
        },
      ],
    });
  });

  it("converts chordpro-tag nodes to chordProNode type", () => {
    const nodes: ChordProNode[] = [
      { type: "text", content: "Sing " },
      { type: "chordpro-tag", tag: "belt", zusatztext: "kräftig" },
    ];
    const doc = chordProNodesToTipTap(nodes) as {
      content: Array<{ content: unknown[] }>;
    };
    expect(doc.content[0].content).toEqual([
      { type: "text", text: "Sing " },
      {
        type: "chordProNode",
        attrs: { tag: "belt", zusatztext: "kräftig", unknown: false },
      },
    ]);
  });

  it("splits text with newlines into multiple paragraphs", () => {
    const nodes: ChordProNode[] = [
      { type: "text", content: "Zeile 1\nZeile 2" },
    ];
    const doc = chordProNodesToTipTap(nodes) as {
      content: Array<{ type: string; content?: unknown[] }>;
    };
    expect(doc.content).toHaveLength(2);
    expect(doc.content[0].content).toEqual([
      { type: "text", text: "Zeile 1" },
    ]);
    expect(doc.content[1].content).toEqual([
      { type: "text", text: "Zeile 2" },
    ]);
  });

  it("handles empty node array", () => {
    const doc = chordProNodesToTipTap([]) as {
      content: Array<{ content?: unknown[] }>;
    };
    expect(doc.content).toHaveLength(1);
    expect(doc.content[0].content).toBeUndefined();
  });
});

describe("VocalTagEditor round-trip: parse → toTipTap → fromTipTap → serialize", () => {
  const knownTags = ["belt", "falsett", "hauch"];

  it("round-trips simple text with tags", () => {
    const input = "Sing {belt: kräftig} hier";
    const parsed = parseChordPro(input, knownTags);
    const tipTapDoc = chordProNodesToTipTap(parsed.nodes);
    const extracted = editorToChordProNodes(
      tipTapDoc as Parameters<typeof editorToChordProNodes>[0],
    );
    const output = serializeChordPro(extracted);
    expect(output).toBe(input);
  });

  it("round-trips multi-line text", () => {
    const input = "Zeile 1 {belt: laut}\nZeile 2 {falsett: leise}";
    const parsed = parseChordPro(input, knownTags);
    const tipTapDoc = chordProNodesToTipTap(parsed.nodes);
    const extracted = editorToChordProNodes(
      tipTapDoc as Parameters<typeof editorToChordProNodes>[0],
    );
    const output = serializeChordPro(extracted);
    expect(output).toBe(input);
  });

  it("round-trips tag with empty zusatztext", () => {
    const input = "Text {hauch:} Ende";
    const parsed = parseChordPro(input, knownTags);
    const tipTapDoc = chordProNodesToTipTap(parsed.nodes);
    const extracted = editorToChordProNodes(
      tipTapDoc as Parameters<typeof editorToChordProNodes>[0],
    );
    const output = serializeChordPro(extracted);
    expect(output).toBe(input);
  });
});
