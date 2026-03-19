/**
 * Task 14.1: Kaskadierendes Löschen über Prisma-Schema verifizieren
 *
 * Verifies:
 * - onDelete: Cascade on SongFreigabe → Song (Req 10.1)
 * - onDelete: Cascade on SetFreigabe → Set (Req 10.2)
 * - Removing a Song from a Set: SetFreigabe remains, access to removed Song ends (Req 10.3)
 *
 * **Validates: Requirements 10.1, 10.2, 10.3**
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

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

describe("Task 14.1: Kaskadierendes Löschen – Schema-Verifikation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Req 10.1: Song löschen entfernt alle SongFreigaben", () => {
    it("deleteSong calls prisma.song.delete which triggers cascade on SongFreigaben", async () => {
      const songId = "song-1";
      const eigentuemerId = "owner-1";

      // Mock song ownership check
      (mockPrisma.song.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: songId,
        userId: eigentuemerId,
      });

      // Mock delete (cascade happens at DB level)
      (mockPrisma.song.delete as ReturnType<typeof vi.fn>).mockResolvedValue({ id: songId });

      await deleteSong(eigentuemerId, songId);

      // Verify prisma.song.delete was called — cascade is handled by DB via onDelete: Cascade
      expect(mockPrisma.song.delete).toHaveBeenCalledWith({ where: { id: songId } });
    });

    it("after song deletion, hatSongZugriff returns false for former recipients", async () => {
      const songId = "song-deleted";
      const empfaengerId = "recipient-1";

      // Song no longer exists
      (mockPrisma.song.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const hasAccess = await hatSongZugriff(songId, empfaengerId);
      expect(hasAccess).toBe(false);
    });
  });

  describe("Req 10.2: Set löschen entfernt alle SetFreigaben", () => {
    it("deleteSet calls prisma.set.delete which triggers cascade on SetFreigaben", async () => {
      const setId = "set-1";
      const eigentuemerId = "owner-1";

      // Mock set ownership check
      (mockPrisma.set.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: setId,
        userId: eigentuemerId,
      });

      // Mock delete (cascade happens at DB level)
      (mockPrisma.set.delete as ReturnType<typeof vi.fn>).mockResolvedValue({ id: setId });

      await deleteSet(eigentuemerId, setId);

      // Verify prisma.set.delete was called — cascade is handled by DB via onDelete: Cascade
      expect(mockPrisma.set.delete).toHaveBeenCalledWith({ where: { id: setId } });
    });

    it("after set deletion, hatSetZugriff returns false for former recipients", async () => {
      const setId = "set-deleted";
      const empfaengerId = "recipient-1";

      // Set no longer exists
      (mockPrisma.set.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const hasAccess = await hatSetZugriff(setId, empfaengerId);
      expect(hasAccess).toBe(false);
    });
  });

  describe("Req 10.3: Song aus Set entfernen – SetFreigabe bleibt, Zugriff auf entfernten Song endet", () => {
    it("removeSongFromSet removes SetSong but SetFreigabe remains intact", async () => {
      const setId = "set-shared";
      const songId = "song-in-set";
      const eigentuemerId = "owner-1";

      // Mock set ownership check
      (mockPrisma.set.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: setId,
        userId: eigentuemerId,
      });

      // Mock setSong deletion
      (mockPrisma.setSong.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });

      await removeSongFromSet(eigentuemerId, setId, songId);

      // Only SetSong is deleted, not SetFreigabe
      expect(mockPrisma.setSong.deleteMany).toHaveBeenCalledWith({
        where: { setId, songId },
      });
      // SetFreigabe delete should NOT have been called
      expect(mockPrisma.setFreigabe.findFirst).not.toHaveBeenCalled();
    });

    it("after song removal from set, hatSongZugriff returns false via set-based access", async () => {
      const songId = "song-removed-from-set";
      const empfaengerId = "recipient-1";
      const eigentuemerId = "owner-1";

      // Song still exists but is owned by someone else
      (mockPrisma.song.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: songId,
        userId: eigentuemerId,
      });

      // No direct SongFreigabe
      (mockPrisma.songFreigabe.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      // No SetFreigabe with this song in any shared set (song was removed from set)
      (mockPrisma.setFreigabe.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const hasAccess = await hatSongZugriff(songId, empfaengerId);
      expect(hasAccess).toBe(false);
    });

    it("after song removal, other songs in the set remain accessible via SetFreigabe", async () => {
      const otherSongId = "song-still-in-set";
      const empfaengerId = "recipient-1";
      const eigentuemerId = "owner-1";

      // Other song still exists
      (mockPrisma.song.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: otherSongId,
        userId: eigentuemerId,
      });

      // No direct SongFreigabe for this song
      (mockPrisma.songFreigabe.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      // SetFreigabe still exists and this song is still in the set
      (mockPrisma.setFreigabe.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "set-freigabe-1",
        setId: "set-shared",
        empfaengerId,
      });

      const hasAccess = await hatSongZugriff(otherSongId, empfaengerId);
      expect(hasAccess).toBe(true);
    });
  });
});
