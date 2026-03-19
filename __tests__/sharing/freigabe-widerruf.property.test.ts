/**
 * Property 7: Widerruf einer Song-Freigabe entzieht Zugriff
 * Property 8: Widerruf einer Set-Freigabe entzieht Zugriff auf Set und Songs
 * Property 9: Widerruf bewahrt Lerndaten
 *
 * **Validates: Requirements 3.1, 3.2, 3.4**
 */
// Feature: song-sharing, Properties 7, 8, 9: Freigabe-Widerruf

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
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    fortschritt: { delete: vi.fn(), deleteMany: vi.fn() },
    session: { delete: vi.fn(), deleteMany: vi.fn() },
    notiz: { delete: vi.fn(), deleteMany: vi.fn() },
    interpretation: { delete: vi.fn(), deleteMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  revokeSongFreigabe,
  revokeSetFreigabe,
  hatSongZugriff,
  hatSetZugriff,
} from "@/lib/services/freigabe-service";

const mockPrisma = vi.mocked(prisma);

// --- Generators ---
const idArb = fc.uuid();
const songIdListArb = (min: number, max: number) =>
  fc.array(fc.uuid(), { minLength: min, maxLength: max });


/**
 * Property 7: Widerruf einer Song-Freigabe entzieht Zugriff
 *
 * Für jede aktive Song-Freigabe, wenn der Eigentümer die Freigabe widerruft,
 * soll der Empfänger keinen Zugriff mehr auf den Song haben (sofern keine
 * Set-Freigabe den Zugriff gewährt).
 *
 * **Validates: Requirements 3.1**
 */
describe("Feature: song-sharing, Property 7: Widerruf einer Song-Freigabe entzieht Zugriff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("after revoking a song freigabe, recipient loses access", async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        idArb,
        idArb,
        async (freigabeId, songId, eigentuemerId, empfaengerId) => {
          fc.pre(eigentuemerId !== empfaengerId);
          vi.clearAllMocks();

          // Mock: freigabe exists and belongs to the owner
          (mockPrisma.songFreigabe.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: freigabeId,
            songId,
            eigentuemerId,
            empfaengerId,
          });

          // Mock: delete succeeds
          (mockPrisma.songFreigabe.delete as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: freigabeId,
          });

          // Step 1: Revoke the freigabe
          await revokeSongFreigabe(freigabeId, eigentuemerId);

          // Verify delete was called
          expect(mockPrisma.songFreigabe.delete).toHaveBeenCalledWith({
            where: { id: freigabeId },
          });

          // Step 2: Check access — after revoke, no freigabe exists
          // Mock: song exists, belongs to owner (not recipient)
          (mockPrisma.song.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: songId,
            userId: eigentuemerId,
          });

          // Mock: no direct SongFreigabe anymore (deleted)
          (mockPrisma.songFreigabe.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

          // Mock: no SetFreigabe granting access either
          (mockPrisma.setFreigabe.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

          const hasAccess = await hatSongZugriff(songId, empfaengerId);
          expect(hasAccess).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});


/**
 * Property 8: Widerruf einer Set-Freigabe entzieht Zugriff auf Set und Songs
 *
 * Für jede aktive Set-Freigabe, wenn der Eigentümer die Freigabe widerruft,
 * soll der Empfänger keinen Zugriff mehr auf das Set und alle Songs haben,
 * die ausschließlich über diese Set-Freigabe zugänglich waren.
 *
 * **Validates: Requirements 3.2**
 */
