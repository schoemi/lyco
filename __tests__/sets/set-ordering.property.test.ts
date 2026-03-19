import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

/**
 * Feature: song-sets
 * Property 10: Neuer Song erhält höchsten orderIndex + 1
 * Property 11: Reihenfolge-Änderung Round-Trip
 *
 * Validates: Requirements 6.2, 6.3, 6.4
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
  addSongToSet,
  reorderSetSongs,
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

/**
 * Property 10: Neuer Song erhält höchsten orderIndex + 1
 *
 * Für jedes Set mit bestehenden Songs, wenn ein neuer Song hinzugefügt wird,
 * soll dessen orderIndex gleich dem höchsten bestehenden orderIndex + 1 sein.
 *
 * **Validates: Requirements 6.4**
 */
describe("Property 10: Neuer Song erhält höchsten orderIndex + 1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("new song gets max orderIndex + 1", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        setIdArb,
        songIdArb,
        fc.integer({ min: 0, max: 1000 }),
        async (userId, setId, songId, existingMaxOrder) => {
          vi.clearAllMocks();

          // Mock ownership check
          mockPrisma.set.findUnique.mockResolvedValueOnce(
            makeFakeSet(setId, userId) as any
          );

          // Mock aggregate returning the current max orderIndex
          mockPrisma.setSong.aggregate.mockResolvedValueOnce({
            _max: { orderIndex: existingMaxOrder },
          } as any);

          const expectedOrderIndex = existingMaxOrder + 1;

          // Mock setSong.create
          mockPrisma.setSong.create.mockResolvedValueOnce({
            id: "ss-new",
            setId,
            songId,
            orderIndex: expectedOrderIndex,
            createdAt: new Date(),
          } as any);

          await addSongToSet(userId, setId, songId);

          // Verify create was called with the correct orderIndex
          expect(mockPrisma.setSong.create).toHaveBeenCalledWith({
            data: {
              setId,
              songId,
              orderIndex: expectedOrderIndex,
            },
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it("first song in empty set gets orderIndex 0", async () => {
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

          // Mock aggregate returning null (no existing songs)
          mockPrisma.setSong.aggregate.mockResolvedValueOnce({
            _max: { orderIndex: null },
          } as any);

          // Mock setSong.create
          mockPrisma.setSong.create.mockResolvedValueOnce({
            id: "ss-first",
            setId,
            songId,
            orderIndex: 0,
            createdAt: new Date(),
          } as any);

          await addSongToSet(userId, setId, songId);

          // First song should get orderIndex 0 (null + 1 via the -1 default)
          expect(mockPrisma.setSong.create).toHaveBeenCalledWith({
            data: {
              setId,
              songId,
              orderIndex: 0,
            },
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 11: Reihenfolge-Änderung Round-Trip
 *
 * Für jedes Set mit Songs und jede gültige Permutation der orderIndex-Werte,
 * wenn die Reihenfolge aktualisiert und anschließend gelesen wird, sollen die
 * Songs in der neuen Reihenfolge zurückgegeben werden.
 *
 * **Validates: Requirements 6.2, 6.3**
 */
describe("Property 11: Reihenfolge-Änderung Round-Trip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reordering persists the new order via transaction", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        setIdArb,
        fc.array(songIdArb, { minLength: 2, maxLength: 6 }).chain((songIds) => {
          // Generate a permutation of indices for the songs
          const uniqueSongIds = [...new Set(songIds)];
          if (uniqueSongIds.length < 2) {
            return fc.constant(null);
          }
          return fc.shuffledSubarray(
            uniqueSongIds.map((_, i) => i),
            { minLength: uniqueSongIds.length, maxLength: uniqueSongIds.length }
          ).map((permutedIndices) => ({
            songIds: uniqueSongIds,
            items: uniqueSongIds.map((id, i) => ({
              songId: id,
              orderIndex: permutedIndices[i],
            })),
          }));
        }),
        async (userId, setId, reorderData) => {
          if (reorderData === null) return; // skip if not enough unique songs

          vi.clearAllMocks();

          // Mock ownership check
          mockPrisma.set.findUnique.mockResolvedValueOnce(
            makeFakeSet(setId, userId) as any
          );

          // Mock $transaction to execute all updateMany calls
          mockPrisma.$transaction.mockResolvedValueOnce(
            reorderData.items.map(() => ({ count: 1 }))
          );

          await reorderSetSongs(userId, setId, reorderData.items);

          // Verify $transaction was called with the correct updateMany operations
          expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);

          const transactionArg = mockPrisma.$transaction.mock.calls[0][0];
          expect(transactionArg).toHaveLength(reorderData.items.length);

          // Verify each item was passed to updateMany
          for (const item of reorderData.items) {
            expect(mockPrisma.setSong.updateMany).toHaveBeenCalledWith({
              where: { setId, songId: item.songId },
              data: { orderIndex: item.orderIndex },
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
