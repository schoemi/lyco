/**
 * Property 4: Set-CRUD Round-Trip
 *
 * Für jeden gültigen Set-Namen (nicht leer) gilt: Nach dem Erstellen eines Sets
 * über `createSet` muss das Set in `listSets` erscheinen. Nach dem Umbenennen
 * über `updateSet` muss der neue Name zurückgegeben werden.
 *
 * **Validates: Requirements 2.1, 2.3**
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

// --- In-memory store types ---
interface StoredSet {
  id: string;
  name: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

// --- In-memory database ---
let sets: StoredSet[] = [];
let idCounter = 0;

function nextId(): string {
  return `set-id-${++idCounter}`;
}

function resetDb() {
  sets = [];
  idCounter = 0;
}

// --- Mock Prisma ---
const { mockPrisma } = vi.hoisted(() => {
  const _mockSet = {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  };
  const _mockSession = { findFirst: vi.fn() };

  const _mockPrisma: Record<string, unknown> = {
    set: _mockSet,
    session: _mockSession,
  };

  return { mockPrisma: _mockPrisma };
});

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { createSet, listSets, updateSet } from "@/lib/services/set-service";
import { prisma } from "@/lib/prisma";

// --- Arbitraries ---
const nonEmptyStringArb = fc
  .stringMatching(/^[A-Za-z0-9 ]{1,30}$/)
  .filter((s) => s.trim().length > 0);

// --- Mock setup helpers ---
function setupMocks() {
  const mockedSetCreate = vi.mocked(prisma.set.create);
  const mockedSetFindMany = vi.mocked(prisma.set.findMany);
  const mockedSetFindUnique = vi.mocked(prisma.set.findUnique);
  const mockedSetUpdate = vi.mocked(prisma.set.update);
  const mockedSessionFindFirst = vi.mocked(prisma.session.findFirst);

  // Set create: store and return
  mockedSetCreate.mockImplementation(async (args: any) => {
    const set: StoredSet = {
      id: nextId(),
      name: args.data.name,
      userId: args.data.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    sets.push(set);
    return set as any;
  });

  // Set findMany: return sets for user with _count and songs
  mockedSetFindMany.mockImplementation(async (args: any) => {
    const userId = args?.where?.userId;
    return sets
      .filter((s) => s.userId === userId)
      .map((s) => ({
        ...s,
        _count: { songs: 0 },
        songs: [],
      })) as any;
  });

  // Set findUnique: find by id
  mockedSetFindUnique.mockImplementation(async (args: any) => {
    const setId = args?.where?.id;
    const found = sets.find((s) => s.id === setId);
    return (found ?? null) as any;
  });

  // Set update: update name in store and return
  mockedSetUpdate.mockImplementation(async (args: any) => {
    const setId = args?.where?.id;
    const found = sets.find((s) => s.id === setId);
    if (!found) return null as any;
    if (args.data.name !== undefined) {
      found.name = args.data.name;
    }
    found.updatedAt = new Date();
    return { ...found } as any;
  });

  // Session findFirst: no sessions
  mockedSessionFindFirst.mockResolvedValue(null as any);
}

describe("Property 4: Set-CRUD Round-Trip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDb();
  });

  it("Erstellen und Abrufen liefert korrekten Namen; Umbenennen aktualisiert den Namen", () => {
    return fc.assert(
      fc.asyncProperty(
        nonEmptyStringArb,
        nonEmptyStringArb,
        async (setName, newName) => {
          vi.clearAllMocks();
          resetDb();
          setupMocks();

          const userId = "test-user-1";

          // 1. Create a set
          const created = await createSet(userId, setName);
          expect(created.name).toBe(setName.trim());
          expect(created.id).toBeDefined();

          // 2. List sets and verify the set appears with correct name
          const allSets = await listSets(userId);
          expect(allSets.length).toBe(1);
          expect(allSets[0].name).toBe(setName.trim());
          expect(allSets[0].id).toBe(created.id);

          // 3. Rename the set
          const updated = await updateSet(userId, created.id, newName);
          expect(updated.name).toBe(newName.trim());

          // 4. List sets again and verify the name is updated
          const allSetsAfterUpdate = await listSets(userId);
          expect(allSetsAfterUpdate.length).toBe(1);
          expect(allSetsAfterUpdate[0].name).toBe(newName.trim());
        }
      ),
      { numRuns: 20 }
    );
  });
});
