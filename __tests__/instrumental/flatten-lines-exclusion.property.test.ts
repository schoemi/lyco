/**
 * Property 5: FlattenLines schließt nicht-lernbare Inhalte aus
 *
 * For any SongDetail with a mix of instrumental/normal strophes and
 * kommentar/normal zeilen, flattenLines SHALL return a flat list containing
 * no zeile whose stropheId belongs to an instrumental strophe, and no zeile
 * whose zeileId belongs to a kommentar zeile.
 *
 * **Validates: Requirements 3.2, 3.6, 3.7, 4.2, 4.4, 4.5**
 */
// Feature: instrumental-annotations, Property 5: FlattenLines schließt nicht-lernbare Inhalte aus

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { flattenLines } from "@/lib/karaoke/flatten-lines";
import { arbSongDetail } from "./generators";

describe("Property 5: FlattenLines schließt nicht-lernbare Inhalte aus", () => {
  it("no flat line references a stropheId belonging to an instrumental strophe", () => {
    fc.assert(
      fc.property(arbSongDetail, (song) => {
        const instrumentalIds = new Set(
          song.strophen.filter((s) => s.istInstrumental).map((s) => s.id),
        );
        const result = flattenLines(song);
        for (const line of result) {
          expect(instrumentalIds.has(line.stropheId)).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("no flat line references a zeileId belonging to a kommentar zeile", () => {
    fc.assert(
      fc.property(arbSongDetail, (song) => {
        const kommentarIds = new Set(
          song.strophen.flatMap((s) =>
            s.zeilen.filter((z) => z.istKommentar).map((z) => z.id),
          ),
        );
        const result = flattenLines(song);
        for (const line of result) {
          expect(kommentarIds.has(line.zeileId)).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("every flat line references a non-instrumental strophe and non-kommentar zeile from the input", () => {
    fc.assert(
      fc.property(arbSongDetail, (song) => {
        const nonInstrumentalIds = new Set(
          song.strophen.filter((s) => !s.istInstrumental).map((s) => s.id),
        );
        const nonKommentarIds = new Set(
          song.strophen.flatMap((s) =>
            s.zeilen.filter((z) => !z.istKommentar).map((z) => z.id),
          ),
        );
        const result = flattenLines(song);
        for (const line of result) {
          expect(nonInstrumentalIds.has(line.stropheId)).toBe(true);
          expect(nonKommentarIds.has(line.zeileId)).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("flat line count equals the total non-kommentar zeilen in non-instrumental strophes", () => {
    fc.assert(
      fc.property(arbSongDetail, (song) => {
        const expectedCount = song.strophen
          .filter((s) => !s.istInstrumental)
          .reduce(
            (sum, s) => sum + s.zeilen.filter((z) => !z.istKommentar).length,
            0,
          );
        const result = flattenLines(song);
        expect(result.length).toBe(expectedCount);
      }),
      { numRuns: 100 },
    );
  });
});
