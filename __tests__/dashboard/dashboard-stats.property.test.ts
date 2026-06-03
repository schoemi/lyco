import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { computeSetStats } from "@/lib/services/dashboard-stats";
import type { SetSongWithMp3Quellen } from "@/lib/services/dashboard-stats";

/**
 * Feature: set-playlist-player
 * Property 7: Stats-Berechnung — Spielbare Songs und Rollen
 *
 * `computeSetStats(songs).rolleStats.total` entspricht exakt der Anzahl Songs
 * mit mind. 1 MP3-Quelle.
 * Für jede Rolle R: `rolleStats[R]` entspricht exakt der Anzahl Songs mit
 * mind. 1 MP3-Quelle der Rolle R.
 *
 * **Validates: Requirements 8.3, 8.7**
 */

const PBT_CONFIG = { numRuns: 100 };

/** Valid MP3 rolle values (as stored in DB — already filtered to MP3 by Prisma query) */
const rolleArb = fc.constantFrom(
  "STANDARD" as const,
  "INSTRUMENTAL" as const,
  "REFERENZ_VOKAL" as const,
);

/**
 * Arbitrary for a single MP3 audio source (rolle is the only relevant field
 * because the Prisma query selects only `rolle`, and only `typ === "MP3"` rows).
 */
const mp3QuelleArb: fc.Arbitrary<{ rolle: string }> = rolleArb.map((rolle) => ({
  rolle,
}));

/**
 * Arbitrary for the `song` portion of a SetSongWithMp3Quellen row.
 * `audioQuellen` may be empty (non-playable song) or have 1–5 MP3 sources.
 */
const songArb: fc.Arbitrary<SetSongWithMp3Quellen["song"]> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 36 }),
  kuenstler: fc.option(
    fc.string({ minLength: 1, maxLength: 100 }),
    { nil: null }
  ),
  audioQuellen: fc.array(mp3QuelleArb, { minLength: 0, maxLength: 5 }),
});

/**
 * Arbitrary for a full SetSongWithMp3Quellen row.
 */
const setSongArb: fc.Arbitrary<SetSongWithMp3Quellen> = songArb.map((song) => ({
  song,
}));

/**
 * Arbitrary for an array of SetSongWithMp3Quellen rows (0–20 songs).
 */
const setSongsArb: fc.Arbitrary<SetSongWithMp3Quellen[]> = fc.array(setSongArb, {
  minLength: 0,
  maxLength: 20,
});

// ---------------------------------------------------------------------------
// Property 7a: rolleStats.total === count of songs with >= 1 MP3 source
// ---------------------------------------------------------------------------

describe(
  "Feature: set-playlist-player, Property 7: Stats-Berechnung — rolleStats.total",
  () => {
    it(
      "rolleStats.total entspricht exakt der Anzahl Songs mit mind. 1 MP3-Quelle",
      () => {
        fc.assert(
          fc.property(setSongsArb, (setSongs) => {
            const stats = computeSetStats(setSongs);

            // Ground-truth: count songs whose audioQuellen array is non-empty
            const expectedTotal = setSongs.filter(
              (ss) => ss.song.audioQuellen.length > 0
            ).length;

            expect(stats.rolleStats.total).toBe(expectedTotal);
          }),
          PBT_CONFIG,
        );
      }
    );

    it(
      "playableSongCount entspricht ebenfalls exakt der Anzahl Songs mit mind. 1 MP3-Quelle",
      () => {
        fc.assert(
          fc.property(setSongsArb, (setSongs) => {
            const stats = computeSetStats(setSongs);

            const expectedPlayable = setSongs.filter(
              (ss) => ss.song.audioQuellen.length > 0
            ).length;

            expect(stats.playableSongCount).toBe(expectedPlayable);
            // playableSongCount and rolleStats.total must always be equal
            expect(stats.rolleStats.total).toBe(stats.playableSongCount);
          }),
          PBT_CONFIG,
        );
      }
    );
  }
);

// ---------------------------------------------------------------------------
// Property 7b: rolleStats[R] === count of playable songs with >= 1 source of rolle R
// ---------------------------------------------------------------------------

