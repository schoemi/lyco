/**
 * Property 1: Freigabe-Erstellung Round-Trip
 * Property 2: Keine doppelten Freigaben
 * Property 3: Selbst-Freigabe wird abgelehnt
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.3, 2.4**
 */
// Feature: song-sharing, Properties 1, 2, 3: CRUD-Grundlagen

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
      create: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  createSongFreigabe,
  listSongFreigaben,
  createSetFreigabe,
  listSetFreigaben,
  hatSongZugriff,
  hatSetZugriff,
} from "@/lib/services/freigabe-service";

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
 * Property 1: Freigabe-Erstellung Round-Trip
 *
 * Für jeden Song (oder Set) und jeden gültigen Empfänger, wenn der Eigentümer eine
 * Freigabe erstellt und anschließend die Freigaben abfragt, soll der Empfänger in der
 * Liste enthalten sein und der Empfänger soll Lesezugriff haben.
 *
 * **Validates: Requirements 1.1, 2.1**
 */
describe("Feature: song-sharing, Property 1: Freigabe-Erstellung Round-Trip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Song: create then list returns empfaenger with read access", async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        idArb,
        emailArb,
        nameArb,
        async (songId, eigentuemerId, empfaengerId, empfaengerEmail, empfaengerName) => {
          // Ensure owner and recipient are different
          fc.pre(eigentuemerId !== empfaengerId);
          vi.clearAllMocks();

          const now = new Date();
          const freigabeId = `freigabe-${songId}-${empfaengerId}`;

          // Mock song ownership
          (mockPrisma.song.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: songId,
            userId: eigentuemerId,
          });

          // Mock empfaenger lookup
          (mockPrisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: empfaengerId,
            email: empfaengerEmail,
            name: empfaengerName,
          });

          // Mock no existing freigabe
          (mockPrisma.songFreigabe.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

          // Mock create
          const createdFreigabe = {
            id: freigabeId,
            songId,
            eigentuemerId,
            empfaengerId,
            createdAt: now,
          };
          (mockPrisma.songFreigabe.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce(createdFreigabe);

          // Step 1: Create freigabe
          const result = await createSongFreigabe(songId, empfaengerEmail, eigentuemerId);
          expect(result.id).toBe(freigabeId);
          expect(result.empfaengerId).toBe(empfaengerId);

          // Step 2: List freigaben — mock findMany to return the created freigabe
          (mockPrisma.songFreigabe.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
            {
              id: freigabeId,
              songId,
              eigentuemerId,
              empfaengerId,
              createdAt: now,
              empfaenger: { id: empfaengerId, name: empfaengerName, email: empfaengerEmail },
            },
          ]);

          const freigaben = await listSongFreigaben(songId, eigentuemerId);

          // Empfaenger must be in the list
          expect(freigaben.length).toBeGreaterThanOrEqual(1);
          const found = freigaben.find((f) => f.empfaenger.id === empfaengerId);
          expect(found).toBeDefined();
          expect(found!.empfaenger.email).toBe(empfaengerEmail);

          // Step 3: Verify read access via hatSongZugriff
          // Reset song mock for access check
          (mockPrisma.song.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: songId,
            userId: eigentuemerId,
          });
          (mockPrisma.songFreigabe.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: freigabeId,
            songId,
            empfaengerId,
          });

          const hasAccess = await hatSongZugriff(songId, empfaengerId);
          expect(hasAccess).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("Set: create then list returns empfaenger with read access", async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        idArb,
        emailArb,
        nameArb,
        async (setId, eigentuemerId, empfaengerId, empfaengerEmail, empfaengerName) => {
          fc.pre(eigentuemerId !== empfaengerId);
          vi.clearAllMocks();

          const now = new Date();
          const freigabeId = `set-freigabe-${setId}-${empfaengerId}`;

          // Mock set ownership
          (mockPrisma.set.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: setId,
            userId: eigentuemerId,
          });

          // Mock empfaenger lookup
          (mockPrisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: empfaengerId,
            email: empfaengerEmail,
            name: empfaengerName,
          });

          // Mock no existing freigabe
          (mockPrisma.setFreigabe.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

          // Mock create
          const createdFreigabe = {
            id: freigabeId,
            setId,
            eigentuemerId,
            empfaengerId,
            createdAt: now,
          };
          (mockPrisma.setFreigabe.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce(createdFreigabe);

          // Step 1: Create freigabe
          const result = await createSetFreigabe(setId, empfaengerEmail, eigentuemerId);
          expect(result.id).toBe(freigabeId);
          expect(result.empfaengerId).toBe(empfaengerId);

          // Step 2: List freigaben
          (mockPrisma.setFreigabe.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
            {
              id: freigabeId,
              setId,
              eigentuemerId,
              empfaengerId,
              createdAt: now,
              empfaenger: { id: empfaengerId, name: empfaengerName, email: empfaengerEmail },
            },
          ]);

          const freigaben = await listSetFreigaben(setId, eigentuemerId);

          expect(freigaben.length).toBeGreaterThanOrEqual(1);
          const found = freigaben.find((f) => f.empfaenger.id === empfaengerId);
          expect(found).toBeDefined();
          expect(found!.empfaenger.email).toBe(empfaengerEmail);

          // Step 3: Verify read access via hatSetZugriff
          (mockPrisma.set.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: setId,
            userId: eigentuemerId,
          });
          (mockPrisma.setFreigabe.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: freigabeId,
            setId,
            empfaengerId,
          });

          const hasAccess = await hatSetZugriff(setId, empfaengerId);
          expect(hasAccess).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});


