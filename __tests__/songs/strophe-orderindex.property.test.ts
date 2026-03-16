/**
 * Property 2: Strophe orderIndex auto-assignment
 *
 * Für jede Sequenz von createStrophe-Aufrufen auf einem Song
 * muss jede neu erstellte Strophe den nächsten sequentiellen orderIndex erhalten (0, 1, 2, ...).
 *
 * **Validates: Requirements 4.3, 12.1**
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

import { createStrophe } from "@/lib/services/strophe-service";
import { prisma } from "@/lib/prisma";

// --- Arbitraries ---
const nonEmptyStringArb = fc
  .stringMatching(/^[A-Za-z0-9 ]{1,20}$/)
  .filter((s) => s.trim().length > 0);

// Generate an array of 1–10 strophe names
const stropheNamesArb = fc
  .array(nonEmptyStringArb, { minLength: 1, maxLength: 10 });

// --- Mock setup ---
function setupMocks() {
  const mockedSongFindUnique = vi.mocked(prisma.song.findUnique);
  const mockedStropheAggregate = vi.mocked(prisma.strophe.aggregate);
  const mockedStropheCreate = vi.mocked(prisma.strophe.create);

  mockedSongFindUnique.mockImplementation(async (args: any) => {
    const songId = args?.where?.id;
    const found = songs.find((s) => s.id === songId);
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

  mockedStropheCreate.mockImplementation(async (args: any) => {
    const data = args?.data;
    const newStrophe: StoredStrophe = {
      id: nextId("strophe"),
      name: data.name,
      orderIndex: data.orderIndex,
      songId: data.songId,
      createdAt: new Date(),
    };
    strophen.push(newStrophe);

    // Return shape matching stropheInclude (zeilen, markups, fortschritte, notizen)
    return {
      ...newStrophe,
      zeilen: [],
      markups: [],
      fortschritte: [],
      notizen: [],
    } as any;
  });
}

// Helper to seed a song owned by owner
function seedSong(ownerId: string): StoredSong {
  const song: StoredSong = {
    id: nextId("song"),
    titel: "Test Song",
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

describe("Property 2: Strophe orderIndex auto-assignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDb();
  });

  it("newly created strophen always receive the next sequential orderIndex (0, 1, 2, ...)", () => {
    return fc.assert(
      fc.asyncProperty(stropheNamesArb, async (names) => {
        vi.clearAllMocks();
        resetDb();
        setupMocks();

        const userId = "user-1";
        const song = seedSong(userId);

        for (let i = 0; i < names.length; i++) {
          const result = await createStrophe(userId, song.id, {
            name: names[i],
          });

          // Each strophe must get the sequential orderIndex
          expect(result.orderIndex).toBe(i);
        }
      }),
      { numRuns: 50 }
    );
  });
});