describe(
  "Feature: set-playlist-player, Property 7: Stats-Berechnung — rolleStats pro Rolle",
  () => {
    it(
      "rolleStats.standard entspricht exakt der Anzahl spielbarer Songs mit STANDARD-MP3",
      () => {
        fc.assert(
          fc.property(setSongsArb, (setSongs) => {
            const stats = computeSetStats(setSongs);

            const playableSongs = setSongs
              .map((ss) => ss.song)
              .filter((s) => s.audioQuellen.length > 0);

            const expectedStandard = playableSongs.filter((s) =>
              s.audioQuellen.some((q) => q.rolle === "STANDARD")
            ).length;

            expect(stats.rolleStats.standard).toBe(expectedStandard);
          }),
          PBT_CONFIG,
        );
      }
    );

    it(
      "rolleStats.instrumental entspricht exakt der Anzahl spielbarer Songs mit INSTRUMENTAL-MP3",
      () => {
        fc.assert(
          fc.property(setSongsArb, (setSongs) => {
            const stats = computeSetStats(setSongs);

            const playableSongs = setSongs
              .map((ss) => ss.song)
              .filter((s) => s.audioQuellen.length > 0);

            const expectedInstrumental = playableSongs.filter((s) =>
              s.audioQuellen.some((q) => q.rolle === "INSTRUMENTAL")
            ).length;

            expect(stats.rolleStats.instrumental).toBe(expectedInstrumental);
          }),
          PBT_CONFIG,
        );
      }
    );

    it(
      "rolleStats.referenzVokal entspricht exakt der Anzahl spielbarer Songs mit REFERENZ_VOKAL-MP3",
      () => {
        fc.assert(
          fc.property(setSongsArb, (setSongs) => {
            const stats = computeSetStats(setSongs);

            const playableSongs = setSongs
              .map((ss) => ss.song)
              .filter((s) => s.audioQuellen.length > 0);

            const expectedReferenzVokal = playableSongs.filter((s) =>
              s.audioQuellen.some((q) => q.rolle === "REFERENZ_VOKAL")
            ).length;

            expect(stats.rolleStats.referenzVokal).toBe(expectedReferenzVokal);
          }),
          PBT_CONFIG,
        );
      }
    );

    it(
      "alle drei Rollen-Counts sind niemals größer als rolleStats.total",
      () => {
        fc.assert(
          fc.property(setSongsArb, (setSongs) => {
            const stats = computeSetStats(setSongs);

            expect(stats.rolleStats.standard).toBeLessThanOrEqual(
              stats.rolleStats.total
            );
            expect(stats.rolleStats.instrumental).toBeLessThanOrEqual(
              stats.rolleStats.total
            );
            expect(stats.rolleStats.referenzVokal).toBeLessThanOrEqual(
              stats.rolleStats.total
            );
          }),
          PBT_CONFIG,
        );
      }
    );
  }
);

// ---------------------------------------------------------------------------
// Edge case: empty set
// ---------------------------------------------------------------------------

describe(
  "Feature: set-playlist-player, Property 7: Stats-Berechnung — Randfall leeres Set",
  () => {
    it("leeres Set hat alle Stats auf 0", () => {
      const stats = computeSetStats([]);

      expect(stats.rolleStats.total).toBe(0);
      expect(stats.rolleStats.standard).toBe(0);
      expect(stats.rolleStats.instrumental).toBe(0);
      expect(stats.rolleStats.referenzVokal).toBe(0);
      expect(stats.playableSongCount).toBe(0);
    });

    it("Set mit nur nicht-spielbaren Songs hat alle Rollen-Stats auf 0", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 36 }),
              kuenstler: fc.option(fc.string({ minLength: 1 }), { nil: null }),
              audioQuellen: fc.constant([] as { rolle: string }[]),
            }).map((song) => ({ song })),
            { minLength: 1, maxLength: 10 }
          ),
          (setSongs) => {
            const stats = computeSetStats(setSongs);

            expect(stats.rolleStats.total).toBe(0);
            expect(stats.rolleStats.standard).toBe(0);
            expect(stats.rolleStats.instrumental).toBe(0);
            expect(stats.rolleStats.referenzVokal).toBe(0);
          }
        ),
        PBT_CONFIG,
      );
    });
  }
);

