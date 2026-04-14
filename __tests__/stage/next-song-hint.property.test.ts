// Feature: lyco-stage, Property 6: Nächster-Song-Hinweis bei letzten Zeilen
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { shouldShowNextSongHint } from "@/components/stage/next-song-hint";

/**
 * Property 6: Nächster-Song-Hinweis bei letzten Zeilen
 *
 * Für jeden Song in einer Setlist (außer dem letzten) und jede aktive Zeile
 * innerhalb der letzten 3 Zeilen des Songs soll der Titel des nächsten Songs
 * sichtbar sein. Für Zeilen vor den letzten 3 soll der Hinweis nicht sichtbar sein.
 *
 * **Validates: Requirements 11.1**
 */

const PBT_CONFIG = { numRuns: 100 };

describe("Property 6 – Nächster-Song-Hinweis bei letzten Zeilen", () => {
  it("Hinweis ist sichtbar wenn aktive Zeile in den letzten 3 Zeilen liegt (kein letzter Song)", () => {
    fc.assert(
      fc.property(
        // totalLines >= 1
        fc.integer({ min: 1, max: 100 }).chain((totalLines) =>
          // activeLineIndex >= totalLines - 3
          fc
            .integer({ min: Math.max(0, totalLines - 3), max: totalLines - 1 })
            .map((activeLineIndex) => ({ activeLineIndex, totalLines })),
        ),
        ({ activeLineIndex, totalLines }) => {
          const result = shouldShowNextSongHint(activeLineIndex, totalLines, false);
          expect(result).toBe(true);
        },
      ),
      PBT_CONFIG,
    );
  });

  it("Hinweis ist NICHT sichtbar wenn aktive Zeile vor den letzten 3 Zeilen liegt (kein letzter Song)", () => {
    fc.assert(
      fc.property(
        // totalLines >= 4 so there are lines before the last 3
        fc.integer({ min: 4, max: 100 }).chain((totalLines) =>
          // activeLineIndex < totalLines - 3
          fc
            .integer({ min: 0, max: totalLines - 4 })
            .map((activeLineIndex) => ({ activeLineIndex, totalLines })),
        ),
        ({ activeLineIndex, totalLines }) => {
          const result = shouldShowNextSongHint(activeLineIndex, totalLines, false);
          expect(result).toBe(false);
        },
      ),
      PBT_CONFIG,
    );
  });

  it("Hinweis ist NIEMALS sichtbar wenn es der letzte Song ist (isLastSong=true)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 200 }),
        fc.integer({ min: 1, max: 200 }),
        (activeLineIndex, totalLines) => {
          const result = shouldShowNextSongHint(activeLineIndex, totalLines, true);
          expect(result).toBe(false);
        },
      ),
      PBT_CONFIG,
    );
  });
});
