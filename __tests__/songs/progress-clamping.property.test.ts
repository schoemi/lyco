/**
 * Property 12: Fortschritt Round-Trip mit Begrenzung
 *
 * Für jeden ganzzahligen Wert: Nach dem Aktualisieren des Fortschritts einer Strophe
 * über `updateProgress` muss der gespeicherte Wert auf den Bereich [0, 100] begrenzt
 * sein. Das anschließende Abrufen über `getSongProgress` muss den begrenzten Wert
 * zurückgeben.
 *
 * **Validates: Requirements 8.1, 8.3**
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

// --- In-memory store ---
interface StoredFortschritt {
  id: string;
  userId: string;
  stropheId: string;
  prozent: number;
  updatedAt: Date;
}

let fortschritte: StoredFortschritt[] = [];
let idCounter = 0;

function nextId(): string {
  return `id-${++idCounter}`;
}

function resetDb() {
  fortschritte = [];
  idCounter = 0;
}

// --- Mock Prisma ---
const { mockPrisma } = vi.hoisted(() => {
  const _mockStrophe = { findUnique: vi.fn(), findMany: vi.fn() };
  const _mockFortschritt = { upsert: vi.fn() };
  const _mockSong = { findUnique: vi.fn() };

  const _mockPrisma: Record<string, unknown> = {
    strophe: _mockStrophe,
    fortschritt: _mockFortschritt,
    song: _mockSong,
  };

  return { mockPrisma: _mockPrisma };
});

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { updateProgress, getSongProgress } from "@/lib/services/progress-service";
import { prisma } from "@/lib/prisma";

// --- Mock setup ---
function setupMocks(userId: string, stropheId: string, songId: string) {
  const mockedStropheFindUnique = vi.mocked(prisma.strophe.findUnique);
  const mockedStropheFindMany = vi.mocked(prisma.strophe.findMany);
  const mockedFortschrittUpsert = vi.mocked(prisma.fortschritt.upsert);
  const mockedSongFindUnique = vi.mocked(prisma.song.findUnique);

  mockedStropheFindUnique.mockImplementation(async () => {
    return {
      id: stropheId,
      songId,
      name: "Strophe 1",
      orderIndex: 0,
      song: { userId, id: songId },
    } as any;
  });

  mockedFortschrittUpsert.mockImplementation(async (args: any) => {
    const existing = fortschritte.find(
      (f) =>
        f.userId === args.where.userId_stropheId.userId &&
        f.stropheId === args.where.userId_stropheId.stropheId
    );
    if (existing) {
      existing.prozent = args.update.prozent;
      existing.updatedAt = new Date();
      return { ...existing } as any;
    }
    const fort: StoredFortschritt = {
      id: nextId(),
      userId: args.create.userId,
      stropheId: args.create.stropheId,
      prozent: args.create.prozent,
      updatedAt: new Date(),
    };
    fortschritte.push(fort);
    return { ...fort } as any;
  });

  mockedSongFindUnique.mockImplementation(async () => {
    return { id: songId, userId } as any;
  });

  mockedStropheFindMany.mockImplementation(async () => {
    return [
      {
        id: stropheId,
        name: "Strophe 1",
        orderIndex: 0,
        songId,
        fortschritte: fortschritte.filter(
          (f) => f.stropheId === stropheId && f.userId === userId
        ),
      },
    ] as any;
  });
}

describe("Property 12: Fortschritt Round-Trip mit Begrenzung", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDb();
  });

  it("updateProgress begrenzt Werte auf [0, 100], getSongProgress liefert begrenzten Wert", () => {
    return fc.assert(
      fc.asyncProperty(
        fc.integer({ min: -200, max: 300 }),
        async (rawProzent) => {
          vi.clearAllMocks();
          resetDb();

          const userId = "user-1";
          const stropheId = "strophe-1";
          const songId = "song-1";
          setupMocks(userId, stropheId, songId);

          const expected = Math.max(0, Math.min(100, Math.round(rawProzent)));

          // Update progress
          const result = await updateProgress(userId, stropheId, rawProzent);
          expect(result.prozent).toBe(expected);

          // Retrieve progress
          const progress = await getSongProgress(userId, songId);
          expect(progress).toHaveLength(1);
          expect(progress[0].prozent).toBe(expected);
        }
      ),
      { numRuns: 20 }
    );
  });
});
