/**
 * Property 5: Set-Freigabe gewährt Zugriff auf alle Songs im Set
 * Property 6: Neuer Song in geteiltem Set erbt Zugriff
 * Property 18: Entfernen eines Songs aus geteiltem Set entzieht Zugriff
 *
 * **Validates: Requirements 2.1, 2.2, 9.5**
 */
// Feature: song-sharing, Properties 5, 6, 18: Set-Freigabe-Vererbung

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

// --- Prisma mock ---
vi.mock("@/lib/prisma", () => ({
  prisma: {
    song: { findUnique: vi.fn() },
    set: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    songFreigabe: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    setFreigabe: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { hatSongZugriff } from "@/lib/services/freigabe-service";

const mockPrisma = vi.mocked(prisma);

// --- Generators ---
const idArb = fc.uuid();
const songIdListArb = (min: number, max: number) =>
  fc.array(fc.uuid(), { minLength: min, maxLength: max });

/**
 * Property 5: Set-Freigabe gewährt Zugriff auf alle Songs im Set
 *
 * Für jedes Set mit beliebig vielen Songs, wenn das Set freigegeben wird,
 * soll der Empfänger Lesezugriff auf jeden einzelnen Song im Set haben.
 *
 * **Validates: Requirements 2.1**
 */
describe("Feature: song-sharing, Property 5: Set-Freigabe gewährt Zugriff auf alle Songs im Set", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("recipient has read access to every song in a shared set", async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        idArb,
        songIdListArb(1, 10),
        async (setId, eigentuemerId, empfaengerId, songIds) => {
          fc.pre(eigentuemerId !== empfaengerId);
          // Ensure all song IDs are unique
          fc.pre(new Set(songIds).size === songIds.length);

          for (const songId of songIds) {
            vi.clearAllMocks();

            // Mock: song belongs to the owner (not the recipient)
            (mockPrisma.song.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
              id: songId,
              userId: eigentuemerId,
            });

            // Mock: no direct SongFreigabe for this song
            (mockPrisma.songFreigabe.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

            // Mock: SetFreigabe exists — the song is in a shared set
            (mockPrisma.setFreigabe.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
              id: `set-freigabe-${setId}`,
              setId,
              empfaengerId,
              eigentuemerId,
            });

            const hasAccess = await hatSongZugriff(songId, empfaengerId);
            expect(hasAccess).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});


/**
 * Property 6: Neuer Song in geteiltem Set erbt Zugriff
 *
 * Für jedes geteilte Set, wenn der Eigentümer einen neuen Song zum Set hinzufügt,
 * soll der Empfänger automatisch Lesezugriff auf den neuen Song haben, ohne dass
 * eine separate Freigabe erstellt werden muss.
 *
 * **Validates: Requirements 2.2**
 */
describe("Feature: song-sharing, Property 6: Neuer Song in geteiltem Set erbt Zugriff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("newly added song in shared set is automatically accessible to recipient", async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        idArb,
        songIdListArb(1, 5),
        idArb,
        async (setId, eigentuemerId, empfaengerId, existingSongIds, newSongId) => {
          fc.pre(eigentuemerId !== empfaengerId);
          fc.pre(!existingSongIds.includes(newSongId));

          vi.clearAllMocks();

          // Mock: the new song belongs to the owner
          (mockPrisma.song.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: newSongId,
            userId: eigentuemerId,
          });

          // Mock: no direct SongFreigabe for the new song
          (mockPrisma.songFreigabe.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

          // Mock: SetFreigabe exists — the new song is now in the shared set
          // (Prisma dynamically checks set.songs.some.songId, so returning a result
          //  means the song is in the set and the set is shared)
          (mockPrisma.setFreigabe.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: `set-freigabe-${setId}`,
            setId,
            empfaengerId,
            eigentuemerId,
          });

          const hasAccess = await hatSongZugriff(newSongId, empfaengerId);
          expect(hasAccess).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});


/**
 * Property 18: Entfernen eines Songs aus geteiltem Set entzieht Zugriff
 *
 * Für jedes geteilte Set, wenn ein Song aus dem Set entfernt wird, soll der
 * Empfänger keinen Zugriff mehr auf diesen Song über die Set-Freigabe haben
 * (sofern keine separate Song-Freigabe besteht).
 *
 * **Validates: Requirements 9.5**
 */
describe("Feature: song-sharing, Property 18: Entfernen eines Songs aus geteiltem Set entzieht Zugriff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("removed song from shared set is no longer accessible via set freigabe", async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        idArb,
        idArb,
        async (setId, eigentuemerId, empfaengerId, removedSongId) => {
          fc.pre(eigentuemerId !== empfaengerId);

          vi.clearAllMocks();

          // Mock: the removed song still exists and belongs to the owner
          (mockPrisma.song.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: removedSongId,
            userId: eigentuemerId,
          });

          // Mock: no direct SongFreigabe for this song
          (mockPrisma.songFreigabe.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

          // Mock: SetFreigabe.findFirst returns null — the song is no longer in any shared set
          // (After removal, the Prisma query set.songs.some.songId won't match)
          (mockPrisma.setFreigabe.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

          const hasAccess = await hatSongZugriff(removedSongId, empfaengerId);
          expect(hasAccess).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});
