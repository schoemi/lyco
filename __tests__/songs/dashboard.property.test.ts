/**
 * Property 16: Dashboard-Aggregation
 *
 * Für jeden Benutzer mit Sets, Songs, Sessions und Fortschritten:
 * Dashboard liefert alle Sets mit Songs, Fortschritt und Session-Anzahl;
 * Aggregatwerte sind konsistent mit Einzelwerten.
 *
 * **Validates: Requirements 10.1, 10.2**
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

// --- Hoisted mocks ---
const { mockAuth, mockListSongs, mockGetAverageProgress, mockGetTotalSessionCount, mockSetFindMany, mockGetFaelligeAnzahl } = vi.hoisted(() => {
  return {
    mockAuth: vi.fn(),
    mockListSongs: vi.fn(),
    mockGetAverageProgress: vi.fn(),
    mockGetTotalSessionCount: vi.fn(),
    mockSetFindMany: vi.fn(),
    mockGetFaelligeAnzahl: vi.fn(),
  };
});

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/services/song-service", () => ({
  listSongs: mockListSongs,
}));

vi.mock("@/lib/services/progress-service", () => ({
  getAverageProgress: mockGetAverageProgress,
}));

vi.mock("@/lib/services/session-service", () => ({
  getTotalSessionCount: mockGetTotalSessionCount,
}));

vi.mock("@/lib/services/spaced-repetition-service", () => ({
  getFaelligeAnzahl: mockGetFaelligeAnzahl,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    set: {
      findMany: mockSetFindMany,
    },
  },
}));

import { GET as dashboardGET } from "@/app/api/dashboard/route";
import type { SongWithProgress, DashboardData } from "../../src/types/song";

// --- Arbitraries ---

/** Generate a song with progress */
const songArb = fc.record({
  id: fc.uuid(),
  titel: fc.string({ minLength: 1, maxLength: 50 }),
  kuenstler: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: null }),
  sprache: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
  emotionsTags: fc.array(fc.string({ minLength: 1, maxLength: 15 }), { minLength: 0, maxLength: 3 }),
  progress: fc.integer({ min: 0, max: 100 }),
  sessionCount: fc.integer({ min: 0, max: 100 }),
});

/** Generate a set with a subset of song IDs */
const setWithSongsArb = (songIds: string[]) =>
  fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 30 }),
  }).map((s) => ({
    ...s,
    songIds: songIds.length > 0
      ? songIds.slice(0, Math.max(1, Math.floor(Math.random() * songIds.length)))
      : [],
  }));

/** Generate a full dashboard scenario: songs + sets referencing those songs */
const dashboardScenarioArb = fc
  .array(songArb, { minLength: 1, maxLength: 8 })
  .chain((songs) =>
    fc
      .array(
        fc.record({
          id: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 30 }),
          songIndices: fc.array(
            fc.integer({ min: 0, max: songs.length - 1 }),
            { minLength: 0, maxLength: songs.length }
          ).map((indices) => [...new Set(indices)]),
        }),
        { minLength: 1, maxLength: 5 }
      )
      .map((sets) => ({ songs, sets }))
  );

describe("Property 16: Dashboard-Aggregation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    });
  });

  it("Dashboard response contains all sets, correct songs, and consistent aggregate values", () => {
    return fc.assert(
      fc.asyncProperty(dashboardScenarioArb, async ({ songs, sets }) => {
        // Build SongWithProgress array
        const allSongs: SongWithProgress[] = songs.map((s) => {
          const status: "neu" | "aktiv" | "gelernt" =
            s.progress === 0 ? "neu" : s.progress === 100 ? "gelernt" : "aktiv";
          return {
            id: s.id,
            titel: s.titel,
            kuenstler: s.kuenstler,
            sprache: s.sprache,
            emotionsTags: s.emotionsTags,
            progress: s.progress,
            sessionCount: s.sessionCount,
            status,
          };
        });

        // Compute expected aggregates
        const expectedTotalSongs = allSongs.length;
        const expectedTotalSessions = 42; // arbitrary mock value
        const expectedAverageProgress = 55; // arbitrary mock value

        // Build prisma set.findMany return value
        const prismaSets = sets.map((set) => ({
          id: set.id,
          name: set.name,
          userId: "user-1",
          createdAt: new Date(),
          updatedAt: new Date(),
          songs: set.songIndices.map((idx) => ({
            song: { id: songs[idx].id },
          })),
        }));

        // Setup mocks
        mockListSongs.mockResolvedValue(allSongs);
        mockSetFindMany.mockResolvedValue(prismaSets);
        mockGetAverageProgress.mockResolvedValue(expectedAverageProgress);
        mockGetTotalSessionCount.mockResolvedValue(expectedTotalSessions);
        mockGetFaelligeAnzahl.mockResolvedValue(3);

        // Call the dashboard GET handler
        const response = await dashboardGET();
        expect(response.status).toBe(200);

        const data: DashboardData = await response.json();

        // 1. Dashboard response contains all sets
        expect(data.sets.length).toBe(sets.length);

        // 2. Each set contains the correct songs
        for (let i = 0; i < sets.length; i++) {
          const expectedSongIds = sets[i].songIndices.map((idx) => songs[idx].id);
          const actualSongIds = data.sets[i].songs.map((s) => s.id);
          expect(actualSongIds.sort()).toEqual(expectedSongIds.sort());
        }

        // 3. totalSongs matches the number of songs returned by listSongs
        expect(data.totalSongs).toBe(expectedTotalSongs);

        // 4. totalSessions matches getTotalSessionCount
        expect(data.totalSessions).toBe(expectedTotalSessions);

        // 5. averageProgress matches getAverageProgress
        expect(data.averageProgress).toBe(expectedAverageProgress);

        // 6. allSongs contains all songs
        expect(data.allSongs.length).toBe(expectedTotalSongs);
        const allSongIds = data.allSongs.map((s) => s.id).sort();
        const expectedAllSongIds = allSongs.map((s) => s.id).sort();
        expect(allSongIds).toEqual(expectedAllSongIds);
      }),
      { numRuns: 20 }
    );
  });
});
