/**
 * Property 8: Pflichtfeld-Validierung
 *
 * Für jeden leeren oder nur aus Whitespace bestehenden String als Set-Name
 * oder Song-Titel muss die Erstellung abgelehnt werden und die Datenbank
 * darf sich nicht verändern.
 *
 * **Validates: Requirements 2.6, 3.6**
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

// --- In-memory database ---
let sets: StoredSet[] = [];
let songs: StoredSong[] = [];
let idCounter = 0;

function nextId(prefix: string): string {
  return `${prefix}-${++idCounter}`;
}

function resetDb() {
  sets = [];
  songs = [];
  idCounter = 0;
}

// --- Mock Prisma ---
const { mockPrisma } = vi.hoisted(() => {
  const _mockSet = {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
  };
  const _mockSong = {
    create: vi.fn(),
    findMany: vi.fn(),
  };
  const _mockSession = {
    findFirst: vi.fn(),
  };

  const _mockPrisma: Record<string, unknown> = {
    set: _mockSet,
    song: _mockSong,
    session: _mockSession,
  };

  return { mockPrisma: _mockPrisma };
});

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { createSet } from "@/lib/services/set-service";
import { createSong } from "@/lib/services/song-service";
import { prisma } from "@/lib/prisma";

// --- Arbitrary: empty or whitespace-only strings ---
const whitespaceOnlyArb = fc.constantFrom("", " ", "  ", "\t", "\n", "   ", " \t\n ");

// --- Mock setup helpers ---
function setupMocks() {
  const mockedSetCreate = vi.mocked(prisma.set.create);
  const mockedSongCreate = vi.mocked(prisma.song.create);

  // Set create: store and return
  mockedSetCreate.mockImplementation(async (args: any) => {
    const set: StoredSet = {
      id: nextId("set"),
      name: args.data.name,
      userId: args.data.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    sets.push(set);
    return set as any;
  });

  // Song create: store and return
  mockedSongCreate.mockImplementation(async (args: any) => {
    const song: StoredSong = {
      id: nextId("song"),
      titel: args.data.titel,
      kuenstler: args.data.kuenstler ?? null,
      sprache: args.data.sprache ?? null,
      emotionsTags: args.data.emotionsTags ?? [],
      userId: args.data.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    songs.push(song);
    return song as any;
  });
}

describe("Property 8: Pflichtfeld-Validierung", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDb();
  });

  it("Leerer oder Whitespace-String als Set-Name wird abgelehnt, Datenbank bleibt unverändert", () => {
    return fc.assert(
      fc.asyncProperty(whitespaceOnlyArb, async (invalidName) => {
        vi.clearAllMocks();
        resetDb();
        setupMocks();

        const userId = "test-user-1";
        const setsBefore = sets.length;

        // Attempt to create a set with invalid name → expect rejection
        await expect(createSet(userId, invalidName)).rejects.toThrow(
          "Name ist erforderlich"
        );

        // Database must remain unchanged
        expect(sets.length).toBe(setsBefore);
      }),
      { numRuns: 20 }
    );
  });

  it("Leerer oder Whitespace-String als Song-Titel wird abgelehnt, Datenbank bleibt unverändert", () => {
    return fc.assert(
      fc.asyncProperty(whitespaceOnlyArb, async (invalidTitle) => {
        vi.clearAllMocks();
        resetDb();
        setupMocks();

        const userId = "test-user-1";
        const songsBefore = songs.length;

        // Attempt to create a song with invalid title → expect rejection
        await expect(
          createSong(userId, { titel: invalidTitle })
        ).rejects.toThrow("Titel ist erforderlich");

        // Database must remain unchanged
        expect(songs.length).toBe(songsBefore);
      }),
      { numRuns: 20 }
    );
  });
});
