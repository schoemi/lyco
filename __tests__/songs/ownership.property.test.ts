/**
 * Property 7: Ownership-Prüfung
 *
 * Für jede Ressource (Set, Song) und jeden Benutzer, der nicht der Eigentümer ist,
 * muss jeder Versuch, die Ressource zu lesen, zu bearbeiten oder zu löschen,
 * mit einem Fehler abgelehnt werden ("Zugriff verweigert").
 *
 * **Validates: Requirements 2.5, 3.5, 5.4, 6.5, 8.4, 9.2, 9.3, 12.8**
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
    findUnique: vi.fn(),
  };
  const _mockSong = {
    create: vi.fn(),
    findUnique: vi.fn(),
  };
  const _mockSession = {
    count: vi.fn(),
    findFirst: vi.fn(),
  };
  const _mockSetSong = {
    create: vi.fn(),
    deleteMany: vi.fn(),
  };

  const _mockPrisma: Record<string, unknown> = {
    set: _mockSet,
    song: _mockSong,
    session: _mockSession,
    setSong: _mockSetSong,
  };

  return { mockPrisma: _mockPrisma };
});

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import {
  updateSet,
  deleteSet,
  addSongToSet,
  removeSongFromSet,
} from "@/lib/services/set-service";
import {
  getSongDetail,
  updateSong,
  deleteSong,
} from "@/lib/services/song-service";
import { prisma } from "@/lib/prisma";

// --- Arbitraries ---
const nonEmptyStringArb = fc
  .stringMatching(/^[A-Za-z0-9 ]{1,20}$/)
  .filter((s) => s.trim().length > 0);

// --- Mock setup helpers ---
function setupMocks() {
  const mockedSetCreate = vi.mocked(prisma.set.create);
  const mockedSetFindUnique = vi.mocked(prisma.set.findUnique);
  const mockedSongCreate = vi.mocked(prisma.song.create);
  const mockedSongFindUnique = vi.mocked(prisma.song.findUnique);
  const mockedSessionCount = vi.mocked(prisma.session.count);
  const mockedSessionFindFirst = vi.mocked(prisma.session.findFirst);

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

  // Set findUnique: find by id
  mockedSetFindUnique.mockImplementation(async (args: any) => {
    const setId = args?.where?.id;
    const found = sets.find((s) => s.id === setId);
    return (found ?? null) as any;
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

  // Song findUnique: find by id, return with strophen structure for getSongDetail
  mockedSongFindUnique.mockImplementation(async (args: any) => {
    const songId = args?.where?.id;
    const found = songs.find((s) => s.id === songId);
    if (!found) return null as any;

    // If include is present (getSongDetail path), return with strophen
    if (args?.include?.strophen) {
      return {
        ...found,
        strophen: [],
      } as any;
    }

    return found as any;
  });

  // Session count: always 0
  mockedSessionCount.mockResolvedValue(0);
  mockedSessionFindFirst.mockResolvedValue(null as any);
}

// Helper to seed a set owned by owner
async function seedSet(ownerId: string, name: string): Promise<StoredSet> {
  const set: StoredSet = {
    id: nextId("set"),
    name,
    userId: ownerId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  sets.push(set);
  return set;
}

// Helper to seed a song owned by owner
async function seedSong(ownerId: string, titel: string): Promise<StoredSong> {
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

describe("Property 7: Ownership-Prüfung", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDb();
  });

  it("Nicht-Eigentümer wird bei Set-Operationen (updateSet, deleteSet, addSongToSet, removeSongFromSet) abgelehnt", () => {
    return fc.assert(
      fc.asyncProperty(
        nonEmptyStringArb,
        nonEmptyStringArb,
        async (setName, newName) => {
          vi.clearAllMocks();
          resetDb();
          setupMocks();

          const owner = "user-1";
          const intruder = "user-2";

          // Create a set owned by user-1
          const set = await seedSet(owner, setName);
          // Create a song owned by user-1 (for addSongToSet/removeSongFromSet)
          const song = await seedSong(owner, "Test Song");

          // updateSet as non-owner → "Zugriff verweigert"
          await expect(updateSet(intruder, set.id, newName)).rejects.toThrow(
            "Zugriff verweigert"
          );

          // deleteSet as non-owner → "Zugriff verweigert"
          await expect(deleteSet(intruder, set.id)).rejects.toThrow(
            "Zugriff verweigert"
          );

          // addSongToSet as non-owner → "Zugriff verweigert"
          await expect(
            addSongToSet(intruder, set.id, song.id)
          ).rejects.toThrow("Zugriff verweigert");

          // removeSongFromSet as non-owner → "Zugriff verweigert"
          await expect(
            removeSongFromSet(intruder, set.id, song.id)
          ).rejects.toThrow("Zugriff verweigert");
        }
      ),
      { numRuns: 20 }
    );
  });

  it("Nicht-Eigentümer wird bei Song-Operationen (getSongDetail, updateSong, deleteSong) abgelehnt", () => {
    return fc.assert(
      fc.asyncProperty(nonEmptyStringArb, async (titel) => {
        vi.clearAllMocks();
        resetDb();
        setupMocks();

        const owner = "user-1";
        const intruder = "user-2";

        // Create a song owned by user-1
        const song = await seedSong(owner, titel);

        // getSongDetail as non-owner → "Zugriff verweigert"
        await expect(getSongDetail(intruder, song.id)).rejects.toThrow(
          "Zugriff verweigert"
        );

        // updateSong as non-owner → "Zugriff verweigert"
        await expect(
          updateSong(intruder, song.id, { titel: "Hacked" })
        ).rejects.toThrow("Zugriff verweigert");

        // deleteSong as non-owner → "Zugriff verweigert"
        await expect(deleteSong(intruder, song.id)).rejects.toThrow(
          "Zugriff verweigert"
        );
      }),
      { numRuns: 20 }
    );
  });
});
