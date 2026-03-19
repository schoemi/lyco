/**
 * Property 5: Set-Song-Zuordnung Round-Trip
 *
 * Für jeden Song und jedes Set desselben Benutzers gilt: Nach dem Hinzufügen
 * des Songs zum Set über `addSongToSet` muss der Song in der Song-Liste des
 * Sets erscheinen. Nach dem Entfernen über `removeSongFromSet` darf der Song
 * nicht mehr im Set erscheinen, muss aber weiterhin als eigenständiger Song
 * existieren.
 *
 * **Validates: Requirements 1.2, 2.7, 2.8**
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

import { createSet, listSets, addSongToSet, removeSongFromSet } from "@/lib/services/set-service";
import { createSong, listSongs } from "@/lib/services/song-service";
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
  const mockedSongCreate = vi.mocked(prisma.song.create);
  const mockedSongFindMany = vi.mocked(prisma.song.findMany);
  const mockedSetSongCreate = vi.mocked(prisma.setSong.create);
  const mockedSetSongDeleteMany = vi.mocked(prisma.setSong.deleteMany);
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
    // Check for duplicate
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

  // SetSong deleteMany: remove association
  mockedSetSongDeleteMany.mockImplementation(async (args: any) => {
    const before = setSongs.length;
    setSongs = setSongs.filter(
      (ss) => !(ss.setId === args.where.setId && ss.songId === args.where.songId)
    );
    return { count: before - setSongs.length } as any;
  });

  // Session findFirst: no sessions
  mockedSessionFindFirst.mockResolvedValue(null as any);
}

describe("Property 5: Set-Song-Zuordnung Round-Trip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDb();
  });

  it("Nach Hinzufügen erscheint Song im Set; nach Entfernen nicht mehr im Set, aber weiterhin als eigenständiger Song", () => {
    return fc.assert(
      fc.asyncProperty(
        nonEmptyStringArb,
        nonEmptyStringArb,
        async (setName, songTitle) => {
          vi.clearAllMocks();
          resetDb();
          setupMocks();

          const userId = "test-user-1";

          // 1. Create a set and a song
          const createdSet = await createSet(userId, { name: setName });
          const createdSong = await createSong(userId, { titel: songTitle });

          // 2. Add the song to the set
          await addSongToSet(userId, createdSet.id, createdSong.id);

          // 3. Verify the song appears in the set (songCount should be 1)
          const setsAfterAdd = await listSets(userId);
          const targetSet = setsAfterAdd.find((s) => s.id === createdSet.id);
          expect(targetSet).toBeDefined();
          expect(targetSet!.songCount).toBe(1);

          // Also verify via in-memory store that the association exists
          const association = setSongs.find(
            (ss) => ss.setId === createdSet.id && ss.songId === createdSong.id
          );
          expect(association).toBeDefined();

          // 4. Remove the song from the set
          await removeSongFromSet(userId, createdSet.id, createdSong.id);

          // 5. Verify the song is no longer in the set
          const setsAfterRemove = await listSets(userId);
          const targetSetAfter = setsAfterRemove.find((s) => s.id === createdSet.id);
          expect(targetSetAfter).toBeDefined();
          expect(targetSetAfter!.songCount).toBe(0);

          // 6. Verify the song still exists as a standalone song
          const allSongs = await listSongs(userId);
          const songStillExists = allSongs.find((s) => s.id === createdSong.id);
          expect(songStillExists).toBeDefined();
          expect(songStillExists!.titel).toBe(songTitle.trim());
        }
      ),
      { numRuns: 20 }
    );
  });
});
