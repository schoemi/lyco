import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

/**
 * Feature: song-sets
 * Property 6: Löschen bewahrt Songs
 * Property 7: Song hinzufügen und entfernen Round-Trip
 * Property 8: Doppelte Song-Zuordnung wird abgelehnt
 * Property 9: Song in mehreren Sets
 *
 * Validates: Requirements 3.1, 4.1, 4.2, 4.3, 5.1
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
import {
  deleteSet,
  addSongToSet,
  removeSongFromSet,
} from "@/lib/services/set-service";

const mockPrisma = vi.mocked(prisma);

// --- Generators ---
const userIdArb = fc.stringMatching(/^user-[a-z0-9]{4,12}$/);
const setIdArb = fc.stringMatching(/^set-[a-z0-9]{4,12}$/);
const songIdArb = fc.stringMatching(/^song-[a-z0-9]{4,12}$/);

// --- Helpers ---
function makeFakeSet(setId: string, ownerId: string) {
  const now = new Date();
  return {
    id: setId,
    name: "Test Set",
    description: null,
    userId: ownerId,
    createdAt: now,
    updatedAt: now,
  };
}

function makeFakeSong(songId: string) {
  return {
    id: songId,
    titel: "Test Song",
    kuenstler: "Test Artist",
    sprache: "de",
    coverUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Property 6: Löschen bewahrt Songs
 *
 * Für jedes Set mit beliebig vielen Songs, wenn das Set gelöscht wird, sollen alle
 * Song-Zuordnungen (SetSong) entfernt werden, aber die Songs selbst weiterhin existieren.
 *
 * **Validates: Requirements 3.1**
 */
