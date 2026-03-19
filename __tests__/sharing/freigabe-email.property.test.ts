/**
 * Property 16: E-Mail-Benachrichtigung bei Freigabe-Erstellung
 *
 * Für jede neue Freigabe, wenn SMTP konfiguriert ist, soll eine E-Mail an den
 * Empfänger gesendet werden, die den Namen des Eigentümers und den Titel des
 * Songs (oder Sets) enthält.
 *
 * **Validates: Requirements 8.1**
 */
// Feature: song-sharing, Property 16: E-Mail-Benachrichtigung bei Freigabe-Erstellung

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fc from "fast-check";

// --- Mock email-service ---
const mockSendFreigabeNotification = vi.fn();
vi.mock("@/lib/services/email-service", () => ({
  sendFreigabeNotification: (...args: unknown[]) =>
    mockSendFreigabeNotification(...args),
}));

// --- Prisma mock ---
vi.mock("@/lib/prisma", () => ({
  prisma: {
    song: { findUnique: vi.fn() },
    set: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    songFreigabe: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    setFreigabe: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  createSongFreigabe,
  createSetFreigabe,
} from "@/lib/services/freigabe-service";

const mockPrisma = vi.mocked(prisma);

// --- Generators ---
const idArb = fc.uuid();
const emailArb = fc
  .tuple(
    fc
      .string({ minLength: 1, maxLength: 10, unit: "grapheme" })
      .filter((s) => /^[a-z0-9]+$/i.test(s)),
    fc
      .string({ minLength: 1, maxLength: 8, unit: "grapheme" })
      .filter((s) => /^[a-z0-9]+$/i.test(s)),
  )
  .map(([local, domain]) => `${local}@${domain}.com`);
const nameArb = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter((s) => s.trim().length > 0);
const titelArb = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => s.trim().length > 0);

describe("Feature: song-sharing, Property 16: E-Mail-Benachrichtigung bei Freigabe-Erstellung", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendFreigabeNotification.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("Song: sendFreigabeNotification is called with correct params after song freigabe creation", async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        idArb,
        emailArb,
        nameArb,
        nameArb,
        titelArb,
        async (
          songId,
          eigentuemerId,
          empfaengerId,
          empfaengerEmail,
          empfaengerName,
          eigentuemerName,
          songTitel,
        ) => {
          fc.pre(eigentuemerId !== empfaengerId);
          vi.clearAllMocks();
          mockSendFreigabeNotification.mockResolvedValue(undefined);

          const now = new Date();
          const freigabeId = `freigabe-${songId}-${empfaengerId}`;

          // Mock song ownership — includes titel for email
          (mockPrisma.song.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: songId,
            userId: eigentuemerId,
            titel: songTitel,
          });

          // Mock empfaenger lookup
          (mockPrisma.user.findUnique as ReturnType<typeof vi.fn>).mockImplementation(
            (args: { where: { email?: string; id?: string } }) => {
              if (args.where.email === empfaengerEmail) {
                return Promise.resolve({
                  id: empfaengerId,
                  email: empfaengerEmail,
                  name: empfaengerName,
                });
              }
              if (args.where.id === eigentuemerId) {
                return Promise.resolve({
                  id: eigentuemerId,
                  name: eigentuemerName,
                });
              }
              return Promise.resolve(null);
            },
          );

          // Mock no existing freigabe
          (mockPrisma.songFreigabe.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

          // Mock create
          (mockPrisma.songFreigabe.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: freigabeId,
            songId,
            eigentuemerId,
            empfaengerId,
            createdAt: now,
          });

          await createSongFreigabe(songId, empfaengerEmail, eigentuemerId);

          // Verify sendFreigabeNotification was called with correct params
          expect(mockSendFreigabeNotification).toHaveBeenCalledOnce();
          expect(mockSendFreigabeNotification).toHaveBeenCalledWith(
            empfaengerEmail,
            eigentuemerName,
            songTitel,
            "song",
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it("Set: sendFreigabeNotification is called with correct params after set freigabe creation", async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        idArb,
        emailArb,
        nameArb,
        nameArb,
        titelArb,
        async (
          setId,
          eigentuemerId,
          empfaengerId,
          empfaengerEmail,
          empfaengerName,
          eigentuemerName,
          setName,
        ) => {
          fc.pre(eigentuemerId !== empfaengerId);
          vi.clearAllMocks();
          mockSendFreigabeNotification.mockResolvedValue(undefined);

          const now = new Date();
          const freigabeId = `set-freigabe-${setId}-${empfaengerId}`;

          // Mock set ownership — includes name for email
          (mockPrisma.set.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: setId,
            userId: eigentuemerId,
            name: setName,
          });

          // Mock empfaenger lookup
          (mockPrisma.user.findUnique as ReturnType<typeof vi.fn>).mockImplementation(
            (args: { where: { email?: string; id?: string } }) => {
              if (args.where.email === empfaengerEmail) {
                return Promise.resolve({
                  id: empfaengerId,
                  email: empfaengerEmail,
                  name: empfaengerName,
                });
              }
              if (args.where.id === eigentuemerId) {
                return Promise.resolve({
                  id: eigentuemerId,
                  name: eigentuemerName,
                });
              }
              return Promise.resolve(null);
            },
          );

          // Mock no existing freigabe
          (mockPrisma.setFreigabe.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

          // Mock create
          (mockPrisma.setFreigabe.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: freigabeId,
            setId,
            eigentuemerId,
            empfaengerId,
            createdAt: now,
          });

          await createSetFreigabe(setId, empfaengerEmail, eigentuemerId);

          // Verify sendFreigabeNotification was called with correct params
          expect(mockSendFreigabeNotification).toHaveBeenCalledOnce();
          expect(mockSendFreigabeNotification).toHaveBeenCalledWith(
            empfaengerEmail,
            eigentuemerName,
            setName,
            "set",
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it("Song: email failure does not prevent freigabe creation", async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        idArb,
        emailArb,
        nameArb,
        nameArb,
        titelArb,
        async (
          songId,
          eigentuemerId,
          empfaengerId,
          empfaengerEmail,
          empfaengerName,
          eigentuemerName,
          songTitel,
        ) => {
          fc.pre(eigentuemerId !== empfaengerId);
          vi.clearAllMocks();

          // Make email sending throw
          mockSendFreigabeNotification.mockRejectedValue(
            new Error("SMTP connection failed"),
          );

          const now = new Date();
          const freigabeId = `freigabe-${songId}-${empfaengerId}`;

          (mockPrisma.song.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: songId,
            userId: eigentuemerId,
            titel: songTitel,
          });

          (mockPrisma.user.findUnique as ReturnType<typeof vi.fn>).mockImplementation(
            (args: { where: { email?: string; id?: string } }) => {
              if (args.where.email === empfaengerEmail) {
                return Promise.resolve({
                  id: empfaengerId,
                  email: empfaengerEmail,
                  name: empfaengerName,
                });
              }
              if (args.where.id === eigentuemerId) {
                return Promise.resolve({
                  id: eigentuemerId,
                  name: eigentuemerName,
                });
              }
              return Promise.resolve(null);
            },
          );

          (mockPrisma.songFreigabe.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

          (mockPrisma.songFreigabe.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: freigabeId,
            songId,
            eigentuemerId,
            empfaengerId,
            createdAt: now,
          });

          // Should NOT throw even though email fails
          const result = await createSongFreigabe(
            songId,
            empfaengerEmail,
            eigentuemerId,
          );
          expect(result.id).toBe(freigabeId);
          expect(result.empfaengerId).toBe(empfaengerId);
        },
      ),
      { numRuns: 100 },
    );
  });
});
