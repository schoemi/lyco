/**
 * Property 19: Kaskadierendes Löschen entfernt alle Freigaben
 * Property 20: Löschen eines Songs aus geteiltem Set bewahrt Set-Freigabe
 *
 * **Validates: Requirements 10.1, 10.2, 10.3**
 */
// Feature: song-sharing, Properties 19, 20: Kaskadierendes Löschen

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

// --- Prisma mock ---
vi.mock("@/lib/prisma", () => ({
  prisma: {
    song: { findUnique: vi.fn(), delete: vi.fn() },
    set: { findUnique: vi.fn(), delete: vi.fn() },
    songFreigabe: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
    setFreigabe: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
    setSong: { deleteMany: vi.fn() },
  },
}));

// --- Email service mock (imported by freigabe-service) ---
vi.mock("@/lib/services/email-service", () => ({
  sendFreigabeNotification: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { deleteSong } from "@/lib/services/song-service";
import { deleteSet, removeSongFromSet } from "@/lib/services/set-service";
import { hatSongZugriff, hatSetZugriff } from "@/lib/services/freigabe-service";

const mockPrisma = vi.mocked(prisma);

// --- Generators ---
const idArb = fc.uuid();
const empfaengerListArb = (min: number, max: number) =>
  fc.array(fc.uuid(), { minLength: min, maxLength: max });


/**
 * Property 19: Kaskadierendes Löschen entfernt alle Freigaben
 *
 * Für jeden Song (oder Set) mit beliebig vielen Freigaben, wenn der Song
 * (oder das Set) gelöscht wird, sollen alle zugehörigen Freigaben automatisch
 * gelöscht werden.
 *
 * **Validates: Requirements 10.1, 10.2**
 */
describe("Feature: song-sharing, Property 19: Kaskadierendes Löschen entfernt alle Freigaben", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deleting a song triggers prisma.song.delete and afterwards no recipient has access", async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        empfaengerListArb(1, 8),
        async (songId, eigentuemerId, empfaengerIds) => {
          // Ensure owner is not among recipients and recipients are unique
          const uniqueEmpfaenger = [...new Set(empfaengerIds)].filter(
            (id) => id !== eigentuemerId
          );
          fc.pre(uniqueEmpfaenger.length >= 1);
          vi.clearAllMocks();

          // Mock: song exists and belongs to owner
          (mockPrisma.song.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: songId,
            userId: eigentuemerId,
          });

          // Mock: delete succeeds (cascade happens at DB level)
          (mockPrisma.song.delete as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: songId,
          });

          // Step 1: Delete the song
          await deleteSong(eigentuemerId, songId);

          // Verify prisma.song.delete was called
          expect(mockPrisma.song.delete).toHaveBeenCalledWith({
            where: { id: songId },
          });

          // Step 2: After deletion, song no longer exists — all recipients lose access
          for (const empfaengerId of uniqueEmpfaenger) {
            // Mock: song no longer exists (deleted)
            (mockPrisma.song.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

            const hasAccess = await hatSongZugriff(songId, empfaengerId);
            expect(hasAccess).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("deleting a set triggers prisma.set.delete and afterwards no recipient has access", async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        empfaengerListArb(1, 8),
        async (setId, eigentuemerId, empfaengerIds) => {
          // Ensure owner is not among recipients and recipients are unique
          const uniqueEmpfaenger = [...new Set(empfaengerIds)].filter(
            (id) => id !== eigentuemerId
          );
          fc.pre(uniqueEmpfaenger.length >= 1);
          vi.clearAllMocks();

          // Mock: set exists and belongs to owner
          (mockPrisma.set.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: setId,
            userId: eigentuemerId,
          });

          // Mock: delete succeeds (cascade happens at DB level)
          (mockPrisma.set.delete as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: setId,
          });

          // Step 1: Delete the set
          await deleteSet(eigentuemerId, setId);

          // Verify prisma.set.delete was called
          expect(mockPrisma.set.delete).toHaveBeenCalledWith({
            where: { id: setId },
          });

          // Step 2: After deletion, set no longer exists — all recipients lose access
          for (const empfaengerId of uniqueEmpfaenger) {
            // Mock: set no longer exists (deleted)
            (mockPrisma.set.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

            const hasAccess = await hatSetZugriff(setId, empfaengerId);
            expect(hasAccess).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Property 20: Löschen eines Songs aus geteiltem Set bewahrt Set-Freigabe
 *
 * Für jedes geteilte Set mit mehreren Songs, wenn ein Song gelöscht wird,
 * soll die Set-Freigabe bestehen bleiben und der Empfänger weiterhin Zugriff
 * auf die verbleibenden Songs haben.
 *
 * **Validates: Requirements 10.3**
 */
describe("Feature: song-sharing, Property 20: Löschen eines Songs aus geteiltem Set bewahrt Set-Freigabe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("removing a song from a shared set preserves the SetFreigabe and access to remaining songs", async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,                          // setId
        idArb,                          // eigentuemerId
        idArb,                          // empfaengerId
        fc.array(idArb, { minLength: 2, maxLength: 6 }), // songIds (at least 2)
        async (setId, eigentuemerId, empfaengerId, songIds) => {
          // Ensure unique song IDs, owner != recipient
          const uniqueSongIds = [...new Set(songIds)];
          fc.pre(uniqueSongIds.length >= 2);
          fc.pre(eigentuemerId !== empfaengerId);
          vi.clearAllMocks();

          const removedSongId = uniqueSongIds[0];
          const remainingSongIds = uniqueSongIds.slice(1);

          // --- Step 1: Remove the song from the set via removeSongFromSet ---

          // Mock: set exists and belongs to owner (for removeSongFromSet)
          (mockPrisma.set.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: setId,
            userId: eigentuemerId,
          });

          // Mock: setSong.deleteMany succeeds
          (mockPrisma.setSong.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            count: 1,
          });

          await removeSongFromSet(eigentuemerId, setId, removedSongId);

          // Verify the song was removed from the set
          expect(mockPrisma.setSong.deleteMany).toHaveBeenCalledWith({
            where: { setId, songId: removedSongId },
          });

          // --- Step 2: Verify SetFreigabe still exists (hatSetZugriff returns true) ---

          // Mock: set still exists (for hatSetZugriff)
          (mockPrisma.set.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: setId,
            userId: eigentuemerId, // recipient is not owner
          });

          // Mock: SetFreigabe still exists for recipient
          (mockPrisma.setFreigabe.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: "freigabe-id",
            setId,
            eigentuemerId,
            empfaengerId,
          });

          const setAccess = await hatSetZugriff(setId, empfaengerId);
          expect(setAccess).toBe(true);

          // --- Step 3: Verify recipient still has access to remaining songs ---

          for (const songId of remainingSongIds) {
            // Mock: song exists, not owned by recipient
            (mockPrisma.song.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
              id: songId,
              userId: eigentuemerId,
            });

            // Mock: no direct SongFreigabe
            (mockPrisma.songFreigabe.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

            // Mock: SetFreigabe exists and song is still in the set
            (mockPrisma.setFreigabe.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
              id: "freigabe-id",
              setId,
              empfaengerId,
            });

            const songAccess = await hatSongZugriff(songId, empfaengerId);
            expect(songAccess).toBe(true);
          }

          // --- Step 4: Verify recipient no longer has set-based access to removed song ---

          // Mock: removed song still exists (it wasn't deleted, just removed from set)
          (mockPrisma.song.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: removedSongId,
            userId: eigentuemerId,
          });

          // Mock: no direct SongFreigabe for removed song
          (mockPrisma.songFreigabe.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

          // Mock: no SetFreigabe covers this song anymore (song is no longer in the set)
          (mockPrisma.setFreigabe.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

          const removedSongAccess = await hatSongZugriff(removedSongId, empfaengerId);
          expect(removedSongAccess).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