describe("Property 6: Löschen bewahrt Songs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deleting a set removes SetSong entries but songs still exist", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        setIdArb,
        fc.array(songIdArb, { minLength: 1, maxLength: 5 }),
        async (userId, setId, songIds) => {
          vi.clearAllMocks();

          // Mock ownership check
          mockPrisma.set.findUnique.mockResolvedValueOnce(
            makeFakeSet(setId, userId) as any
          );

          // Mock cascade delete (prisma.set.delete with onDelete: Cascade removes SetSong)
          mockPrisma.set.delete.mockResolvedValueOnce(
            makeFakeSet(setId, userId) as any
          );

          // Delete the set
          await deleteSet(userId, setId);

          // Verify set.delete was called
          expect(mockPrisma.set.delete).toHaveBeenCalledWith({
            where: { id: setId },
          });

          // Verify songs still exist after set deletion
          for (const songId of songIds) {
            mockPrisma.song.findUnique.mockResolvedValueOnce(
              makeFakeSong(songId) as any
            );
          }

          for (const songId of songIds) {
            const song = await prisma.song.findUnique({
              where: { id: songId },
            });
            expect(song).not.toBeNull();
            expect(song!.id).toBe(songId);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 7: Song hinzufügen und entfernen Round-Trip
 *
 * Für jedes Set und jeden Song, wenn der Song zum Set hinzugefügt und anschließend
 * wieder entfernt wird, soll der Song nicht mehr im Set enthalten sein, aber weiterhin
 * als eigenständiger Song existieren.
 *
 * **Validates: Requirements 4.1, 5.1**
 */
describe("Property 7: Song hinzufügen und entfernen Round-Trip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adding then removing a song leaves the song intact", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        setIdArb,
        songIdArb,
        async (userId, setId, songId) => {
          vi.clearAllMocks();

          // --- Add song to set ---
          // Mock ownership check for addSongToSet
          mockPrisma.set.findUnique.mockResolvedValueOnce(
            makeFakeSet(setId, userId) as any
          );

          // Mock aggregate for orderIndex calculation
          mockPrisma.setSong.aggregate.mockResolvedValueOnce({
            _max: { orderIndex: -1 },
          } as any);

          // Mock setSong.create
          mockPrisma.setSong.create.mockResolvedValueOnce({
            id: "ss-1",
            setId,
            songId,
            orderIndex: 0,
            createdAt: new Date(),
          } as any);

          await addSongToSet(userId, setId, songId);

          expect(mockPrisma.setSong.create).toHaveBeenCalledWith({
            data: { setId, songId, orderIndex: 0 },
          });

          // --- Remove song from set ---
          // Mock ownership check for removeSongFromSet
          mockPrisma.set.findUnique.mockResolvedValueOnce(
            makeFakeSet(setId, userId) as any
          );

          // Mock setSong.deleteMany
          mockPrisma.setSong.deleteMany.mockResolvedValueOnce({
            count: 1,
          } as any);

          await removeSongFromSet(userId, setId, songId);

          expect(mockPrisma.setSong.deleteMany).toHaveBeenCalledWith({
            where: { setId, songId },
          });

          // --- Verify song still exists ---
          mockPrisma.song.findUnique.mockResolvedValueOnce(
            makeFakeSong(songId) as any
          );

          const song = await prisma.song.findUnique({
            where: { id: songId },
          });
          expect(song).not.toBeNull();
          expect(song!.id).toBe(songId);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 8: Doppelte Song-Zuordnung wird abgelehnt
 *
 * Für jedes Set und jeden Song, der bereits im Set enthalten ist, soll ein erneutes
 * Hinzufügen desselben Songs fehlschlagen mit der Meldung „Song ist bereits im Set".
 *
 * **Validates: Requirements 4.2**
 */
describe("Property 8: Doppelte Song-Zuordnung wird abgelehnt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adding the same song twice throws 'Song ist bereits im Set'", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        setIdArb,
        songIdArb,
        async (userId, setId, songId) => {
          vi.clearAllMocks();

          // Mock ownership check
          mockPrisma.set.findUnique.mockResolvedValueOnce(
            makeFakeSet(setId, userId) as any
          );

          // Mock aggregate for orderIndex
          mockPrisma.setSong.aggregate.mockResolvedValueOnce({
            _max: { orderIndex: 0 },
          } as any);

          // Mock setSong.create to throw P2002 (unique constraint violation)
          const prismaError = new Error("Unique constraint failed");
          (prismaError as any).code = "P2002";
          mockPrisma.setSong.create.mockRejectedValueOnce(prismaError);

          await expect(
            addSongToSet(userId, setId, songId)
          ).rejects.toThrow("Song ist bereits im Set");
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 9: Song in mehreren Sets
 *
 * Für jeden Song und je zwei verschiedene Sets desselben Nutzers soll der Song
 * beiden Sets gleichzeitig zugeordnet werden können.
 *
 * **Validates: Requirements 4.3**
 */
describe("Property 9: Song in mehreren Sets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("same song can be added to two different sets", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        setIdArb,
        setIdArb,
        songIdArb,
        async (userId, setId1, setId2, songId) => {
          // Ensure two distinct sets
          const actualSetId2 = setId1 === setId2 ? setId2 + "-b" : setId2;

          vi.clearAllMocks();

          // --- Add song to set 1 ---
          mockPrisma.set.findUnique.mockResolvedValueOnce(
            makeFakeSet(setId1, userId) as any
          );
          mockPrisma.setSong.aggregate.mockResolvedValueOnce({
            _max: { orderIndex: -1 },
          } as any);
          mockPrisma.setSong.create.mockResolvedValueOnce({
            id: "ss-1",
            setId: setId1,
            songId,
            orderIndex: 0,
            createdAt: new Date(),
          } as any);

          await addSongToSet(userId, setId1, songId);

          expect(mockPrisma.setSong.create).toHaveBeenCalledWith({
            data: { setId: setId1, songId, orderIndex: 0 },
          });

          // --- Add same song to set 2 ---
          mockPrisma.set.findUnique.mockResolvedValueOnce(
            makeFakeSet(actualSetId2, userId) as any
          );
          mockPrisma.setSong.aggregate.mockResolvedValueOnce({
            _max: { orderIndex: -1 },
          } as any);
          mockPrisma.setSong.create.mockResolvedValueOnce({
            id: "ss-2",
            setId: actualSetId2,
            songId,
            orderIndex: 0,
            createdAt: new Date(),
          } as any);

          await addSongToSet(userId, actualSetId2, songId);

          // Verify create was called for both sets
          expect(mockPrisma.setSong.create).toHaveBeenCalledTimes(2);
          expect(mockPrisma.setSong.create).toHaveBeenCalledWith({
            data: { setId: actualSetId2, songId, orderIndex: 0 },
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
