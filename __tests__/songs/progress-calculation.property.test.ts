/**
 * Property 13: Fortschritts-Berechnung
 *
 * Für jeden Song mit N Strophen und zufälligen Fortschrittswerten (0–100) je Strophe:
 * `getOverallSongProgress` muss das arithmetische Mittel aller Strophen-Fortschritte
 * zurückgeben (gerundet). `getAverageProgress` über alle Songs muss das arithmetische
 * Mittel aller Song-Fortschritte zurückgeben.
 *
 * **Validates: Requirements 8.2, 8.5**
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

// --- In-memory store ---
interface StoredSong {
  id: string;
  userId: string;
}

interface StoredStrophe {
  id: string;
  name: string;
  orderIndex: number;
  songId: string;
  fortschritte: { prozent: number; userId: string }[];
}

let songs: StoredSong[] = [];
let strophen: StoredStrophe[] = [];
let idCounter = 0;

function nextId(): string {
  return `id-${++idCounter}`;
}

function resetDb() {
  songs = [];
  strophen = [];
  idCounter = 0;
}

// --- Mock Prisma ---
const { mockPrisma } = vi.hoisted(() => {
  const _mockSong = { findUnique: vi.fn(), findMany: vi.fn() };
  const _mockStrophe = { findMany: vi.fn() };
  const _mockSession = { count: vi.fn() };

  const _mockPrisma: Record<string, unknown> = {
    song: _mockSong,
    strophe: _mockStrophe,
    session: _mockSession,
  };

  return { mockPrisma: _mockPrisma };
});

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import {
  getOverallSongProgress,
  getAverageProgress,
} from "@/lib/services/progress-service";
import { prisma } from "@/lib/prisma";

// --- Mock setup ---
function setupMocks(userId: string) {
  const mockedSongFindUnique = vi.mocked(prisma.song.findUnique);
  const mockedSongFindMany = vi.mocked(prisma.song.findMany);
  const mockedStropheFindMany = vi.mocked(prisma.strophe.findMany);
  const mockedSessionCount = vi.mocked(prisma.session.count);

  mockedSongFindUnique.mockImplementation(async (args: any) => {
    const song = songs.find((s) => s.id === args.where.id);
    if (!song) return null as any;
    return { ...song } as any;
  });

  mockedSongFindMany.mockImplementation(async (args: any) => {
    return songs
      .filter((s) => s.userId === args.where.userId)
      .map((s) => ({ id: s.id })) as any;
  });

  mockedStropheFindMany.mockImplementation(async (args: any) => {
    const songId = args.where.songId;
    return strophen
      .filter((s) => s.songId === songId)
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((s) => ({
        ...s,
        fortschritte: s.fortschritte.filter((f) => f.userId === userId),
      })) as any;
  });

  mockedSessionCount.mockResolvedValue(0);
}

describe("Property 13: Fortschritts-Berechnung", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDb();
  });

  it("getOverallSongProgress liefert arithmetisches Mittel (gerundet)", () => {
    return fc.assert(
      fc.asyncProperty(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 5 }),
        async (progressValues) => {
          vi.clearAllMocks();
          resetDb();

          const userId = "user-1";
          const songId = nextId();
          songs.push({ id: songId, userId });

          for (let i = 0; i < progressValues.length; i++) {
            strophen.push({
              id: nextId(),
              name: `Strophe ${i}`,
              orderIndex: i,
              songId,
              fortschritte: [{ prozent: progressValues[i], userId }],
            });
          }

          setupMocks(userId);

          const result = await getOverallSongProgress(userId, songId);
          const expectedMean = Math.round(
            progressValues.reduce((a, b) => a + b, 0) / progressValues.length
          );
          expect(result).toBe(expectedMean);
        }
      ),
      { numRuns: 20 }
    );
  });

  it("getAverageProgress liefert Mittel aller Song-Fortschritte", () => {
    return fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 3 }),
          { minLength: 1, maxLength: 3 }
        ),
        async (songProgressArrays) => {
          vi.clearAllMocks();
          resetDb();

          const userId = "user-1";

          const songOveralls: number[] = [];
          for (const progressValues of songProgressArrays) {
            const songId = nextId();
            songs.push({ id: songId, userId });

            for (let i = 0; i < progressValues.length; i++) {
              strophen.push({
                id: nextId(),
                name: `Strophe ${i}`,
                orderIndex: i,
                songId,
                fortschritte: [{ prozent: progressValues[i], userId }],
              });
            }

            const mean = Math.round(
              progressValues.reduce((a, b) => a + b, 0) / progressValues.length
            );
            songOveralls.push(mean);
          }

          setupMocks(userId);

          const result = await getAverageProgress(userId);
          const expectedAvg = Math.round(
            songOveralls.reduce((a, b) => a + b, 0) / songOveralls.length
          );
          expect(result).toBe(expectedAvg);
        }
      ),
      { numRuns: 20 }
    );
  });
});