describe("Feature: song-sharing, Property 8: Widerruf einer Set-Freigabe entzieht Zugriff auf Set und Songs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("after revoking a set freigabe, recipient loses access to set and all songs", async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        idArb,
        idArb,
        songIdListArb(1, 8),
        async (freigabeId, setId, eigentuemerId, empfaengerId, songIds) => {
          fc.pre(eigentuemerId !== empfaengerId);
          fc.pre(new Set(songIds).size === songIds.length);
          vi.clearAllMocks();

          // Mock: set freigabe exists and belongs to the owner
          (mockPrisma.setFreigabe.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: freigabeId,
            setId,
            eigentuemerId,
            empfaengerId,
          });

          // Mock: delete succeeds
          (mockPrisma.setFreigabe.delete as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: freigabeId,
          });

          // Step 1: Revoke the set freigabe
          await revokeSetFreigabe(freigabeId, eigentuemerId);

          // Verify delete was called
          expect(mockPrisma.setFreigabe.delete).toHaveBeenCalledWith({
            where: { id: freigabeId },
          });

          // Step 2: Check set access — after revoke, no freigabe exists
          // Mock: set exists, belongs to owner (not recipient)
          (mockPrisma.set.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: setId,
            userId: eigentuemerId,
          });

          // Mock: no SetFreigabe anymore (deleted)
          (mockPrisma.setFreigabe.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

          const hasSetAccess = await hatSetZugriff(setId, empfaengerId);
          expect(hasSetAccess).toBe(false);

          // Step 3: Check song access — each song in the set should also be inaccessible
          for (const songId of songIds) {
            // Mock: song exists, belongs to owner
            (mockPrisma.song.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
              id: songId,
              userId: eigentuemerId,
            });

            // Mock: no direct SongFreigabe
            (mockPrisma.songFreigabe.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

            // Mock: no SetFreigabe granting access (revoked)
            (mockPrisma.setFreigabe.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

            const hasSongAccess = await hatSongZugriff(songId, empfaengerId);
            expect(hasSongAccess).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});


/**
 * Property 9: Widerruf bewahrt Lerndaten
 *
 * Für jede Freigabe, die widerrufen wird, sollen alle Lerndaten des Empfängers
 * (Fortschritt, Sessions, Notizen, Interpretationen) für den betroffenen Song
 * erhalten bleiben.
 *
 * **Validates: Requirements 3.4**
 */
describe("Feature: song-sharing, Property 9: Widerruf bewahrt Lerndaten", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("song freigabe revoke does not delete any learning data", async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        idArb,
        idArb,
        async (freigabeId, songId, eigentuemerId, empfaengerId) => {
          fc.pre(eigentuemerId !== empfaengerId);
          vi.clearAllMocks();

          // Mock: freigabe exists and belongs to the owner
          (mockPrisma.songFreigabe.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: freigabeId,
            songId,
            eigentuemerId,
            empfaengerId,
          });

          // Mock: delete succeeds
          (mockPrisma.songFreigabe.delete as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: freigabeId,
          });

          // Revoke the freigabe
          await revokeSongFreigabe(freigabeId, eigentuemerId);

          // Verify: no delete operations were called on learning data tables
          expect(mockPrisma.fortschritt.delete).not.toHaveBeenCalled();
          expect(mockPrisma.fortschritt.deleteMany).not.toHaveBeenCalled();
          expect(mockPrisma.session.delete).not.toHaveBeenCalled();
          expect(mockPrisma.session.deleteMany).not.toHaveBeenCalled();
          expect(mockPrisma.notiz.delete).not.toHaveBeenCalled();
          expect(mockPrisma.notiz.deleteMany).not.toHaveBeenCalled();
          expect(mockPrisma.interpretation.delete).not.toHaveBeenCalled();
          expect(mockPrisma.interpretation.deleteMany).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });

  it("set freigabe revoke does not delete any learning data", async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        idArb,
        idArb,
        async (freigabeId, setId, eigentuemerId, empfaengerId) => {
          fc.pre(eigentuemerId !== empfaengerId);
          vi.clearAllMocks();

          // Mock: set freigabe exists and belongs to the owner
          (mockPrisma.setFreigabe.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: freigabeId,
            setId,
            eigentuemerId,
            empfaengerId,
          });

          // Mock: delete succeeds
          (mockPrisma.setFreigabe.delete as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: freigabeId,
          });

          // Revoke the set freigabe
          await revokeSetFreigabe(freigabeId, eigentuemerId);

          // Verify: no delete operations were called on learning data tables
          expect(mockPrisma.fortschritt.delete).not.toHaveBeenCalled();
          expect(mockPrisma.fortschritt.deleteMany).not.toHaveBeenCalled();
          expect(mockPrisma.session.delete).not.toHaveBeenCalled();
          expect(mockPrisma.session.deleteMany).not.toHaveBeenCalled();
          expect(mockPrisma.notiz.delete).not.toHaveBeenCalled();
          expect(mockPrisma.notiz.deleteMany).not.toHaveBeenCalled();
          expect(mockPrisma.interpretation.delete).not.toHaveBeenCalled();
          expect(mockPrisma.interpretation.deleteMany).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });
});
