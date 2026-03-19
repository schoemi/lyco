import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

/**
 * Feature: song-sets
 * Property 12: Set-Detail enthält vollständige Daten
 * Property 13: Dashboard-Sets nach Aktualisierungsdatum sortiert
 *
 * Validates: Requirements 7.1, 7.2, 9.1, 9.2
 */

// --- Prisma mock ---
vi.mock("@/lib/prisma", () => ({
  prisma: {
    set: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    setSong: {
      create: vi.fn(),
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
      aggregate: vi.fn(),
    },
    song: {
      findUnique: vi.fn(),
    },
    session: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import { getSetDetail, listSets } from "@/lib/services/set-service";

const mockPrisma = vi.mocked(prisma);

// --- Generators ---
const userIdArb = fc.stringMatching(/^user-[a-z0-9]{4,12}$/);
const setIdArb = fc.stringMatching(/^set-[a-z0-9]{4,12}$/);

const songArb = fc.record({
  id: fc.stringMatching(/^song-[a-z0-9]{4,12}$/),
  titel: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
  kuenstler: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: null }),
  sprache: fc.option(fc.constantFrom("de", "en", "fr", "es"), { nil: null }),
  coverUrl: fc.option(fc.constant("https://example.com/cover.jpg"), { nil: null }),
});

const stropheProgressArb = fc.integer({ min: 0, max: 100 });

/**
 * Build a mock set with songs for prisma.set.findUnique (with include).
 * Each song has strophen with fortschritte and _count.sessions.
 */
function buildMockSetWithSongs(
  setId: string,
  userId: string,
  name: string,
  description: string | null,
  songs: Array<{
    id: string;
    titel: string;
    kuenstler: string | null;
    sprache: string | null;
    coverUrl: string | null;
    strophenProgress: number[];
    sessionCount: number;
    orderIndex: number;
  }>
) {
  const now = new Date();
  return {
    id: setId,
    name,
    description,
    userId,
    createdAt: now,
    updatedAt: now,
    songs: songs.map((s, idx) => ({
      id: `ss-${idx}`,
      setId,
      songId: s.id,
      orderIndex: s.orderIndex,
      createdAt: now,
      song: {
        id: s.id,
        titel: s.titel,
        kuenstler: s.kuenstler,
        sprache: s.sprache,
        coverUrl: s.coverUrl,
        userId,
        createdAt: now,
        updatedAt: now,
        strophen: s.strophenProgress.map((pct, si) => ({
          id: `strophe-${idx}-${si}`,
          name: `Strophe ${si + 1}`,
          orderIndex: si,
          songId: s.id,
          fortschritte: [{ id: `fort-${idx}-${si}`, prozent: pct, userId }],
        })),
        _count: { sessions: s.sessionCount },
      },
    })),
  };
}

/**
 * Property 12: Set-Detail enthält vollständige Daten
 *
 * Für jedes Set mit Songs soll die Detail-Antwort den Set-Namen, die Beschreibung,
 * die korrekte Song-Anzahl und für jeden Song den Titel, Künstler, Fortschritt,
 * Session-Anzahl und Status enthalten.
 *
 * **Validates: Requirements 7.1, 7.2, 9.2**
 */
describe("Property 12: Set-Detail enthält vollständige Daten", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("detail response contains set name, description, songCount, and complete song data", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        setIdArb,
        fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
        fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: null }),
        fc.array(
          fc.tuple(
            songArb,
            fc.array(stropheProgressArb, { minLength: 1, maxLength: 5 }),
            fc.integer({ min: 0, max: 50 })
          ),
          { minLength: 1, maxLength: 5 }
        ),
        async (userId, setId, setName, description, songTuples) => {
          vi.clearAllMocks();

          const songsInput = songTuples.map(([song, strophenPcts, sessionCount], idx) => ({
            ...song,
            strophenProgress: strophenPcts,
            sessionCount,
            orderIndex: idx,
          }));

          const mockSet = buildMockSetWithSongs(
            setId,
            userId,
            setName,
            description,
            songsInput
          );

          mockPrisma.set.findUnique.mockResolvedValueOnce(mockSet as any);

          const result = await getSetDetail(userId, setId);

          // Set-level fields
          expect(result.id).toBe(setId);
          expect(result.name).toBe(setName);
          expect(result.description).toBe(description);
          expect(result.songCount).toBe(songsInput.length);
          expect(result.songs).toHaveLength(songsInput.length);

          // Per-song fields
          for (let i = 0; i < songsInput.length; i++) {
            const input = songsInput[i];
            const song = result.songs[i];

            expect(song.id).toBe(input.id);
            expect(song.titel).toBe(input.titel);
            expect(song.kuenstler).toBe(input.kuenstler);
            expect(song.sprache).toBe(input.sprache);
            expect(song.coverUrl).toBe(input.coverUrl);
            expect(song.sessionCount).toBe(input.sessionCount);
            expect(song.orderIndex).toBe(input.orderIndex);

            // Verify progress calculation
            const expectedProgress = Math.round(
              input.strophenProgress.reduce((a: number, b: number) => a + b, 0) /
                input.strophenProgress.length
            );
            expect(song.progress).toBe(expectedProgress);

            // Verify status derivation
            if (expectedProgress === 0) {
              expect(song.status).toBe("neu");
            } else if (expectedProgress === 100) {
              expect(song.status).toBe("gelernt");
            } else {
              expect(song.status).toBe("aktiv");
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Property 13: Dashboard-Sets nach Aktualisierungsdatum sortiert
 *
 * Für jeden Nutzer mit mehreren Sets soll die Liste der Sets absteigend nach
 * dem letzten Aktualisierungsdatum sortiert sein.
 *
 * **Validates: Requirements 9.1**
 */
describe("Property 13: Dashboard-Sets nach Aktualisierungsdatum sortiert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listSets returns sets ordered by updatedAt descending", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        fc.array(
          fc.record({
            id: fc.stringMatching(/^set-[a-z0-9]{4,12}$/),
            name: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
            description: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
          }),
          { minLength: 2, maxLength: 5 }
        ).filter((sets) => new Set(sets.map((s) => s.id)).size === sets.length),
        async (userId, setsInput) => {
          vi.clearAllMocks();

          // Assign random updatedAt dates
          const baseTime = Date.now();
          const setsWithDates = setsInput.map((s, i) => ({
            ...s,
            updatedAt: new Date(baseTime - i * 100000),
            createdAt: new Date(baseTime - 1000000),
          }));

          // Prisma returns them already sorted by updatedAt desc (as per the orderBy in listSets)
          const sortedSets = [...setsWithDates].sort(
            (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
          );

          // Mock findMany to return sets in the correct order (simulating Prisma's orderBy)
          mockPrisma.set.findMany.mockResolvedValueOnce(
            sortedSets.map((s) => ({
              id: s.id,
              name: s.name,
              description: s.description,
              userId,
              createdAt: s.createdAt,
              updatedAt: s.updatedAt,
              _count: { songs: 0 },
              songs: [],
            })) as any
          );

          // Mock session.findFirst for each set (no sessions)
          for (let i = 0; i < sortedSets.length; i++) {
            mockPrisma.session.findFirst.mockResolvedValueOnce(null);
          }

          const result = await listSets(userId);

          expect(result).toHaveLength(sortedSets.length);

          // Verify the order matches the sorted order
          for (let i = 0; i < sortedSets.length; i++) {
            expect(result[i].id).toBe(sortedSets[i].id);
            expect(result[i].name).toBe(sortedSets[i].name);
            expect(result[i].description).toBe(sortedSets[i].description);
          }

          // Verify findMany was called with orderBy updatedAt desc
          expect(mockPrisma.set.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
              where: { userId },
              orderBy: { updatedAt: "desc" },
            })
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
