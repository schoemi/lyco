/**
 * Property 4: Nur der Eigentümer kann Freigaben verwalten
 * Property 12: Schreiboperationen auf geteilte Songs werden abgelehnt
 * Property 17: Zugriff ohne Freigabe oder Eigentümerschaft wird abgelehnt
 *
 * **Validates: Requirements 1.5, 2.5, 3.3, 5.3, 9.2, 9.3, 9.4**
 */
// Feature: song-sharing, Properties 4, 12, 17: Zugriffskontrolle

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
      delete: vi.fn(),
    },
    setFreigabe: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

// Mock freigabe-service import used by song-service
vi.mock("@/lib/services/freigabe-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/services/freigabe-service")>();
  return {
    ...actual,
  };
});

import { prisma } from "@/lib/prisma";
import {
  createSongFreigabe,
  revokeSongFreigabe,
  listSongFreigaben,
  createSetFreigabe,
  revokeSetFreigabe,
  listSetFreigaben,
  hatSongZugriff,
  hatSetZugriff,
} from "@/lib/services/freigabe-service";
import { updateSong, deleteSong } from "@/lib/services/song-service";

const mockPrisma = vi.mocked(prisma);

// --- Generators ---
const idArb = fc.uuid();
const emailArb = fc
  .tuple(
    fc.string({ minLength: 1, maxLength: 10, unit: "grapheme" }).filter((s) => /^[a-z0-9]+$/i.test(s)),
    fc.string({ minLength: 1, maxLength: 8, unit: "grapheme" }).filter((s) => /^[a-z0-9]+$/i.test(s)),
  )
  .map(([local, domain]) => `${local}@${domain}.com`);
const nameArb = fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0);


/**
 * Property 4: Nur der Eigentümer kann Freigaben verwalten
 *
 * Für jeden Song (oder Set) und jeden Nutzer, der nicht der Eigentümer ist,
 * sollen alle Freigabe-Verwaltungsoperationen (Erstellen, Widerrufen, Auflisten)
 * mit einem Zugriffsfehler abgelehnt werden.
 *
 * **Validates: Requirements 1.5, 2.5, 3.3, 9.2**
 */
describe("Feature: song-sharing, Property 4: Nur der Eigentümer kann Freigaben verwalten", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Song: non-owner cannot create, revoke, or list freigaben", async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        idArb,
        idArb,
        emailArb,
        async (songId, ownerId, nonOwnerId, freigabeId, empfaengerEmail) => {
          fc.pre(ownerId !== nonOwnerId);
          vi.clearAllMocks();

          // Mock song owned by ownerId
          (mockPrisma.song.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: songId,
            userId: ownerId,
          });

          // 1. createSongFreigabe as non-owner → "Zugriff verweigert"
          await expect(
            createSongFreigabe(songId, empfaengerEmail, nonOwnerId),
          ).rejects.toThrow("Zugriff verweigert");
          expect(mockPrisma.songFreigabe.create).not.toHaveBeenCalled();

          // 2. listSongFreigaben as non-owner → "Zugriff verweigert"
          await expect(
            listSongFreigaben(songId, nonOwnerId),
          ).rejects.toThrow("Zugriff verweigert");
          expect(mockPrisma.songFreigabe.findMany).not.toHaveBeenCalled();

          // 3. revokeSongFreigabe as non-owner → "Zugriff verweigert"
          (mockPrisma.songFreigabe.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: freigabeId,
            songId,
            eigentuemerId: ownerId,
            empfaengerId: "some-empfaenger",
          });
          await expect(
            revokeSongFreigabe(freigabeId, nonOwnerId),
          ).rejects.toThrow("Zugriff verweigert");
          expect(mockPrisma.songFreigabe.delete).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });

  it("Set: non-owner cannot create, revoke, or list freigaben", async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        idArb,
        idArb,
        emailArb,
        async (setId, ownerId, nonOwnerId, freigabeId, empfaengerEmail) => {
          fc.pre(ownerId !== nonOwnerId);
          vi.clearAllMocks();

          // Mock set owned by ownerId
          (mockPrisma.set.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: setId,
            userId: ownerId,
          });

          // 1. createSetFreigabe as non-owner → "Zugriff verweigert"
          await expect(
            createSetFreigabe(setId, empfaengerEmail, nonOwnerId),
          ).rejects.toThrow("Zugriff verweigert");
          expect(mockPrisma.setFreigabe.create).not.toHaveBeenCalled();

          // 2. listSetFreigaben as non-owner → "Zugriff verweigert"
          await expect(
            listSetFreigaben(setId, nonOwnerId),
          ).rejects.toThrow("Zugriff verweigert");
          expect(mockPrisma.setFreigabe.findMany).not.toHaveBeenCalled();

          // 3. revokeSetFreigabe as non-owner → "Zugriff verweigert"
          (mockPrisma.setFreigabe.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: freigabeId,
            setId,
            eigentuemerId: ownerId,
            empfaengerId: "some-empfaenger",
          });
          await expect(
            revokeSetFreigabe(freigabeId, nonOwnerId),
          ).rejects.toThrow("Zugriff verweigert");
          expect(mockPrisma.setFreigabe.delete).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });
});


