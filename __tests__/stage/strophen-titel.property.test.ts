// Feature: lyco-stage, Property 18: Strophentitel-Anzeige
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { getStropheNameForLine } from "@/app/stage/[songId]/page";
import type { FlatLine } from "@/types/karaoke";
import type { StageSong } from "@/types/stage";

/**
 * Property 18: Strophentitel-Anzeige
 *
 * Für jeden Song mit Strophen soll getStropheNameForLine den Namen der Strophe
 * zurückgeben, zu der die aktive Zeile gehört.
 *
 * **Validates: Requirement 6.5**
 */

const PBT_CONFIG = { numRuns: 100 };

/** Generates a StageSong with at least one strophe and one zeile */
const arbStageSong = fc.record({
  id: fc.uuid(),
  titel: fc.string({ minLength: 1, maxLength: 50 }),
  kuenstler: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
  strophen: fc.array(
    fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 30 }),
      orderIndex: fc.nat(),
      zeilen: fc.array(
        fc.record({
          id: fc.uuid(),
          text: fc.string({ minLength: 1, maxLength: 100 }),
          orderIndex: fc.nat(),
        }),
        { minLength: 1, maxLength: 5 },
      ),
    }),
    { minLength: 1, maxLength: 5 },
  ),
});

/** Builds FlatLines from a StageSong (mirrors the page's flattenStageSong) */
function buildFlatLines(song: StageSong): FlatLine[] {
  const sortedStrophen = [...song.strophen].sort((a, b) => a.orderIndex - b.orderIndex);
  const flatLines: FlatLine[] = [];
  let globalIndex = 0;

  for (const strophe of sortedStrophen) {
    const sortedZeilen = [...strophe.zeilen].sort((a, b) => a.orderIndex - b.orderIndex);
    const stropheLineCount = sortedZeilen.length;

    for (let i = 0; i < sortedZeilen.length; i++) {
      const zeile = sortedZeilen[i];
      flatLines.push({
        zeileId: zeile.id,
        text: zeile.text,
        rawText: zeile.text,
        stropheId: strophe.id,
        stropheName: strophe.name,
        globalIndex,
        indexInStrophe: i,
        stropheLineCount,
      });
      globalIndex++;
    }
  }

  return flatLines;
}

describe("Property 18 – Strophentitel-Anzeige", () => {
  it("getStropheNameForLine gibt den korrekten Strophennamen für jede aktive Zeile zurück", () => {
    fc.assert(
      fc.property(
        arbStageSong.chain((song) => {
          const flatLines = buildFlatLines(song);
          return fc
            .integer({ min: 0, max: flatLines.length - 1 })
            .map((activeIndex) => ({ song, flatLines, activeIndex }));
        }),
        ({ song, flatLines, activeIndex }) => {
          const result = getStropheNameForLine(flatLines, activeIndex, song);
          const expectedStropheId = flatLines[activeIndex].stropheId;
          const expectedStrophe = song.strophen.find((s) => s.id === expectedStropheId);
          expect(result).toBe(expectedStrophe?.name ?? null);
        },
      ),
      PBT_CONFIG,
    );
  });

  it("getStropheNameForLine gibt null zurück wenn activeIndex außerhalb der Grenzen liegt", () => {
    fc.assert(
      fc.property(
        arbStageSong,
        fc.integer({ min: 100, max: 10000 }),
        (song, outOfBoundsIndex) => {
          const flatLines = buildFlatLines(song);
          // Ensure index is truly out of bounds
          const idx = flatLines.length + outOfBoundsIndex;
          const result = getStropheNameForLine(flatLines, idx, song);
          expect(result).toBeNull();
        },
      ),
      PBT_CONFIG,
    );
  });

  it("Strophenname ist nie leer für gültige Zeilen", () => {
    fc.assert(
      fc.property(
        arbStageSong.chain((song) => {
          const flatLines = buildFlatLines(song);
          return fc
            .integer({ min: 0, max: flatLines.length - 1 })
            .map((activeIndex) => ({ song, flatLines, activeIndex }));
        }),
        ({ song, flatLines, activeIndex }) => {
          const result = getStropheNameForLine(flatLines, activeIndex, song);
          expect(result).not.toBeNull();
          expect(result!.length).toBeGreaterThan(0);
        },
      ),
      PBT_CONFIG,
    );
  });
});
