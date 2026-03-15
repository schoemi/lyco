/**
 * Property 10: Notiz Upsert Round-Trip
 *
 * Für jeden Benutzer und jede Strophe eines eigenen Songs: Das Erstellen einer Notiz
 * über `upsertNote` und anschließendes Abrufen muss den gleichen Text zurückgeben.
 * Ein erneuter Aufruf von `upsertNote` für dieselbe Kombination muss den Text
 * aktualisieren (nicht duplizieren), sodass pro Benutzer und Strophe maximal eine
 * Notiz existiert.
 *
 * **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

// --- In-memory store ---
interface StoredNotiz {
  id: string;
  userId: string;
  stropheId: string;
  text: string;
  updatedAt: Date;
}

interface StoredStrophe {
  id: string;
  songId: string;
  song: { userId: string };
}

let notizen: StoredNotiz[] = [];
let idCounter = 0;

function nextId(): string {
  return `id-${++idCounter}`;
}

function resetDb() {
  notizen = [];
  idCounter = 0;
}

// --- Mock Prisma ---
const { mockPrisma } = vi.hoisted(() => {
  const _mockStrophe = { findUnique: vi.fn() };
  const _mockNotiz = { upsert: vi.fn(), findMany: vi.fn() };
  const _mockSong = { findUnique: vi.fn() };

  const _mockPrisma: Record<string, unknown> = {
    strophe: _mockStrophe,
    notiz: _mockNotiz,
    song: _mockSong,
  };

  return { mockPrisma: _mockPrisma };
});

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { upsertNote, getNotesForSong } from "@/lib/services/note-service";
import { prisma } from "@/lib/prisma";

// --- Arbitraries ---
const nonEmptyStringArb = fc
  .stringMatching(/^[A-Za-z0-9 ]{1,30}$/)
  .filter((s) => s.trim().length > 0);

// --- Mock setup ---
function setupMocks(userId: string, stropheId: string, songId: string) {
  const mockedStropheFindUnique = vi.mocked(prisma.strophe.findUnique);
  const mockedNotizUpsert = vi.mocked(prisma.notiz.upsert);
  const mockedNotizFindMany = vi.mocked(prisma.notiz.findMany);
  const mockedSongFindUnique = vi.mocked(prisma.song.findUnique);

  mockedStropheFindUnique.mockImplementation(async () => {
    return {
      id: stropheId,
      songId,
      song: { userId, id: songId },
    } as any;
  });

  mockedNotizUpsert.mockImplementation(async (args: any) => {
    const existing = notizen.find(
      (n) => n.userId === args.where.userId_stropheId.userId &&
             n.stropheId === args.where.userId_stropheId.stropheId
    );
    if (existing) {
      existing.text = args.update.text;
      existing.updatedAt = new Date();
      return { ...existing } as any;
    }
    const notiz: StoredNotiz = {
      id: nextId(),
      userId: args.create.userId,
      stropheId: args.create.stropheId,
      text: args.create.text,
      updatedAt: new Date(),
    };
    notizen.push(notiz);
    return { ...notiz } as any;
  });

  mockedSongFindUnique.mockImplementation(async () => {
    return { id: songId, userId } as any;
  });

  mockedNotizFindMany.mockImplementation(async (args: any) => {
    return notizen.filter(
      (n) => n.userId === args.where.userId &&
             n.stropheId === stropheId
    ) as any;
  });
}

describe("Property 10: Notiz Upsert Round-Trip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDb();
  });

  it("upsertNote erstellt Notiz, Abrufen liefert gleichen Text, erneuter Upsert aktualisiert ohne Duplikat", () => {
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

          // First upsert: creates note
          const created = await upsertNote(userId, stropheId, text1);
          expect(created.text).toBe(text1.trim());

          // Retrieve: returns same text
          const retrieved = await getNotesForSong(userId, songId);
          expect(retrieved).toHaveLength(1);
          expect(retrieved[0].text).toBe(text1.trim());

          // Second upsert: updates (not duplicates)
          const updated = await upsertNote(userId, stropheId, text2);
          expect(updated.text).toBe(text2.trim());

          // Max one note per user+strophe
          const afterUpdate = await getNotesForSong(userId, songId);
          expect(afterUpdate).toHaveLength(1);
          expect(afterUpdate[0].text).toBe(text2.trim());
        }
      ),
      { numRuns: 20 }
    );
  });
});