// ---------------------------------------------------------------------------
// Property 8: Distinct-Artist-Zählung
// ---------------------------------------------------------------------------

/**
 * Feature: set-playlist-player
 * Property 8: Distinct-Artist-Zählung
 *
 * Für beliebige Song-Listen mit `null`, leeren Strings und Duplikaten zählt
 * `distinctArtistCount` nur eindeutige nicht-leere Werte.
 *
 * **Validates: Requirements 8.2**
 */

/**
 * Arbitrary for a kuenstler value that may be null, empty string, or a real name.
 * We explicitly include null and empty string to test the exclusion logic.
 */
const kuenstlerArb: fc.Arbitrary<string | null> = fc.oneof(
  fc.constant(null),
  fc.constant(""),
  fc.string({ minLength: 1, maxLength: 100 }),
);

/**
 * Arbitrary for a SetSongWithMp3Quellen row that exercises various kuenstler values.
 */
const setSongWithVariedKuenstlerArb: fc.Arbitrary<SetSongWithMp3Quellen> =
  fc
    .record({
      id: fc.string({ minLength: 1, maxLength: 36 }),
      kuenstler: kuenstlerArb,
      audioQuellen: fc.array(mp3QuelleArb, { minLength: 0, maxLength: 3 }),
    })
    .map((song) => ({ song }));

/**
 * Arbitrary for an array of SetSongWithMp3Quellen rows with varied kuenstler values.
 */
const setSongsWithVariedKuenstlerArb: fc.Arbitrary<SetSongWithMp3Quellen[]> =
  fc.array(setSongWithVariedKuenstlerArb, { minLength: 0, maxLength: 20 });

describe(
  "Feature: set-playlist-player, Property 8: Distinct-Artist-Zählung",
  () => {
    it(
      "distinctArtistCount entspricht exakt der Anzahl eindeutiger nicht-leerer kuenstler-Werte",
      () => {
        fc.assert(
          fc.property(setSongsWithVariedKuenstlerArb, (setSongs) => {
            const stats = computeSetStats(setSongs);

            // Ground-truth: collect non-null, non-empty kuenstler values and deduplicate
            const uniqueNonEmpty = new Set(
              setSongs
                .map((ss) => ss.song.kuenstler)
                .filter((k): k is string => k !== null && k !== "")
            );

            expect(stats.distinctArtistCount).toBe(uniqueNonEmpty.size);
          }),
          PBT_CONFIG,
        );
      }
    );

    it(
      "null kuenstler-Werte werden nicht gezählt",
      () => {
        fc.assert(
          fc.property(
            fc.array(
              fc
                .record({
                  id: fc.string({ minLength: 1, maxLength: 36 }),
                  kuenstler: fc.constant(null as string | null),
                  audioQuellen: fc.array(mp3QuelleArb, {
                    minLength: 0,
                    maxLength: 3,
                  }),
                })
                .map((song) => ({ song })),
              { minLength: 0, maxLength: 20 }
            ),
            (setSongs) => {
              const stats = computeSetStats(setSongs);

              // All kuenstler values are null → count must be 0
              expect(stats.distinctArtistCount).toBe(0);
            }
          ),
          PBT_CONFIG,
        );
      }
    );

    it(
      "leere String-Werte werden nicht gezählt",
      () => {
        fc.assert(
          fc.property(
            fc.array(
              fc
                .record({
                  id: fc.string({ minLength: 1, maxLength: 36 }),
                  kuenstler: fc.constant("" as string | null),
                  audioQuellen: fc.array(mp3QuelleArb, {
                    minLength: 0,
                    maxLength: 3,
                  }),
                })
                .map((song) => ({ song })),
              { minLength: 0, maxLength: 20 }
            ),
            (setSongs) => {
              const stats = computeSetStats(setSongs);

              // All kuenstler values are empty string → count must be 0
              expect(stats.distinctArtistCount).toBe(0);
            }
          ),
          PBT_CONFIG,
        );
      }
    );

    it(
      "Duplikate werden nur einmal gezählt",
      () => {
        fc.assert(
          fc.property(
            // Pick non-empty artist names (may contain duplicates), then build song list from them
            fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
              minLength: 1,
              maxLength: 30,
            }),
            (artistValues) => {
              const setSongs: SetSongWithMp3Quellen[] = artistValues.map(
                (kuenstler, i) => ({
                  song: {
                    id: `song-${i}`,
                    kuenstler,
                    audioQuellen: [],
                  },
                })
              );

              const stats = computeSetStats(setSongs);

              // Ground-truth: unique non-empty values in the input
              const expectedCount = new Set(
                artistValues.filter((k) => k !== "")
              ).size;
              expect(stats.distinctArtistCount).toBe(expectedCount);
            }
          ),
          PBT_CONFIG,
        );
      }
    );
  }
);

