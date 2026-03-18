import { describe, it, expect } from "vitest";
import { ChordProNode } from "@/lib/vocal-tag/chordpro-node-extension";
import type { TagDefinitionData } from "@/types/vocal-tag";

describe("ChordProNode Extension", () => {
  const extension = ChordProNode;

  it("has the correct name", () => {
    expect(extension.name).toBe("chordProNode");
  });

  it("is configured as inline", () => {
    const config = extension.config;
    expect(config.inline).toBe(true);
    expect(config.group).toBe("inline");
  });

  it("is configured as atom (non-editable inline content)", () => {
    expect(extension.config.atom).toBe(true);
  });

  describe("parseHTML", () => {
    it("recognizes span[data-chordpro-tag] elements", () => {
      const parseRules = extension.config.parseHTML!();
      expect(parseRules).toHaveLength(1);
      expect(parseRules[0]).toEqual({ tag: "span[data-chordpro-tag]" });
    });
  });

  describe("renderHTML", () => {
    it("renders a span with data attributes and aria-label (tag + zusatztext)", () => {
      const renderHTML = extension.config.renderHTML!;
      const result = renderHTML.call(extension, {
        HTMLAttributes: {
          "data-chordpro-tag": "belt",
          "data-zusatztext": "kräftig",
        },
        node: {} as any,
      });

      expect(result[0]).toBe("span");
      const attrs = result[1] as Record<string, string>;
      expect(attrs["data-chordpro-tag"]).toBe("belt");
      expect(attrs["data-zusatztext"]).toBe("kräftig");
      expect(attrs["aria-label"]).toBe("belt: kräftig");
      expect(attrs["class"]).toBe("chordpro-tag");
    });

    it("renders aria-label with only tag when zusatztext is empty", () => {
      const renderHTML = extension.config.renderHTML!;
      const result = renderHTML.call(extension, {
        HTMLAttributes: {
          "data-chordpro-tag": "falsett",
          "data-zusatztext": "",
        },
        node: {} as any,
      });

      const attrs = result[1] as Record<string, string>;
      expect(attrs["aria-label"]).toBe("falsett");
    });

    it("includes data-unknown attribute when unknown is true", () => {
      const renderHTML = extension.config.renderHTML!;
      const result = renderHTML.call(extension, {
        HTMLAttributes: {
          "data-chordpro-tag": "growl",
          "data-zusatztext": "rauh",
          "data-unknown": "true",
        },
        node: {} as any,
      });

      const attrs = result[1] as Record<string, string>;
      expect(attrs["data-unknown"]).toBe("true");
    });

    it("omits data-unknown attribute when unknown is false", () => {
      const renderHTML = extension.config.renderHTML!;
      const result = renderHTML.call(extension, {
        HTMLAttributes: {
          "data-chordpro-tag": "belt",
          "data-zusatztext": "test",
        },
        node: {} as any,
      });

      const attrs = result[1] as Record<string, string>;
      expect(attrs["data-unknown"]).toBeUndefined();
    });
  });

  describe("attributes", () => {
    it("defines tag, zusatztext, and unknown attributes", () => {
      const addAttributes = extension.config.addAttributes!;
      const attrs =
        typeof addAttributes === "function"
          ? addAttributes.call(extension)
          : addAttributes;

      expect(attrs).toHaveProperty("tag");
      expect(attrs).toHaveProperty("zusatztext");
      expect(attrs).toHaveProperty("unknown");
    });

    it("has correct default values", () => {
      const addAttributes = extension.config.addAttributes!;
      const attrs =
        typeof addAttributes === "function"
          ? addAttributes.call(extension)
          : addAttributes;

      expect(attrs.tag.default).toBe("");
      expect(attrs.zusatztext.default).toBe("");
      expect(attrs.unknown.default).toBe(false);
    });
  });

  describe("addKeyboardShortcuts", () => {
    function makeTagDef(tag: string, indexNr: number): TagDefinitionData {
      return {
        id: `id-${tag}`,
        tag,
        label: `Label ${tag}`,
        icon: `fa-${tag}`,
        color: "#000000",
        indexNr,
      };
    }

    it("registers Mod-1 through Mod-9 shortcuts", () => {
      const configured = ChordProNode.configure({
        tagDefinitions: [makeTagDef("belt", 1)],
      });
      const addKeyboardShortcuts = configured.config.addKeyboardShortcuts!;
      const shortcuts = addKeyboardShortcuts.call({
        options: { tagDefinitions: [makeTagDef("belt", 1)] },
        editor: { commands: { insertChordProTag: () => true } },
      } as any);

      for (let n = 1; n <= 9; n++) {
        expect(shortcuts).toHaveProperty(`Mod-${n}`);
        expect(typeof shortcuts[`Mod-${n}`]).toBe("function");
      }
    });

    it("Mod-1 inserts the tag with the lowest indexNr", () => {
      const tags = [
        makeTagDef("falsett", 3),
        makeTagDef("belt", 1),
        makeTagDef("hauch", 2),
      ];

      let insertedTag: string | null = null;
      const shortcuts = ChordProNode.config.addKeyboardShortcuts!.call({
        options: { tagDefinitions: tags },
        editor: {
          commands: {
            insertChordProTag: (attrs: { tag: string }) => {
              insertedTag = attrs.tag;
              return true;
            },
          },
        },
      } as any);

      shortcuts["Mod-1"]();
      expect(insertedTag).toBe("belt");
    });

    it("Mod-3 inserts the third tag by indexNr", () => {
      const tags = [
        makeTagDef("falsett", 3),
        makeTagDef("belt", 1),
        makeTagDef("hauch", 2),
      ];

      let insertedTag: string | null = null;
      const shortcuts = ChordProNode.config.addKeyboardShortcuts!.call({
        options: { tagDefinitions: tags },
        editor: {
          commands: {
            insertChordProTag: (attrs: { tag: string }) => {
              insertedTag = attrs.tag;
              return true;
            },
          },
        },
      } as any);

      shortcuts["Mod-3"]();
      expect(insertedTag).toBe("falsett");
    });

    it("returns false when fewer than N tags exist", () => {
      const tags = [makeTagDef("belt", 1), makeTagDef("hauch", 2)];

      const shortcuts = ChordProNode.config.addKeyboardShortcuts!.call({
        options: { tagDefinitions: tags },
        editor: {
          commands: {
            insertChordProTag: () => true,
          },
        },
      } as any);

      // Mod-3 should return false since only 2 tags exist
      const result = shortcuts["Mod-3"]();
      expect(result).toBe(false);
    });

    it("returns false for all shortcuts when no tags exist", () => {
      const shortcuts = ChordProNode.config.addKeyboardShortcuts!.call({
        options: { tagDefinitions: [] },
        editor: {
          commands: {
            insertChordProTag: () => true,
          },
        },
      } as any);

      for (let n = 1; n <= 9; n++) {
        expect(shortcuts[`Mod-${n}`]()).toBe(false);
      }
    });
  });
});
