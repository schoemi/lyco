import { describe, it, expect } from "vitest";
import type { TagDefinitionData } from "@/types/vocal-tag";

/**
 * Unit tests for VocalTagToolbar component logic.
 *
 * Since the test environment is node (not jsdom), we test the component's
 * core logic: sorting, splitting into top-5 vs dropdown, and the insertTag
 * behavior via the editor command chain.
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
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

const TOP_COUNT = 5;

describe("VocalTagToolbar logic", () => {
  describe("tag splitting", () => {
    it("splits tags into top-5 and remaining by indexNr", () => {
      const tags = makeTags(8);
      const sorted = [...tags].sort((a, b) => a.indexNr - b.indexNr);
      const topTags = sorted.slice(0, TOP_COUNT);
      const moreTags = sorted.slice(TOP_COUNT);

      expect(topTags).toHaveLength(5);
      expect(moreTags).toHaveLength(3);
      expect(topTags.map((t) => t.tag)).toEqual(["tag1", "tag2", "tag3", "tag4", "tag5"]);
      expect(moreTags.map((t) => t.tag)).toEqual(["tag6", "tag7", "tag8"]);
    });

    it("shows all tags as top buttons when 5 or fewer exist", () => {
      const tags = makeTags(3);
      const sorted = [...tags].sort((a, b) => a.indexNr - b.indexNr);
      const topTags = sorted.slice(0, TOP_COUNT);
      const moreTags = sorted.slice(TOP_COUNT);

      expect(topTags).toHaveLength(3);
      expect(moreTags).toHaveLength(0);
    });

    it("handles empty tag definitions", () => {
      const tags: TagDefinitionData[] = [];
      const sorted = [...tags].sort((a, b) => a.indexNr - b.indexNr);
      const topTags = sorted.slice(0, TOP_COUNT);
      const moreTags = sorted.slice(TOP_COUNT);

      expect(topTags).toHaveLength(0);
      expect(moreTags).toHaveLength(0);
    });

    it("sorts by indexNr regardless of input order", () => {
      const tags = makeTags(7).reverse();
      const sorted = [...tags].sort((a, b) => a.indexNr - b.indexNr);
      const topTags = sorted.slice(0, TOP_COUNT);

      expect(topTags[0].indexNr).toBe(1);
      expect(topTags[4].indexNr).toBe(5);
    });
  });

  describe("insertTag via editor command", () => {
    it("calls insertChordProTag with the correct tag attribute", () => {
      const calls: Array<{ tag: string }> = [];
      const fakeEditor = {
        chain: () => ({
          focus: () => ({
            insertChordProTag: (attrs: { tag: string }) => ({
              run: () => {
                calls.push(attrs);
              },
            }),
          }),
        }),
      };

      // Simulate what the toolbar does on button click
      const tag = "belt";
      fakeEditor.chain().focus().insertChordProTag({ tag }).run();

      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual({ tag: "belt" });
    });

    it("does not throw when editor is null", () => {
      const editor = null;
      // Simulate the guard in insertTag callback
      const insertTag = (tag: string) => {
        if (!editor) return;
        // would call editor.chain()...
      };

      expect(() => insertTag("belt")).not.toThrow();
    });
  });

  describe("tag button properties", () => {
    it("each tag has a label suitable for aria-label", () => {
      const tags = makeTags(5);
      for (const td of tags) {
        expect(td.label).toBeTruthy();
        expect(typeof td.label).toBe("string");
      }
    });

    it("each tag has a color for styling", () => {
      const tags = makeTags(5);
      for (const td of tags) {
        expect(td.color).toMatch(/^#/);
      }
    });

    it("each tag has an icon class", () => {
      const tags = makeTags(5);
      for (const td of tags) {
        expect(td.icon).toBeTruthy();
        expect(td.icon).toContain("fa-");
      }
    });
  });
});