// ---------------------------------------------------------------------------
// Property 8: Distinct-Artist-Zählung
// ---------------------------------------------------------------------------

describe(
  "Feature: set-playlist-player, Property 8: Distinct-Artist-Zählung",
  () => {
    /**
     * Arbitrary for kuenstler values including null, empty string, and real strings.
     */
    const kuenstlerArb = fc.oneof(
      fc.constant(null),
      fc.constant(""),
      fc.string({ minLength: 1, maxLength: 50 }),
    );

    const songsWithKuenstlerArb = fc.array(
      fc.record({
        song: fc.record({
          id: fc.string({ minLength: 1, maxLength: 36 }),
          kuenstler: kuenstlerArb,
          audioQuellen: fc.constant([] as { rolle: string }[]),
        }),
      }),
      { minLength: 0, maxLength: 20 }
    );

    it(
      "distinctArtistCount zählt nur eindeutige nicht-leere kuenstler-Werte",
      () => {
        fc.assert(
          fc.property(songsWithKuenstlerArb, (setSongs) => {
            const stats = computeSetStats(setSongs);

            const expectedCount = new Set(
              setSongs
                .map((ss) => ss.song.kuenstler)
                .filter((k): k is string => k !== null && k !== "")
            ).size;

            expect(stats.distinctArtistCount).toBe(expectedCount);
          }),
          PBT_CONFIG,
        );
      }
    );

    it(
      "null und leere Strings werden nicht gezählt",
      () => {
        const onlyNullAndEmpty = [
          { song: { id: "1", kuenstler: null, audioQuellen: [] } },
          { song: { id: "2", kuenstler: "", audioQuellen: [] } },
          { song: { id: "3", kuenstler: null, audioQuellen: [] } },
        ] satisfies SetSongWithMp3Quellen[];

        const stats = computeSetStats(onlyNullAndEmpty);
        expect(stats.distinctArtistCount).toBe(0);
      }
    );

    it(
      "Duplikate werden nur einmal gezählt",
      () => {
        const withDuplicates = [
          { song: { id: "1", kuenstler: "Queen", audioQuellen: [] } },
          { song: { id: "2", kuenstler: "Queen", audioQuellen: [] } },
          { song: { id: "3", kuenstler: "Beatles", audioQuellen: [] } },
        ] satisfies SetSongWithMp3Quellen[];

        const stats = computeSetStats(withDuplicates);
        expect(stats.distinctArtistCount).toBe(2);
      }
    );
  }
);

// ---------------------------------------------------------------------------
// Property 9: Dauer-Formatierung
// ---------------------------------------------------------------------------

import { formatDuration } from "@/components/songs/set-card-footer";

