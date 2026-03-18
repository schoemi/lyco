import { describe, it, expect } from "vitest";
import { parseChordPro } from "@/lib/vocal-tag/chordpro-parser";
import { serializeChordPro } from "@/lib/vocal-tag/chordpro-serializer";
import type { ChordProNode } from "@/types/vocal-tag";

describe("ChordPro Parser", () => {
  const knownTags = ["belt", "falsett", "hauch", "vibrato"];

  describe("valid tags", () => {
    it("parses a single known tag with zusatztext", () => {
      const result = parseChordPro("Sing {belt: kräftig} hier", knownTags);

      expect(result.nodes).toEqual([
        { type: "text", content: "Sing " },
        { type: "chordpro-tag", tag: "belt", zusatztext: "kräftig" },
        { type: "text", content: " hier" },
      ]);
      expect(result.warnings).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it("parses multiple tags in one line", () => {
      const result = parseChordPro(
        "{belt: laut} Text {falsett: leise}",
        knownTags
      );

      expect(result.nodes).toEqual([
        { type: "chordpro-tag", tag: "belt", zusatztext: "laut" },
        { type: "text", content: " Text " },
        { type: "chordpro-tag", tag: "falsett", zusatztext: "leise" },
      ]);
      expect(result.warnings).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it("parses plain text without any tags", () => {
      const result = parseChordPro("Just plain text", knownTags);

      expect(result.nodes).toEqual([
        { type: "text", content: "Just plain text" },
      ]);
      expect(result.warnings).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it("parses empty string", () => {
      const result = parseChordPro("", knownTags);

      expect(result.nodes).toEqual([]);
      expect(result.warnings).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("empty zusatztext", () => {
    it("parses tag with empty zusatztext {tag:}", () => {
      const result = parseChordPro("{belt:}", knownTags);

      expect(result.nodes).toEqual([
        { type: "chordpro-tag", tag: "belt", zusatztext: "" },
      ]);
      expect(result.warnings).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it("parses tag with whitespace-only zusatztext as empty", () => {
      const result = parseChordPro("{belt:   }", knownTags);

      expect(result.nodes).toEqual([
        { type: "chordpro-tag", tag: "belt", zusatztext: "" },
      ]);
    });
  });

  describe("unknown tags", () => {
    it("parses unknown tag with unknown: true and adds warning", () => {
      const result = parseChordPro("{growl: rauh}", knownTags);

      expect(result.nodes).toEqual([
        {
          type: "chordpro-tag",
          tag: "growl",
          zusatztext: "rauh",
          unknown: true,
        },
      ]);
      expect(result.warnings).toEqual(['Unbekannter Tag: "growl"']);
      expect(result.errors).toHaveLength(0);
    });

    it("parses mix of known and unknown tags", () => {
      const result = parseChordPro(
        "{belt: laut} {unknown1: test}",
        knownTags
      );

      expect(result.nodes).toHaveLength(3);
      expect(result.nodes[0]).toEqual({
        type: "chordpro-tag",
        tag: "belt",
        zusatztext: "laut",
      });
      expect(result.nodes[2]).toEqual({
        type: "chordpro-tag",
        tag: "unknown1",
        zusatztext: "test",
        unknown: true,
      });
      expect(result.warnings).toHaveLength(1);
    });
  });

  describe("error handling – unclosed braces", () => {
    it("detects unclosed opening brace", () => {
      const result = parseChordPro("Text {unclosed here", knownTags);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].position).toBe(5);
      expect(result.errors[0].line).toBe(1);
    });

    it("detects unclosed brace on second line", () => {
      const result = parseChordPro("Line1\n{broken", knownTags);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].position).toBe(6);
      expect(result.errors[0].line).toBe(2);
    });

    it("detects multiple unclosed braces", () => {
      const result = parseChordPro("{one {two", knownTags);

      expect(result.errors).toHaveLength(2);
    });

    it("valid tags alongside unclosed braces", () => {
      const result = parseChordPro(
        "{belt: ok} text {broken",
        knownTags
      );

      expect(result.nodes.some((n) => n.type === "chordpro-tag" && n.tag === "belt")).toBe(true);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].position).toBe(16);
    });

    it("brace without colon is treated as invalid", () => {
      const result = parseChordPro("{nocolon}", knownTags);

      // {nocolon} doesn't match {tag:zusatztext} pattern, so the { is an error
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].position).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("handles tag with numeric suffix in name", () => {
      const result = parseChordPro("{belt2: test}", ["belt2"]);

      expect(result.nodes).toEqual([
        { type: "chordpro-tag", tag: "belt2", zusatztext: "test" },
      ]);
    });

    it("handles zusatztext with spaces", () => {
      const result = parseChordPro("{belt: sehr kräftig singen}", knownTags);

      expect(result.nodes).toEqual([
        {
          type: "chordpro-tag",
          tag: "belt",
          zusatztext: "sehr kräftig singen",
        },
      ]);
    });

    it("handles empty knownTags – all tags are unknown", () => {
      const result = parseChordPro("{belt: test}", []);

      expect(result.nodes[0]).toMatchObject({
        type: "chordpro-tag",
        tag: "belt",
        unknown: true,
      });
      expect(result.warnings).toHaveLength(1);
    });

    it("handles tag at very start and end of text", () => {
      const result = parseChordPro("{belt: start}{hauch: end}", knownTags);

      expect(result.nodes).toHaveLength(2);
      expect(result.nodes[0]).toMatchObject({ tag: "belt" });
      expect(result.nodes[1]).toMatchObject({ tag: "hauch" });
    });
  });
});

describe("ChordPro Serializer", () => {
  it("serializes text nodes directly", () => {
    const nodes: ChordProNode[] = [
      { type: "text", content: "Hello world" },
    ];
    expect(serializeChordPro(nodes)).toBe("Hello world");
  });

  it("serializes a chordpro-tag with zusatztext", () => {
    const nodes: ChordProNode[] = [
      { type: "chordpro-tag", tag: "belt", zusatztext: "kräftig" },
    ];
    expect(serializeChordPro(nodes)).toBe("{belt: kräftig}");
  });

  it("serializes a chordpro-tag with empty zusatztext as {tag:}", () => {
    const nodes: ChordProNode[] = [
      { type: "chordpro-tag", tag: "belt", zusatztext: "" },
    ];
    expect(serializeChordPro(nodes)).toBe("{belt:}");
  });

  it("serializes mixed text and tag nodes", () => {
    const nodes: ChordProNode[] = [
      { type: "text", content: "Sing " },
      { type: "chordpro-tag", tag: "belt", zusatztext: "kräftig" },
      { type: "text", content: " hier" },
    ];
    expect(serializeChordPro(nodes)).toBe("Sing {belt: kräftig} hier");
  });

  it("serializes multiple consecutive tags", () => {
    const nodes: ChordProNode[] = [
      { type: "chordpro-tag", tag: "belt", zusatztext: "start" },
      { type: "chordpro-tag", tag: "hauch", zusatztext: "end" },
    ];
    expect(serializeChordPro(nodes)).toBe("{belt: start}{hauch: end}");
  });

  it("serializes empty node array to empty string", () => {
    expect(serializeChordPro([])).toBe("");
  });

  it("serializes unknown tags the same way as known tags", () => {
    const nodes: ChordProNode[] = [
      { type: "chordpro-tag", tag: "growl", zusatztext: "rauh", unknown: true },
    ];
    expect(serializeChordPro(nodes)).toBe("{growl: rauh}");
  });

  it("handles text node with undefined content as empty string", () => {
    const nodes: ChordProNode[] = [
      { type: "text" },
    ];
    expect(serializeChordPro(nodes)).toBe("");
  });

  it("handles tag node with undefined zusatztext as empty", () => {
    const nodes: ChordProNode[] = [
      { type: "chordpro-tag", tag: "belt" },
    ];
    expect(serializeChordPro(nodes)).toBe("{belt:}");
  });
});
