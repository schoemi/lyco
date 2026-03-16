/**
 * Property 5: Zeile orderIndex auto-assignment
 *
 * Für jede Sequenz von createZeile-Aufrufen auf einer Strophe
 * muss jede neu erstellte Zeile den nächsten sequentiellen orderIndex erhalten (0, 1, 2, ...).
 *
 * **Validates: Requirements 8.3, 12.5**
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

interface StoredZeile {
  id: string;
  text: string;
  uebersetzung: string | null;
  orderIndex: number;
  stropheId: string;
}

// --- In-memory database ---
let songs: StoredSong[] = [];
let strophen: StoredStrophe[] = [];
let zeilen: StoredZeile[] = [];
let idCounter = 0;

function nextId(prefix: string): string {
  return `${prefix}-${++idCounter}`;
}

function resetDb() {
  songs = [];
  strophen = [];
  zeilen = [];
  idCounter = 0;
}

// --- Mock Prisma ---
const { mockPrisma } = vi.hoisted(() => {
  const _mockSong = {
    findUnique: vi.fn(),
  };
  const _mockStrophe = {
    findUnique: vi.fn(),
  };
  const _mockZeile = {
    aggregate: vi.fn(),
    create: vi.fn(),
  };
  const _mockPrisma: Record<string, unknown> = {
    song: _mockSong,
    strophe: _mockStrophe,
    zeile: _mockZeile,
  };
  return { mockPrisma: _mockPrisma };
});

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { createZeile } from "@/lib/services/zeile-service";
import { prisma } from "@/lib/prisma";

// --- Arbitraries ---
const nonEmptyStringArb = fc
  .stringMatching(/^[A-Za-z0-9 ]{1,30}$/)
  .filter((s) => s.trim().length > 0);

// Generate an array of 1–10 zeile texts
const zeileTextsArb = fc.array(nonEmptyStringArb, { minLength: 1, maxLength: 10 });

// --- Mock setup ---
function setupMocks() {
  const mockedSongFindUnique = vi.mocked(prisma.song.findUnique);
  const mockedStropheFindUnique = vi.mocked(prisma.strophe.findUnique);
  const mockedZeileAggregate = vi.mocked(prisma.zeile.aggregate);
  const mockedZeileCreate = vi.mocked(prisma.zeile.create);

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

  mockedZeileAggregate.mockImplementation(async (args: any) => {
    const stropheId = args?.where?.stropheId;
    const stropheZeilen = zeilen.filter((z) => z.stropheId === stropheId);
    const maxOrder =
      stropheZeilen.length > 0
        ? Math.max(...stropheZeilen.map((z) => z.orderIndex))
        : null;
    return { _max: { orderIndex: maxOrder } } as any;
  });

  mockedZeileCreate.mockImplementation(async (args: any) => {
    const data = args?.data;
    const newZeile: StoredZeile = {
      id: nextId("zeile"),
      text: data.text,
      uebersetzung: data.uebersetzung ?? null,
      orderIndex: data.orderIndex,
      stropheId: data.stropheId,
    };
    zeilen.push(newZeile);

    return {
      ...newZeile,
      markups: [],
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

// Helper to seed a strophe belonging to a song
function seedStrophe(songId: string): StoredStrophe {
  const strophe: StoredStrophe = {
    id: nextId("strophe"),
    name: "Test Strophe",
    orderIndex: 0,
    songId,
    createdAt: new Date(),
  };
  strophen.push(strophe);
  return strophe;
}

describe("Property 5: Zeile orderIndex auto-assignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDb();
  });

  it("newly created zeilen always receive the next sequential orderIndex (0, 1, 2, ...)", () => {
    return fc.assert(
      fc.asyncProperty(zeileTextsArb, async (texts) => {
        vi.clearAllMocks();
        resetDb();
        setupMocks();

        const userId = "user-1";
        const song = seedSong(userId);
        const strophe = seedStrophe(song.id);

        for (let i = 0; i < texts.length; i++) {
          const result = await createZeile(userId, song.id, strophe.id, {
            text: texts[i],
          });

          // Each zeile must get the sequential orderIndex
          expect(result.orderIndex).toBe(i);
        }
      }),
      { numRuns: 50 }
    );
  });
});