/**
 * Property 2: Keine doppelten Freigaben
 *
 * Für jeden Song (oder Set) und jeden Empfänger, wenn bereits eine aktive Freigabe
 * besteht, soll ein erneuter Freigabe-Versuch mit einem Fehler abgelehnt werden
 * und die Anzahl der Freigaben unverändert bleiben.
 *
 * **Validates: Requirements 1.2, 2.3**
 */
describe("Feature: song-sharing, Property 2: Keine doppelten Freigaben", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Song: second freigabe for same empfaenger is rejected, count unchanged", async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        idArb,
        emailArb,
        nameArb,
        async (songId, eigentuemerId, empfaengerId, empfaengerEmail, empfaengerName) => {
          fc.pre(eigentuemerId !== empfaengerId);
          vi.clearAllMocks();

          const existingFreigabeId = `existing-${songId}-${empfaengerId}`;

          // Mock song ownership
          (mockPrisma.song.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: songId,
            userId: eigentuemerId,
          });

          // Mock empfaenger lookup
          (mockPrisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: empfaengerId,
            email: empfaengerEmail,
            name: empfaengerName,
          });

          // Mock existing freigabe found (duplicate)
          (mockPrisma.songFreigabe.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: existingFreigabeId,
            songId,
            eigentuemerId,
            empfaengerId,
          });

          // Attempt to create duplicate — should throw
          await expect(
            createSongFreigabe(songId, empfaengerEmail, eigentuemerId),
          ).rejects.toThrow("Song ist bereits für diesen Nutzer freigegeben");

          // create should NOT have been called
          expect(mockPrisma.songFreigabe.create).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });

  it("Set: second freigabe for same empfaenger is rejected, count unchanged", async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        idArb,
        emailArb,
        nameArb,
        async (setId, eigentuemerId, empfaengerId, empfaengerEmail, empfaengerName) => {
          fc.pre(eigentuemerId !== empfaengerId);
          vi.clearAllMocks();

          const existingFreigabeId = `existing-set-${setId}-${empfaengerId}`;

          // Mock set ownership
          (mockPrisma.set.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: setId,
            userId: eigentuemerId,
          });

          // Mock empfaenger lookup
          (mockPrisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: empfaengerId,
            email: empfaengerEmail,
            name: empfaengerName,
          });

          // Mock existing freigabe found (duplicate)
          (mockPrisma.setFreigabe.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: existingFreigabeId,
            setId,
            eigentuemerId,
            empfaengerId,
          });

          // Attempt to create duplicate — should throw
          await expect(
            createSetFreigabe(setId, empfaengerEmail, eigentuemerId),
          ).rejects.toThrow("Set ist bereits für diesen Nutzer freigegeben");

          // create should NOT have been called
          expect(mockPrisma.setFreigabe.create).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });
});


/**
 * Property 3: Selbst-Freigabe wird abgelehnt
 *
 * Für jeden Nutzer und jeden Song (oder Set), den dieser Nutzer besitzt, soll der
 * Versuch, den Song (oder das Set) an sich selbst freizugeben, mit der Fehlermeldung
 * „Freigabe an sich selbst ist nicht möglich" abgelehnt werden.
 *
 * **Validates: Requirements 1.3, 2.4**
 */
describe("Feature: song-sharing, Property 3: Selbst-Freigabe wird abgelehnt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Song: sharing with yourself is rejected with specific error", async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        emailArb,
        nameArb,
        async (songId, userId, userEmail, userName) => {
          vi.clearAllMocks();

          // Mock song ownership
          (mockPrisma.song.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: songId,
            userId,
          });

          // Mock user lookup — returns the same user (self)
          (mockPrisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: userId,
            email: userEmail,
            name: userName,
          });

          // Attempt self-share — should throw specific message
          await expect(
            createSongFreigabe(songId, userEmail, userId),
          ).rejects.toThrow("Freigabe an sich selbst ist nicht möglich");

          // No freigabe should be created
          expect(mockPrisma.songFreigabe.create).not.toHaveBeenCalled();
          expect(mockPrisma.songFreigabe.findUnique).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });

  it("Set: sharing with yourself is rejected with specific error", async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        emailArb,
        nameArb,
        async (setId, userId, userEmail, userName) => {
          vi.clearAllMocks();

          // Mock set ownership
          (mockPrisma.set.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: setId,
            userId,
          });

          // Mock user lookup — returns the same user (self)
          (mockPrisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: userId,
            email: userEmail,
            name: userName,
          });

          // Attempt self-share — should throw specific message
          await expect(
            createSetFreigabe(setId, userEmail, userId),
          ).rejects.toThrow("Freigabe an sich selbst ist nicht möglich");

          // No freigabe should be created
          expect(mockPrisma.setFreigabe.create).not.toHaveBeenCalled();
          expect(mockPrisma.setFreigabe.findUnique).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });
});
