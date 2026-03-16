import { describe, it, expect } from "vitest";
import { generateGaps, ZeileInput } from "@/lib/cloze/gap-generator";
import type { DifficultyLevel } from "@/types/cloze";

describe("generateGaps – Edge Cases", () => {
  // 1. Empty text line → no gaps generated (line skipped)
  // Validates: Requirements 2.5, 2.6
  it("skips a line with empty text", () => {
    const zeilen: ZeileInput[] = [{ id: "z1", text: "" }];
    const result = generateGaps(zeilen, "mittel");
    expect(result).toHaveLength(0);
  });

  // 5. Multiple empty lines → all skipped
  it("skips multiple empty lines", () => {
    const zeilen: ZeileInput[] = [
      { id: "z1", text: "" },
      { id: "z2", text: "" },
      { id: "z3", text: "" },
    ];
    const result = generateGaps(zeilen, "schwer");
    expect(result).toHaveLength(0);
  });

  // 6. Line with only whitespace → treated as empty, skipped
  it("skips a line with only whitespace", () => {
    const zeilen: ZeileInput[] = [{ id: "z1", text: "   \t  " }];
    const result = generateGaps(zeilen, "mittel");
    expect(result).toHaveLength(0);
  });

  // 2. Single word line with non-blind difficulty → at least 1 word visible
  // Validates: Requirement 2.6
  it("keeps single word visible for non-blind difficulties", () => {
    const zeilen: ZeileInput[] = [{ id: "z1", text: "Freiheit" }];

    const difficulties: DifficultyLevel[] = ["leicht", "mittel", "schwer"];
    for (const diff of difficulties) {
      const result = generateGaps(zeilen, diff);
      expect(result).toHaveLength(1);
      expect(result[0].isGap).toBe(false);
    }
  });

  // 3. Single word line with blind difficulty → word becomes a gap (100%)
  it("makes single word a gap for blind difficulty", () => {
    const zeilen: ZeileInput[] = [{ id: "z1", text: "Freiheit" }];
    const result = generateGaps(zeilen, "blind");
    expect(result).toHaveLength(1);
    expect(result[0].isGap).toBe(true);
    expect(result[0].word).toBe("Freiheit");
  });

  // 4. Line with special characters (punctuation, numbers, umlauts) → handled correctly
  it("handles special characters, punctuation, numbers, and umlauts", () => {
    const zeilen: ZeileInput[] = [
      { id: "z1", text: "Über 100 Straßen, führen nach München!" },
    ];
    const result = generateGaps(zeilen, "blind");

    // All words should be gaps in blind mode
    const words = result.map((g) => g.word);
    expect(words).toEqual(["Über", "100", "Straßen", "führen", "nach", "München"]);
    expect(result.every((g) => g.isGap)).toBe(true);

    // Verify punctuation is stripped into prefix/suffix
    const strassen = result.find((g) => g.word === "Straßen")!;
    expect(strassen.suffix).toBe(",");
    expect(strassen.prefix).toBe("");
    const muenchen = result.find((g) => g.word === "München")!;
    expect(muenchen.suffix).toBe("!");
    expect(muenchen.prefix).toBe("");

    // Verify gapId format
    for (let i = 0; i < result.length; i++) {
      expect(result[i].gapId).toBe(`z1-${i}`);
      expect(result[i].zeileId).toBe("z1");
      expect(result[i].wordIndex).toBe(i);
    }
  });

  // 7. Determinism: same inputs always produce same outputs
  // Validates: Requirement 2.5
  it("produces deterministic output for the same inputs", () => {
    const zeilen: ZeileInput[] = [
      { id: "zeile-abc-123", text: "Ich gehe heute durch die Stadt" },
      { id: "zeile-def-456", text: "Und sehe viele schöne Dinge" },
    ];

    const difficulties: DifficultyLevel[] = ["leicht", "mittel", "schwer", "blind"];

    for (const diff of difficulties) {
      const run1 = generateGaps(zeilen, diff);
      const run2 = generateGaps(zeilen, diff);
      expect(run1).toEqual(run2);
    }
  });
});
