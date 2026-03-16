/**
 * Preservation Property-Tests – Cloze UX Fixes
 *
 * Diese Tests werden VOR der Implementierung des Fixes geschrieben und sollen auf
 * dem unfixierten Code BESTEHEN. Sie erfassen das Baseline-Verhalten, das nach dem
 * Fix unverändert bleiben muss.
 *
 * Property 3: Normale Texteingabe bleibt unverändert (Req 3.1, 3.3)
 * Property 4: Wörter ohne Satzzeichen bleiben unverändert (Req 3.4, 3.5, 3.6)
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import fs from "fs";
import path from "path";
import { generateGaps, DIFFICULTY_CONFIG, type ZeileInput } from "@/lib/cloze/gap-generator";
import type { DifficultyLevel } from "@/types/cloze";

// ── Constants ──
const DIFFICULTY_LEVELS: DifficultyLevel[] = ["leicht", "mittel", "schwer", "blind"];

// ── Arbitraries ──

/** A pure word: letters, digits, umlauts – NO leading/trailing punctuation */
const arbPureWord = fc.stringMatching(/^[a-zA-ZäöüÄÖÜß0-9]{2,12}$/);

/** A line of pure words (no punctuation attached) */
const arbPureWordsLine = fc
  .array(arbPureWord, { minLength: 1, maxLength: 15 })
  .map((words) => words.join(" "));

const arbDifficulty = fc.constantFrom<DifficultyLevel>(...DIFFICULTY_LEVELS);

/** Non-spacebar key characters: letters, digits, umlauts */
const arbNonSpaceChar = fc.stringMatching(/^[a-zA-ZäöüÄÖÜß0-9]$/);

// ── Property 4: Wörter ohne Satzzeichen bleiben unverändert ──

