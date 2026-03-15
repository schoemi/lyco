/**
 * Property 2: Song-CRUD Round-Trip
 *
 * Für jede gültige Kombination aus Titel (nicht leer), optionalem Künstler,
 * optionaler Sprache und optionalen Emotions_Tags gilt: Nach dem Erstellen
 * eines Songs über `createSong` und anschließendem Abrufen über `listSongs`
 * muss der Song mit identischen Metadaten enthalten sein. Nach dem Aktualisieren
 * über `updateSong` müssen die geänderten Felder die neuen Werte enthalten und
 * unveränderte Felder unverändert bleiben.
 *
 * **Validates: Requirements 3.1, 3.3, 3.7**
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import type { CreateSongInput, UpdateSongInput } from "../../src/types/song";

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

// --- In-memory database ---
let songs: StoredSong[] = [];
let idCounter = 0;

function nextId(): string {
  return `id-${++idCounter}`;
}

function resetDb() {
  songs = [];
  idCounter = 0;
}

// --- Mock Prisma ---
const { mockPrisma } = vi.hoisted(() => {
  const _mockSong = {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  };
  const _mockSession = { count: vi.fn() };

  const _mockPrisma: Record<string, unknown> = {
    song: _mockSong,
    session: _mockSession,
  };

  _mockPrisma.$transaction = vi.fn(
    async (fn: (tx: unknown) => Promise<unknown>) => fn(_mockPrisma)
  );

  return { mockPrisma: _mockPrisma };
});

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { createSong, listSongs, updateSong } from "@/lib/services/song-service";
import { prisma } from "@/lib/prisma";

// --- Arbitraries ---
const nonEmptyStringArb = fc
  .stringMatching(/^[A-Za-z0-9 ]{1,20}$/)
  .filter((s) => s.trim().length > 0);

const optionalStringArb = fc.option(nonEmptyStringArb, { nil: undefined });

const emotionsTagsArb = fc.array(nonEmptyStringArb, { minLength: 0, maxLength: 3 });

const createSongInputArb: fc.Arbitrary<CreateSongInput> = fc.record({
  titel: nonEmptyStringArb,
  kuenstler: optionalStringArb,
  sprache: optionalStringArb,
  emotionsTags: fc.option(emotionsTagsArb, { nil: undefined }),
});

const updateSongInputArb: fc.Arbitrary<UpdateSongInput> = fc.record({
  titel: fc.option(nonEmptyStringArb, { nil: undefined }),
  kuenstler: fc.option(nonEmptyStringArb, { nil: undefined }),
  sprache: fc.option(nonEmptyStringArb, { nil: undefined }),
  emotionsTags: fc.option(emotionsTagsArb, { nil: undefined }),
});

// --- Mock setup helpers ---
function setupMocks() {
  const mockedSongCreate = vi.mocked(prisma.song.create);
  const mockedSongFindMany = vi.mocked(prisma.song.findMany);
  const mockedSongFindUnique = vi.mocked(prisma.song.findUnique);
  const mockedSongUpdate = vi.mocked(prisma.song.update);
  const mockedSessionCount = vi.mocked(prisma.session.count);

  // Song create: store and return
  mockedSongCreate.mockImplementation(async (args: any) => {
    const song: StoredSong = {
      id: nextId(),
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

  // Song findMany: return all songs for user with strophen/sessions structure
  mockedSongFindMany.mockImplementation(async (args: any) => {
    const userId = args.where?.userId;
    return songs
      .filter((s) => s.userId === userId)
      .map((s) => ({
        ...s,
        strophen: [],
        _count: { sessions: 0 },
      })) as any;
  });

  // Song findUnique: find by id
  mockedSongFindUnique.mockImplementation(async (args: any) => {
    const songId = args.where.id;
    const song = songs.find((s) => s.id === songId);
    return (song ?? null) as any;
  });

  // Song update: apply changes in-memory and return
  mockedSongUpdate.mockImplementation(async (args: any) => {
    const songId = args.where.id;
    const song = songs.find((s) => s.id === songId);
    if (!song) throw new Error("Song nicht gefunden");

    const data = args.data;
    if (data.titel !== undefined) song.titel = data.titel;
    if (data.kuenstler !== undefined) song.kuenstler = data.kuenstler;
    if (data.sprache !== undefined) song.sprache = data.sprache;
    if (data.emotionsTags !== undefined) song.emotionsTags = data.emotionsTags;
    song.updatedAt = new Date();

    return { ...song } as any;
  });

  // Session count: always 0
  mockedSessionCount.mockResolvedValue(0);
}

describe("Property 2: Song-CRUD Round-Trip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDb();
  });

  it("Nach Erstellen liefert listSongs identische Metadaten; nach Update nur geänderte Felder aktualisiert", () => {
    return fc.assert(
      fc.asyncProperty(
        createSongInputArb,
        updateSongInputArb,
        async (createInput, updateInput) => {
          vi.clearAllMocks();
          resetDb();
          setupMocks();

          const userId = "test-user-1";

          // --- Step 1: Create song ---
          const created = await createSong(userId, createInput);

          expect(created.titel).toBe(createInput.titel.trim());
          expect(created.kuenstler).toBe(createInput.kuenstler ?? null);
          expect(created.sprache).toBe(createInput.sprache ?? null);
          expect(created.emotionsTags).toEqual(createInput.emotionsTags ?? []);

          // --- Step 2: List songs and verify the created song appears ---
          const allSongs = await listSongs(userId);
          const found = allSongs.find((s) => s.id === created.id);
          expect(found).toBeDefined();
          expect(found!.titel).toBe(createInput.titel.trim());
          expect(found!.kuenstler).toBe(createInput.kuenstler ?? null);
          expect(found!.sprache).toBe(createInput.sprache ?? null);
          expect(found!.emotionsTags).toEqual(createInput.emotionsTags ?? []);

          // --- Step 3: Update song and verify only changed fields are updated ---
          const beforeUpdate = { ...songs.find((s) => s.id === created.id)! };

          const updated = await updateSong(userId, created.id, updateInput);

          // Check each field: if provided in updateInput, should be new value; otherwise unchanged
          if (updateInput.titel !== undefined) {
            expect(updated.titel).toBe(updateInput.titel.trim());
          } else {
            expect(updated.titel).toBe(beforeUpdate.titel);
          }

          if (updateInput.kuenstler !== undefined) {
            expect(updated.kuenstler).toBe(updateInput.kuenstler);
          } else {
            expect(updated.kuenstler).toBe(beforeUpdate.kuenstler);
          }

          if (updateInput.sprache !== undefined) {
            expect(updated.sprache).toBe(updateInput.sprache);
          } else {
            expect(updated.sprache).toBe(beforeUpdate.sprache);
          }

          if (updateInput.emotionsTags !== undefined) {
            expect(updated.emotionsTags).toEqual(updateInput.emotionsTags);
          } else {
            expect(updated.emotionsTags).toEqual(beforeUpdate.emotionsTags);
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});
