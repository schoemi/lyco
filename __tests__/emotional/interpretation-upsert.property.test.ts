/**
 * Property 1: Interpretation Upsert Round-Trip
 *
 * Für jeden Benutzer und jede Strophe eines eigenen Songs gilt: Das Erstellen einer
 * Interpretation über `upsertInterpretation` und anschließendes Abrufen über
 * `getInterpretationsForSong` muss den gleichen Text zurückgeben. Ein erneuter Aufruf
 * von `upsertInterpretation` für dieselbe Kombination muss den Text aktualisieren
 * (nicht duplizieren), sodass pro Benutzer und Strophe maximal eine Interpretation
 * existiert. Nach dem Löschen über `deleteInterpretation` darf die Interpretation
 * nicht mehr abrufbar sein.
 *
 * **Validates: Requirements 1.2, 2.1, 2.2, 2.3, 2.6**
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

// --- In-memory store ---
interface StoredInterpretation {
  id: string;
  userId: string;
  stropheId: string;
  text: string;
  updatedAt: Date;
}

let interpretationen: StoredInterpretation[] = [];
let idCounter = 0;

function nextId(): string {
  return `id-${++idCounter}`;
}

function resetDb() {
  interpretationen = [];
  idCounter = 0;
}

// --- Mock Prisma ---
const { mockPrisma } = vi.hoisted(() => {
  const _mockStrophe = { findUnique: vi.fn() };
  const _mockInterpretation = {
    upsert: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
  };
  const _mockSong = { findUnique: vi.fn() };

  const _mockPrisma: Record<string, unknown> = {
    strophe: _mockStrophe,
    interpretation: _mockInterpretation,
    song: _mockSong,
  };

  return { mockPrisma: _mockPrisma };
});

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import {
  upsertInterpretation,
  deleteInterpretation,
  getInterpretationsForSong,
} from "@/lib/services/interpretation-service";
import { prisma } from "@/lib/prisma";

// --- Arbitraries ---
const nonEmptyStringArb = fc
  .stringMatching(/^[A-Za-z0-9 ]{1,30}$/)
  .filter((s) => s.trim().length > 0);

// --- Mock setup ---
function setupMocks(userId: string, stropheId: string, songId: string) {
  const mockedStropheFindUnique = vi.mocked(prisma.strophe.findUnique);
  const mockedInterpretationUpsert = vi.mocked(prisma.interpretation.upsert);
  const mockedInterpretationFindMany = vi.mocked(prisma.interpretation.findMany);
  const mockedInterpretationFindUnique = vi.mocked(prisma.interpretation.findUnique);
  const mockedInterpretationDelete = vi.mocked(prisma.interpretation.delete);
  const mockedSongFindUnique = vi.mocked(prisma.song.findUnique);

  mockedStropheFindUnique.mockImplementation(async () => {
    return {
      id: stropheId,
      songId,
      song: { userId, id: songId },
    } as any;
  });

  mockedInterpretationUpsert.mockImplementation(async (args: any) => {
    const existing = interpretationen.find(
      (i) =>
        i.userId === args.where.userId_stropheId.userId &&
        i.stropheId === args.where.userId_stropheId.stropheId
    );
    if (existing) {
      existing.text = args.update.text;
      existing.updatedAt = new Date();
      return { ...existing } as any;
    }
    const interpretation: StoredInterpretation = {
      id: nextId(),
      userId: args.create.userId,
      stropheId: args.create.stropheId,
      text: args.create.text,
      updatedAt: new Date(),
    };
    interpretationen.push(interpretation);
    return { ...interpretation } as any;
  });

  mockedSongFindUnique.mockImplementation(async () => {
    return { id: songId, userId } as any;
  });

  mockedInterpretationFindMany.mockImplementation(async (args: any) => {
    return interpretationen.filter(
      (i) =>
        i.userId === args.where.userId &&
        i.stropheId === stropheId
    ) as any;
  });

  mockedInterpretationFindUnique.mockImplementation(async (args: any) => {
    return (
      interpretationen.find((i) => i.id === args.where.id) ?? null
    ) as any;
  });

  mockedInterpretationDelete.mockImplementation(async (args: any) => {
    const idx = interpretationen.findIndex((i) => i.id === args.where.id);
    if (idx !== -1) {
      const [removed] = interpretationen.splice(idx, 1);
      return { ...removed } as any;
    }
    return null as any;
  });
}

describe("Property 1: Interpretation Upsert Round-Trip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDb();
  });

  it("upsertInterpretation erstellt Interpretation, Abrufen liefert gleichen Text, erneuter Upsert aktualisiert ohne Duplikat, Löschen entfernt", () => {
    return fc.assert(
      fc.asyncProperty(
        nonEmptyStringArb,
        nonEmptyStringArb,
        async (text1, text2) => {
          vi.clearAllMocks();
          resetDb();

          const userId = "user-1";
          const stropheId = "strophe-1";
          const songId = "song-1";
          setupMocks(userId, stropheId, songId);

          // 1. Create: upsert creates interpretation
          const created = await upsertInterpretation(userId, stropheId, text1);
          expect(created.text).toBe(text1.trim());

          // 2. Retrieve: returns same text
          const retrieved = await getInterpretationsForSong(userId, songId);
          expect(retrieved).toHaveLength(1);
          expect(retrieved[0].text).toBe(text1.trim());

          // 3. Re-upsert: updates without duplicate
          const updated = await upsertInterpretation(userId, stropheId, text2);
          expect(updated.text).toBe(text2.trim());

          // Max one interpretation per user+strophe
          const afterUpdate = await getInterpretationsForSong(userId, songId);
          expect(afterUpdate).toHaveLength(1);
          expect(afterUpdate[0].text).toBe(text2.trim());

          // 4. Delete: no longer retrievable
          await deleteInterpretation(userId, created.id);

          const afterDelete = await getInterpretationsForSong(userId, songId);
          expect(afterDelete).toHaveLength(0);
        }
      ),
      { numRuns: 20 }
    );
  });
});