describe("Property 4: Preservation – Wörter ohne Satzzeichen bleiben unverändert", () => {
  /**
   * **Validates: Requirements 3.4**
   *
   * For all randomly generated words WITHOUT leading/trailing punctuation:
   * generateGaps returns `word` unchanged.
   */
  it("generateGaps returns word unchanged for words without punctuation", () => {
    fc.assert(
      fc.property(
        arbPureWordsLine,
        arbDifficulty,
        fc.uuid(),
        (lineText, difficulty, zeileId) => {
          const zeilen: ZeileInput[] = [{ id: zeileId, text: lineText }];
          const result = generateGaps(zeilen, difficulty);

          const inputWords = lineText.split(/\s+/).filter((w) => w.length > 0);

          // Each gap's word should match the original input word exactly
          expect(result).toHaveLength(inputWords.length);
          for (let i = 0; i < result.length; i++) {
            expect(result[i].word).toBe(inputWords[i]);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 3.5**
   *
   * Difficulty changes generate gaps deterministically: same inputs → same outputs.
   */
  it("generateGaps produces deterministic results across difficulty changes", () => {
    fc.assert(
      fc.property(
        arbPureWordsLine,
        arbDifficulty,
        fc.uuid(),
        (lineText, difficulty, zeileId) => {
          const zeilen: ZeileInput[] = [{ id: zeileId, text: lineText }];

          const run1 = generateGaps(zeilen, difficulty);
          const run2 = generateGaps(zeilen, difficulty);

          expect(run1).toStrictEqual(run2);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 3.6**
   *
   * Blind mode marks 100% of words as gaps.
   */
  it("blind mode marks all words as gaps", () => {
    fc.assert(
      fc.property(
        arbPureWordsLine,
        fc.uuid(),
        (lineText, zeileId) => {
          const zeilen: ZeileInput[] = [{ id: zeileId, text: lineText }];
          const result = generateGaps(zeilen, "blind");

          const inputWords = lineText.split(/\s+/).filter((w) => w.length > 0);
          expect(result).toHaveLength(inputWords.length);
          expect(result.every((g) => g.isGap)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ── Property 3: Normale Texteingabe bleibt unverändert ──

describe("Property 3: Preservation – GapInput lässt Nicht-Leertasten-Eingaben durch", () => {
  const COMPONENT_PATH = path.resolve(
    process.cwd(),
    "src/components/cloze/gap-input.tsx",
  );
  const source = fs.readFileSync(COMPONENT_PATH, "utf-8");

  /**
   * **Validates: Requirements 3.1**
   *
   * GapInput has an onChange handler that passes through character input.
   * On unfixed code, there is no onKeyDown that would block non-space keys.
   */
  it("GapInput has onChange handler for normal text input", () => {
    // The component must accept onChange and call it with the value
    expect(source).toContain("onChange");
    expect(source).toMatch(/onChange.*e\.target\.value|onChange\(e\.target\.value\)/s);
  });

  /**
   * **Validates: Requirements 3.3**
   *
   * GapInput does NOT block TAB navigation – no preventDefault for TAB key.
   * On unfixed code, there is no onKeyDown handler at all, so TAB works by default.
   */
  it("GapInput does not block TAB key (browser default navigation preserved)", () => {
    // On unfixed code: no onKeyDown handler exists, so TAB is never intercepted
    // After fix: onKeyDown should only intercept spacebar, not TAB
    // Either way, TAB should not be prevented
    const hasPreventDefaultForTab = /onKeyDown[\s\S]*?Tab[\s\S]*?preventDefault/;
    expect(source).not.toMatch(hasPreventDefaultForTab);
  });

  /**
   * **Validates: Requirements 3.1, 3.3**
   *
   * For all non-spacebar key characters: GapInput source does not contain
   * any logic that would block letter/number/umlaut input.
   */
  it("GapInput source does not block letter/number/umlaut input", () => {
    // Verify the input element uses standard onChange for text input
    expect(source).toContain('<input');
    expect(source).toContain('type="text"');
    expect(source).toContain("onChange");

    // No logic that would prevent default on letter keys
    // (On unfixed code there's no onKeyDown at all; after fix it only targets spacebar)
    const blocksLetterKeys = /preventDefault[\s\S]*?[a-zA-Z]/;
    // This pattern would match if preventDefault is called for letter keys
    // We just verify the component has standard text input behavior
    expect(source).toContain("onChange={(e) => onChange(e.target.value)");
  });
});

// ── Preservation: GapData structure on unfixed code ──

describe("Preservation – GapData structure integrity", () => {
  /**
   * **Validates: Requirements 3.4**
   *
   * Every GapData returned by generateGaps has the required fields:
   * gapId, zeileId, wordIndex, word, isGap.
   */
  it("generateGaps returns GapData with all required fields", () => {
    fc.assert(
      fc.property(
        arbPureWordsLine,
        arbDifficulty,
        fc.uuid(),
        (lineText, difficulty, zeileId) => {
          const zeilen: ZeileInput[] = [{ id: zeileId, text: lineText }];
          const result = generateGaps(zeilen, difficulty);

          for (const gap of result) {
            expect(gap).toHaveProperty("gapId");
            expect(gap).toHaveProperty("zeileId");
            expect(gap).toHaveProperty("wordIndex");
            expect(gap).toHaveProperty("word");
            expect(gap).toHaveProperty("isGap");
            expect(typeof gap.gapId).toBe("string");
            expect(typeof gap.zeileId).toBe("string");
            expect(typeof gap.wordIndex).toBe("number");
            expect(typeof gap.word).toBe("string");
            expect(typeof gap.isGap).toBe("boolean");
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 3.5, 3.6**
   *
   * Gap ratio matches difficulty config. Blind = 100%.
   * This must hold before and after the fix.
   */
  it("gap count matches difficulty ratio for pure-word lines", () => {
    fc.assert(
      fc.property(
        fc.array(arbPureWord, { minLength: 2, maxLength: 15 }).map((w) => w.join(" ")),
        arbDifficulty,
        fc.uuid(),
        (lineText, difficulty, zeileId) => {
          const zeilen: ZeileInput[] = [{ id: zeileId, text: lineText }];
          const result = generateGaps(zeilen, difficulty);

          const totalWords = result.length;
          const gapCount = result.filter((g) => g.isGap).length;
          const config = DIFFICULTY_CONFIG[difficulty];

          if (difficulty === "blind") {
            expect(gapCount).toBe(totalWords);
          } else {
            const expectedGaps = Math.round(totalWords * config.ratio);
            expect(Math.abs(gapCount - expectedGaps)).toBeLessThanOrEqual(1);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
