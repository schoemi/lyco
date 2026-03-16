/**
 * Property 1: Strophe ownership enforcement
 *
 * Für jede Strophe-Operation (createStrophe, updateStrophe, deleteStrophe, reorderStrophen)
 * und jeden Benutzer, der nicht der Eigentümer des Songs ist,
 * muss der Versuch mit einem Fehler abgelehnt werden ("Zugriff verweigert").
 *
 * **Validates: Requirements 12.10**
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

// --- In-memory store types ---
interface StoredSong {
  id: string;
  titel: string;
  kuenstler: string | null;
  sprache: string | null;
  emotionsTags: string[];
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface StoredStrophe {
  id: string;
  name: string;
  orderIndex: number;
  songId: string;
  createdAt: Date;
}

// --- In-memory database ---
let songs: StoredSong[] = [];
let strophen: StoredStrophe[] = [];
let idCounter = 0;

function nextId(prefix: string): string {
  return `${prefix}-${++idCounter}`;
}

function resetDb() {
  songs = [];
  strophen = [];
  idCounter = 0;
}

// --- Mock Prisma ---
const { mockPrisma } = vi.hoisted(() => {
  const _mockSong = {
    findUnique: vi.fn(),
  };
  const _mockStrophe = {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    aggregate: vi.fn(),
  };
  const _mockPrisma: Record<string, unknown> = {
    song: _mockSong,
    strophe: _mockStrophe,
    $transaction: vi.fn(),
  };
  return { mockPrisma: _mockPrisma };
});

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import {
  createStrophe,
  updateStrophe,
  deleteStrophe,
  reorderStrophen,
} from "@/lib/services/strophe-service";
import { prisma } from "@/lib/prisma";

// --- Arbitraries ---
const nonEmptyStringArb = fc
  .stringMatching(/^[A-Za-z0-9 ]{1,20}$/)
  .filter((s) => s.trim().length > 0);

// --- Mock setup ---
function setupMocks() {
  const mockedSongFindUnique = vi.mocked(prisma.song.findUnique);
  const mockedStropheFindUnique = vi.mocked(prisma.strophe.findUnique);
  const mockedStropheAggregate = vi.mocked(prisma.strophe.aggregate);
  const mockedStropheFindMany = vi.mocked(prisma.strophe.findMany);

  mockedSongFindUnique.mockImplementation(async (args: any) => {
    const songId = args?.where?.id;
    const found = songs.find((s) => s.id === songId);
    return (found ?? null) as any;
  });

  mockedStropheFindUnique.mockImplementation(async (args: any) => {
    const stropheId = args?.where?.id;
    const found = strophen.find((s) => s.id === stropheId);
    return (found ?? null) as any;
  });

  mockedStropheAggregate.mockImplementation(async (args: any) => {
    const songId = args?.where?.songId;
    const songStrophen = strophen.filter((s) => s.songId === songId);
    const maxOrder =
      songStrophen.length > 0
        ? Math.max(...songStrophen.map((s) => s.orderIndex))
        : null;
    return { _max: { orderIndex: maxOrder } } as any;
  });

  mockedStropheFindMany.mockImplementation(async (args: any) => {
    const songId = args?.where?.songId;
    return strophen
      .filter((s) => s.songId === songId)
      .map((s) => ({ id: s.id })) as any;
  });
}

// Helper to seed a song owned by owner
function seedSong(ownerId: string, titel: string): StoredSong {
  const song: StoredSong = {
    id: nextId("song"),
    titel,
    kuenstler: null,
    sprache: null,
    emotionsTags: [],
    userId: ownerId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  songs.push(song);
  return song;
}

// Helper to seed a strophe belonging to a song
function seedStrophe(songId: string, name: string, orderIndex: number): StoredStrophe {
  const strophe: StoredStrophe = {
    id: nextId("strophe"),
    name,
    orderIndex,
    songId,
    createdAt: new Date(),
  };
  strophen.push(strophe);
  return strophe;
}

describe("Property 1: Strophe ownership enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDb();
  });

  it("createStrophe rejects when userId !== song.userId", () => {
    return fc.assert(
      fc.asyncProperty(
        nonEmptyStringArb,
        nonEmptyStringArb,
        async (songTitel, stropheName) => {
          vi.clearAllMocks();
          resetDb();
          setupMocks();

          const owner = "owner-1";
          const intruder = "intruder-2";

          const song = seedSong(owner, songTitel);

          await expect(
            createStrophe(intruder, song.id, { name: stropheName })
          ).rejects.toThrow("Zugriff verweigert");
        }
      ),
      { numRuns: 20 }
    );
  });

  it("updateStrophe rejects when userId !== song.userId", () => {
    return fc.assert(
      fc.asyncProperty(
        nonEmptyStringArb,
        nonEmptyStringArb,
        async (songTitel, newName) => {
          vi.clearAllMocks();
          resetDb();
          setupMocks();

          const owner = "owner-1";
          const intruder = "intruder-2";

          const song = seedSong(owner, songTitel);
          const strophe = seedStrophe(song.id, "Verse 1", 0);

          await expect(
            updateStrophe(intruder, song.id, strophe.id, { name: newName })
          ).rejects.toThrow("Zugriff verweigert");
        }
      ),
      { numRuns: 20 }
    );
  });

  it("deleteStrophe rejects when userId !== song.userId", () => {
    return fc.assert(
      fc.asyncProperty(nonEmptyStringArb, async (songTitel) => {
        vi.clearAllMocks();
        resetDb();
        setupMocks();

        const owner = "owner-1";
        const intruder = "intruder-2";

        const song = seedSong(owner, songTitel);
        const strophe = seedStrophe(song.id, "Chorus", 0);

        await expect(
          deleteStrophe(intruder, song.id, strophe.id)
        ).rejects.toThrow("Zugriff verweigert");
      }),
      { numRuns: 20 }
    );
  });

  it("reorderStrophen rejects when userId !== song.userId", () => {
    return fc.assert(
      fc.asyncProperty(nonEmptyStringArb, async (songTitel) => {
        vi.clearAllMocks();
        resetDb();
        setupMocks();

        const owner = "owner-1";
        const intruder = "intruder-2";

        const song = seedSong(owner, songTitel);
        const s1 = seedStrophe(song.id, "Verse 1", 0);
        const s2 = seedStrophe(song.id, "Verse 2", 1);

        await expect(
          reorderStrophen(intruder, song.id, [
            { id: s1.id, orderIndex: 1 },
            { id: s2.id, orderIndex: 0 },
          ])
        ).rejects.toThrow("Zugriff verweigert");
      }),
      { numRuns: 20 }
    );
  });
});