describe(
  "Feature: set-playlist-player, Property 9: Dauer-Formatierung",
  () => {
    /**
     * Arbitrary for non-negative integers (0 to 2^31 - 1 ms ≈ ~24 days).
     * We cap at 2^31 to stay well within safe integer territory and avoid
     * floating-point edge cases.
     */
    const nonNegativeIntArb = fc.integer({ min: 0, max: 2 ** 31 - 1 });

    // -----------------------------------------------------------------------
    // Core property: output always matches /^\d+:\d{2}$/
    // -----------------------------------------------------------------------

    it(
      "für beliebige nicht-negative ganze Zahlen matcht der Rückgabewert /^\\d+:\\d{2}$/",
      () => {
        fc.assert(
          fc.property(nonNegativeIntArb, (ms) => {
            const result = formatDuration(ms);
            expect(result).toMatch(/^\d+:\d{2}$/);
          }),
          PBT_CONFIG,
        );
      }
    );

    // -----------------------------------------------------------------------
    // Seconds part is always zero-padded to 2 digits
    // -----------------------------------------------------------------------

    it(
      "der Sekundenanteil ist immer auf 2 Stellen nullaufgefüllt",
      () => {
        fc.assert(
          fc.property(nonNegativeIntArb, (ms) => {
            const result = formatDuration(ms);
            const colonIndex = result.indexOf(":");
            const secondsPart = result.slice(colonIndex + 1);
            // Seconds part must be exactly 2 characters
            expect(secondsPart).toHaveLength(2);
            // And must consist only of digits
            expect(secondsPart).toMatch(/^\d{2}$/);
            // And must represent a valid seconds value (0–59)
            const secondsValue = parseInt(secondsPart, 10);
            expect(secondsValue).toBeGreaterThanOrEqual(0);
            expect(secondsValue).toBeLessThanOrEqual(59);
          }),
          PBT_CONFIG,
        );
      }
    );

    // -----------------------------------------------------------------------
    // Minutes part is a non-negative integer (no leading zeros for > 0)
    // -----------------------------------------------------------------------

    it(
      "der Minutenanteil ist eine nicht-negative ganze Zahl ohne führende Nullen (außer bei 0)",
      () => {
        fc.assert(
          fc.property(nonNegativeIntArb, (ms) => {
            const result = formatDuration(ms);
            const colonIndex = result.indexOf(":");
            const minutesPart = result.slice(0, colonIndex);
            // Must be a valid non-negative integer representation
            expect(minutesPart).toMatch(/^\d+$/);
            const minutesValue = parseInt(minutesPart, 10);
            expect(minutesValue).toBeGreaterThanOrEqual(0);
            // No leading zeros (e.g. "05:30" is not valid — "5:30" is)
            if (minutesValue > 0) {
              expect(minutesPart[0]).not.toBe("0");
            }
          }),
          PBT_CONFIG,
        );
      }
    );

    // -----------------------------------------------------------------------
    // Specific examples from the spec
    // -----------------------------------------------------------------------

    it("2730000ms → '45:30'", () => {
      expect(formatDuration(2730000)).toBe("45:30");
    });

    it("3600000ms → '60:00'", () => {
      expect(formatDuration(3600000)).toBe("60:00");
    });

    it("90000ms → '1:30'", () => {
      expect(formatDuration(90000)).toBe("1:30");
    });

    it("0ms → '0:00'", () => {
      expect(formatDuration(0)).toBe("0:00");
    });

    // -----------------------------------------------------------------------
    // Edge case: sub-second values round down
    // -----------------------------------------------------------------------

    it(
      "Werte unter 1000ms werden zu '0:00' (Abrunden auf ganze Sekunden)",
      () => {
        expect(formatDuration(999)).toBe("0:00");
        expect(formatDuration(500)).toBe("0:00");
        expect(formatDuration(1)).toBe("0:00");
      }
    );

    // -----------------------------------------------------------------------
    // Monotonicity: more ms → same or more minutes
    // -----------------------------------------------------------------------

    it(
      "Monotonie: formatDuration(a) hat nie mehr Minuten als formatDuration(b) wenn a <= b (bei ganzzahligen Sekunden)",
      () => {
        // Use multiples of 1000 to avoid rounding effects
        const secondsArb = fc.tuple(
          fc.integer({ min: 0, max: 86400 }),  // up to 24h in seconds
          fc.integer({ min: 0, max: 86400 }),
        );

        fc.assert(
          fc.property(secondsArb, ([a, b]) => {
            const msA = a * 1000;
            const msB = b * 1000;
            if (msA > msB) return; // skip when a > b

            const resultA = formatDuration(msA);
            const resultB = formatDuration(msB);

            const minutesA = parseInt(resultA.split(":")[0], 10);
            const minutesB = parseInt(resultB.split(":")[0], 10);

            expect(minutesA).toBeLessThanOrEqual(minutesB);
          }),
          PBT_CONFIG,
        );
      }
    );
  }
);
