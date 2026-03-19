import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

/**
 * Feature: song-sets
 * Property 1: Set-Erstellung Round-Trip
 * Property 2: Set-Aktualisierung Round-Trip
 * Property 3: Leere Namen werden abgelehnt
 * Property 4: Feldlängen-Validierung
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 2.1, 8.1, 8.2
 */

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
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import { createSet, updateSet } from "@/lib/services/set-service";

const mockPrisma = vi.mocked(prisma);

/**
 * Property 1: Set-Erstellung Round-Trip
 *
 * Für jedes gültige Paar aus Name (1–100 Zeichen, nicht nur Leerzeichen) und optionaler
 * Beschreibung (0–500 Zeichen), wenn ein Set erstellt wird, dann soll das zurückgegebene
 * Set denselben Namen (getrimmt) und dieselbe Beschreibung enthalten und dem
 * authentifizierten Nutzer zugeordnet sein.
 *
 * Validates: Requirements 1.1, 8.2
 */
describe("Property 1: Set-Erstellung Round-Trip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("created set has trimmed name, description, and correct userId", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
        fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: undefined }),
        fc.string({ minLength: 1, maxLength: 30 }),
        async (name, description, userId) => {
          vi.clearAllMocks();

          const fakeId = "set-created-id";
          const now = new Date();

          const expectedSet = {
            id: fakeId,
            name: name.trim(),
            description: description ?? null,
            userId,
            createdAt: now,
            updatedAt: now,
          };

          mockPrisma.set.create.mockResolvedValueOnce(expectedSet as any);

          const input = description !== undefined
            ? { name, description }
            : { name };

          const result = await createSet(userId, input);

          expect(result.name).toBe(name.trim());
          expect(result.description).toBe(description ?? null);
          expect(result.userId).toBe(userId);

          expect(mockPrisma.set.create).toHaveBeenCalledWith({
            data: {
              name: name.trim(),
              description: description ?? null,
              userId,
            },
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 2: Set-Aktualisierung Round-Trip
 *
 * Für jedes existierende Set und jede gültige Kombination aus neuem Namen und neuer
 * Beschreibung, wenn das Set aktualisiert und anschließend gelesen wird, sollen die
 * gelesenen Werte den aktualisierten Werten entsprechen.
 *
 * Validates: Requirements 2.1
 */
describe("Property 2: Set-Aktualisierung Round-Trip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updated set reflects new name and description", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
        fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: undefined }),
        fc.string({ minLength: 1, maxLength: 30 }),
        async (newName, newDescription, userId) => {
          vi.clearAllMocks();

          const setId = "existing-set-id";
          const now = new Date();

          const existingSet = {
            id: setId,
            name: "Original Name",
            description: "Original Description",
            userId,
            createdAt: now,
            updatedAt: now,
          };

          // findUnique for ownership check
          mockPrisma.set.findUnique.mockResolvedValueOnce(existingSet as any);

          const expectedUpdated = {
            id: setId,
            name: newName.trim(),
            description: newDescription ?? null,
            userId,
            createdAt: now,
            updatedAt: new Date(),
          };

          mockPrisma.set.update.mockResolvedValueOnce(expectedUpdated as any);

          const input = newDescription !== undefined
            ? { name: newName, description: newDescription }
            : { name: newName };

          const result = await updateSet(userId, setId, input);

          expect(result.name).toBe(newName.trim());
          expect(result.description).toBe(newDescription ?? null);

          expect(mockPrisma.set.update).toHaveBeenCalledWith({
            where: { id: setId },
            data: {
              name: newName.trim(),
              description: newDescription ?? null,
            },
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 3: Leere Namen werden abgelehnt
 *
 * Für jeden String, der ausschließlich aus Leerzeichen besteht (einschließlich des leeren
 * Strings), soll das Erstellen oder Aktualisieren eines Sets mit diesem Namen fehlschlagen
 * und das Set unverändert bleiben.
 *
 * Validates: Requirements 1.2
 */
describe("Property 3: Leere Namen werden abgelehnt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createSet rejects whitespace-only or empty names", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom("", " ", "  ", "\t", "\n", "   \t\n  "),
        fc.string({ minLength: 1, maxLength: 30 }),
        async (blankName, userId) => {
          vi.clearAllMocks();

          await expect(createSet(userId, { name: blankName })).rejects.toThrow(
            "Name ist erforderlich"
          );

          expect(mockPrisma.set.create).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  it("updateSet rejects whitespace-only or empty names", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom("", " ", "  ", "\t", "\n", "   \t\n  "),
        fc.string({ minLength: 1, maxLength: 30 }),
        async (blankName, userId) => {
          vi.clearAllMocks();

          const setId = "existing-set-id";

          await expect(
            updateSet(userId, setId, { name: blankName })
          ).rejects.toThrow("Name ist erforderlich");

          expect(mockPrisma.set.update).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 4: Feldlängen-Validierung
 *
 * Für jeden Namen mit mehr als 100 Zeichen oder jede Beschreibung mit mehr als 500 Zeichen
 * soll die Set-Erstellung oder -Aktualisierung abgelehnt werden.
 *
 * Validates: Requirements 1.3, 8.1
 */
describe("Property 4: Feldlängen-Validierung", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createSet rejects names longer than 100 characters", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 101, maxLength: 300 }).filter((s) => s.trim().length > 100),
        fc.string({ minLength: 1, maxLength: 30 }),
        async (longName, userId) => {
          vi.clearAllMocks();

          await expect(createSet(userId, { name: longName })).rejects.toThrow(
            "Name darf maximal 100 Zeichen lang sein"
          );

          expect(mockPrisma.set.create).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  it("createSet rejects descriptions longer than 500 characters", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
        fc.string({ minLength: 501, maxLength: 800 }),
        fc.string({ minLength: 1, maxLength: 30 }),
        async (validName, longDescription, userId) => {
          vi.clearAllMocks();

          await expect(
            createSet(userId, { name: validName, description: longDescription })
          ).rejects.toThrow("Beschreibung darf maximal 500 Zeichen lang sein");

          expect(mockPrisma.set.create).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  it("updateSet rejects names longer than 100 characters", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 101, maxLength: 300 }).filter((s) => s.trim().length > 100),
        fc.string({ minLength: 1, maxLength: 30 }),
        async (longName, userId) => {
          vi.clearAllMocks();

          const setId = "existing-set-id";

          await expect(
            updateSet(userId, setId, { name: longName })
          ).rejects.toThrow("Name darf maximal 100 Zeichen lang sein");

          expect(mockPrisma.set.update).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  it("updateSet rejects descriptions longer than 500 characters", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
        fc.string({ minLength: 501, maxLength: 800 }),
        fc.string({ minLength: 1, maxLength: 30 }),
        async (validName, longDescription, userId) => {
          vi.clearAllMocks();

          const setId = "existing-set-id";

          await expect(
            updateSet(userId, setId, { name: validName, description: longDescription })
          ).rejects.toThrow("Beschreibung darf maximal 500 Zeichen lang sein");

          expect(mockPrisma.set.update).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });
});