/**
 * Property 12: Schreiboperationen auf geteilte Songs werden abgelehnt
 *
 * Für jeden geteilten Song und jede Schreiboperation (Aktualisieren, Löschen),
 * soll der Empfänger den Fehler "Zugriff verweigert" erhalten.
 *
 * **Validates: Requirements 5.3**
 */
describe("Feature: song-sharing, Property 12: Schreiboperationen auf geteilte Songs werden abgelehnt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updateSong rejects non-owner with 'Zugriff verweigert'", async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        idArb,
        nameArb,
        async (songId, ownerId, recipientId, newTitle) => {
          fc.pre(ownerId !== recipientId);
          vi.clearAllMocks();

          // Mock song owned by ownerId
          (mockPrisma.song.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: songId,
            userId: ownerId,
          });

          // Recipient tries to update → "Zugriff verweigert"
          await expect(
            updateSong(recipientId, songId, { titel: newTitle }),
          ).rejects.toThrow("Zugriff verweigert");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("deleteSong rejects non-owner with 'Zugriff verweigert'", async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        idArb,
        async (songId, ownerId, recipientId) => {
          fc.pre(ownerId !== recipientId);
          vi.clearAllMocks();

          // Mock song owned by ownerId
          (mockPrisma.song.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: songId,
            userId: ownerId,
          });

          // Recipient tries to delete → "Zugriff verweigert"
          await expect(
            deleteSong(recipientId, songId),
          ).rejects.toThrow("Zugriff verweigert");
        },
      ),
      { numRuns: 100 },
    );
  });
});


/**
 * Property 17: Zugriff ohne Freigabe oder Eigentümerschaft wird abgelehnt
 *
 * Für jeden Song (oder Set) und jeden Nutzer, der weder Eigentümer ist noch eine
 * aktive Freigabe hat, soll der Zugriff verweigert werden (hatSongZugriff/hatSetZugriff
 * returns false).
 *
 * **Validates: Requirements 9.3, 9.4**
 */
describe("Feature: song-sharing, Property 17: Zugriff ohne Freigabe oder Eigentümerschaft wird abgelehnt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Song: user without ownership or freigabe is denied access", async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        idArb,
        async (songId, ownerId, randomUserId) => {
          fc.pre(ownerId !== randomUserId);
          vi.clearAllMocks();

          // Mock song owned by ownerId
          (mockPrisma.song.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: songId,
            userId: ownerId,
          });

          // No direct SongFreigabe
          (mockPrisma.songFreigabe.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

          // No SetFreigabe via set membership
          (mockPrisma.setFreigabe.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

          const hasAccess = await hatSongZugriff(songId, randomUserId);
          expect(hasAccess).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("Set: user without ownership or freigabe is denied access", async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        idArb,
        async (setId, ownerId, randomUserId) => {
          fc.pre(ownerId !== randomUserId);
          vi.clearAllMocks();

          // Mock set owned by ownerId
          (mockPrisma.set.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: setId,
            userId: ownerId,
          });

          // No direct SetFreigabe
          (mockPrisma.setFreigabe.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

          const hasAccess = await hatSetZugriff(setId, randomUserId);
          expect(hasAccess).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});
