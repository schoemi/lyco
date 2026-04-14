// Feature: lyco-stage, Property 5: Setlist-Reihenfolge-Erhaltung
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { sortSongsByOrderIndex } from "@/app/stage/page";

/**
 * Property 5: Setlist-Reihenfolge-Erhaltung
 *
 * Für jede Setlist mit beliebig vielen Songs soll die Anzeige-Reihenfolge
 * der Songs exakt der gespeicherten `orderIndex`-Reihenfolge entsprechen.
 *
 * **Validates: Requirement 5.1**
 */

const PBT_CONFIG = { numRuns: 100 };

describe("Property 5 – Setlist-Reihenfolge-Erhaltung", () => {
  it("sortSongsByOrderIndex sortiert Songs aufsteigend nach orderIndex", () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ songId: fc.uuid(), orderIndex: fc.nat() })),
        (songs) => {
          const sorted = sortSongsByOrderIndex(songs);
          for (let i = 1; i < sorted.length; i++) {
            expect(sorted[i].orderIndex).toBeGreaterThanOrEqual(
              sorted[i - 1].orderIndex,
            );
          }
        },
      ),
      PBT_CONFIG,
    );
  });

  it("sortSongsByOrderIndex gibt dieselbe Anzahl Songs zurück", () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ songId: fc.uuid(), orderIndex: fc.nat() })),
        (songs) => {
          const sorted = sortSongsByOrderIndex(songs);
          expect(sorted).toHaveLength(songs.length);
        },
      ),
      PBT_CONFIG,
    );
  });

  it("sortSongsByOrderIndex verändert das Original-Array nicht (pure function)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ songId: fc.uuid(), orderIndex: fc.nat() })),
        (songs) => {
          const original = songs.map((s) => ({ ...s }));
          sortSongsByOrderIndex(songs);
          expect(songs).toEqual(original);
        },
      ),
      PBT_CONFIG,
    );
  });

  it("sortSongsByOrderIndex enthält alle ursprünglichen songIds", () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ songId: fc.uuid(), orderIndex: fc.nat() })),
        (songs) => {
          const sorted = sortSongsByOrderIndex(songs);
          const originalIds = songs.map((s) => s.songId).sort();
          const sortedIds = sorted.map((s) => s.songId).sort();
          expect(sortedIds).toEqual(originalIds);
        },
      ),
      PBT_CONFIG,
    );
  });

  it("leere Setlist bleibt leer", () => {
    expect(sortSongsByOrderIndex([])).toEqual([]);
  });

  it("einzelner Song bleibt unverändert", () => {
    const song = { songId: "abc", orderIndex: 5 };
    expect(sortSongsByOrderIndex([song])).toEqual([song]);
  });
});
