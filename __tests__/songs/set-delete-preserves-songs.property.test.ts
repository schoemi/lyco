/**
 * Property 6: Set löschen erhält Songs
 *
 * Für jedes Set mit zugeordneten Songs gilt: Nach dem Löschen des Sets über
 * `deleteSet` müssen alle zuvor zugeordneten Songs weiterhin über `listSongs`
 * abrufbar sein.
 *
 * **Validates: Requirements 2.4**
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

interface StoredSetSong {
  id: string;
  setId: string;
  songId: string;
  createdAt: Date;
}

// --- In-memory database ---
let sets: StoredSet[] = [];
let songs: StoredSong[] = [];
let setSongs: StoredSetSong[] = [];
let idCounter = 0;

function nextId(prefix: string): string {
  return `${prefix}-${++idCounter}`;
}

function resetDb() {
  sets = [];
  songs = [];
  setSongs = [];
  idCounter = 0;
}

// --- Mock Prisma ---
const { mockPrisma } = vi.hoisted(() => {
  const _mockSet = {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
  };
  const _mockSong = {
    create: vi.fn(),
    findMany: vi.fn(),
  };
  const _mockSetSong = {
    create: vi.fn(),
    deleteMany: vi.fn(),
  };
  const _mockSession = { findFirst: vi.fn() };

  const _mockPrisma: Record<string, unknown> = {
    set: _mockSet,
    song: _mockSong,
    setSong: _mockSetSong,
    session: _mockSession,
  };

  return { mockPrisma: _mockPrisma };
});

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { createSet, deleteSet, addSongToSet } from "@/lib/services/set-service";
import { createSong, listSongs } from "@/lib/services/song-service";
import { prisma } from "@/lib/prisma";

// --- Arbitraries ---
const nonEmptyStringArb = fc
  .stringMatching(/^[A-Za-z0-9 ]{1,30}$/)
  .filter((s) => s.trim().length > 0);

const songCountArb = fc.integer({ min: 1, max: 3 });

// --- Mock setup helpers ---
function setupMocks() {
  const mockedSetCreate = vi.mocked(prisma.set.create);
  const mockedSetFindMany = vi.mocked(prisma.set.findMany);
  const mockedSetFindUnique = vi.mocked(prisma.set.findUnique);
  const mockedSetDelete = vi.mocked(prisma.set.delete);
  const mockedSongCreate = vi.mocked(prisma.song.create);
  const mockedSongFindMany = vi.mocked(prisma.song.findMany);
  const mockedSetSongCreate = vi.mocked(prisma.setSong.create);
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

  // Set findMany: return sets for user with _count and songs
  mockedSetFindMany.mockImplementation(async (args: any) => {
    const userId = args?.where?.userId;
    return sets
      .filter((s) => s.userId === userId)
      .map((s) => {
        const songCount = setSongs.filter((ss) => ss.setId === s.id).length;
        return {
          ...s,
          _count: { songs: songCount },
          songs: setSongs
            .filter((ss) => ss.setId === s.id)
            .map((ss) => ({ createdAt: ss.createdAt })),
        };
      }) as any;
  });

  // Set findUnique: find by id
  mockedSetFindUnique.mockImplementation(async (args: any) => {
    const setId = args?.where?.id;
    const found = sets.find((s) => s.id === setId);
    return (found ?? null) as any;
  });

  // Set delete: remove the set and its setSong entries (cascade on SetSong, NOT on Song)
  mockedSetDelete.mockImplementation(async (args: any) => {
    const setId = args?.where?.id;
    const found = sets.find((s) => s.id === setId);
    // Remove setSong entries for this set (simulating cascade on SetSong)
    setSongs = setSongs.filter((ss) => ss.setId !== setId);
    // Remove the set itself
    sets = sets.filter((s) => s.id !== setId);
    return found as any;
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

  // Song findMany: return songs for user with strophen and _count
  mockedSongFindMany.mockImplementation(async (args: any) => {
    const userId = args?.where?.userId;
    return songs
      .filter((s) => s.userId === userId)
      .map((s) => ({
        ...s,
        strophen: [],
        _count: { sessions: 0 },
      })) as any;
  });

  // SetSong create: store association
  mockedSetSongCreate.mockImplementation(async (args: any) => {
    const exists = setSongs.find(
      (ss) => ss.setId === args.data.setId && ss.songId === args.data.songId
    );
    if (exists) {
      const err = new Error("Unique constraint failed") as any;
      err.code = "P2002";
      throw err;
    }
    const entry: StoredSetSong = {
      id: nextId("ss"),
      setId: args.data.setId,
      songId: args.data.songId,
      createdAt: new Date(),
    };
    setSongs.push(entry);
    return entry as any;
  });

  // Session findFirst: no sessions
  mockedSessionFindFirst.mockResolvedValue(null as any);
}

describe("Property 6: Set löschen erhält Songs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDb();
  });

  it("Nach Löschen eines Sets sind alle zugeordneten Songs weiterhin über listSongs abrufbar", () => {
    return fc.assert(
      fc.asyncProperty(
        nonEmptyStringArb,
        songCountArb,
        fc.array(nonEmptyStringArb, { minLength: 3, maxLength: 3 }),
        async (setName, songCount, songTitles) => {
          vi.clearAllMocks();
          resetDb();
          setupMocks();

          const userId = "test-user-1";
          const titles = songTitles.slice(0, songCount);

          // 1. Create a set
          const createdSet = await createSet(userId, setName);

          // 2. Create 1-3 songs
          const createdSongs = [];
          for (const title of titles) {
            const song = await createSong(userId, { titel: title });
            createdSongs.push(song);
          }

          // 3. Add all songs to the set
          for (const song of createdSongs) {
            await addSongToSet(userId, createdSet.id, song.id);
          }

          // 4. Delete the set
          await deleteSet(userId, createdSet.id);

          // 5. Verify all songs are still available via listSongs
          const allSongs = await listSongs(userId);
          for (const song of createdSongs) {
            const found = allSongs.find((s) => s.id === song.id);
            expect(found).toBeDefined();
            expect(found!.titel).toBe(song.titel);
          }

          // Also verify the set is gone
          const remainingSets = sets.filter((s) => s.id === createdSet.id);
          expect(remainingSets).toHaveLength(0);

          // And setSong entries are gone
          const remainingAssociations = setSongs.filter(
            (ss) => ss.setId === createdSet.id
          );
          expect(remainingAssociations).toHaveLength(0);
        }
      ),
      { numRuns: 20 }
    );
  });
});
