/**
 * Property 3: Song Cascade Delete
 *
 * Für jeden importierten Song mit Strophen, Zeilen, Markups, Sessions,
 * Fortschritten und Notizen gilt: Nach dem Löschen des Songs über `deleteSong`
 * dürfen keine zugehörigen Strophen, Zeilen, Markups, Sessions, Fortschritte
 * oder Notizen mehr in der Datenbank existieren.
 *
 * **Validates: Requirements 1.9, 1.13, 3.4**
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import type { ImportSongInput, ImportMarkupInput } from "../../src/types/song";

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

interface StoredMarkup {
  id: string;
  typ: string;
  ziel: string;
  wert: string | null;
  timecodeMs: number | null;
  wortIndex: number | null;
  stropheId: string | null;
  zeileId: string | null;
  createdAt: Date;
}

interface StoredSession {
  id: string;
  userId: string;
  songId: string;
  lernmethode: string;
  createdAt: Date;
}

interface StoredFortschritt {
  id: string;
  userId: string;
  stropheId: string;
  prozent: number;
  updatedAt: Date;
}

interface StoredNotiz {
  id: string;
  userId: string;
  stropheId: string;
  text: string;
  updatedAt: Date;
}

// --- In-memory database ---
let songs: StoredSong[] = [];
let strophen: StoredStrophe[] = [];
let zeilen: StoredZeile[] = [];
let markups: StoredMarkup[] = [];
let sessions: StoredSession[] = [];
let fortschritte: StoredFortschritt[] = [];
let notizen: StoredNotiz[] = [];
let idCounter = 0;

function nextId(): string {
  return `id-${++idCounter}`;
}

function resetDb() {
  songs = [];
  strophen = [];
  zeilen = [];
  markups = [];
  sessions = [];
  fortschritte = [];
  notizen = [];
  idCounter = 0;
}

// --- Mock Prisma ---
const { mockPrisma } = vi.hoisted(() => {
  const _mockSong = { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn() };
  const _mockStrophe = { create: vi.fn() };
  const _mockZeile = { create: vi.fn() };
  const _mockMarkup = { create: vi.fn() };
  const _mockSession = { count: vi.fn() };

  const _mockPrisma: Record<string, unknown> = {
    song: _mockSong,
    strophe: _mockStrophe,
    zeile: _mockZeile,
    markup: _mockMarkup,
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

import { importSong, deleteSong } from "@/lib/services/song-service";
import { prisma } from "@/lib/prisma";

// --- Arbitraries ---
const nonEmptyStringArb = fc
  .stringMatching(/^[A-Za-z0-9 ]{1,20}$/)
  .filter((s) => s.trim().length > 0);

const optionalStringArb = fc.option(nonEmptyStringArb, { nil: undefined });

const emotionsTagsArb = fc.array(nonEmptyStringArb, { minLength: 0, maxLength: 3 });

const markupTypArb = fc.constantFrom(
  "PAUSE",
  "WIEDERHOLUNG",
  "ATMUNG",
  "KOPFSTIMME",
  "BRUSTSTIMME",
  "BELT",
  "FALSETT",
  "TIMECODE"
) as fc.Arbitrary<ImportMarkupInput["typ"]>;

const stropheMarkupArb: fc.Arbitrary<ImportMarkupInput> = fc.record({
  typ: markupTypArb,
  ziel: fc.constant("STROPHE" as const),
  wert: fc.option(nonEmptyStringArb, { nil: undefined }),
  timecodeMs: fc.option(fc.nat({ max: 600000 }), { nil: undefined }),
});

const zeileMarkupArb: fc.Arbitrary<ImportMarkupInput> = fc.record({
  typ: markupTypArb,
  ziel: fc.constantFrom("ZEILE", "WORT") as fc.Arbitrary<ImportMarkupInput["ziel"]>,
  wert: fc.option(nonEmptyStringArb, { nil: undefined }),
  timecodeMs: fc.option(fc.nat({ max: 600000 }), { nil: undefined }),
  wortIndex: fc.option(fc.nat({ max: 10 }), { nil: undefined }),
});

const zeileArb = fc.record({
  text: nonEmptyStringArb,
  uebersetzung: optionalStringArb,
  markups: fc.option(fc.array(zeileMarkupArb, { minLength: 0, maxLength: 2 }), {
    nil: undefined,
  }),
});

const stropheArb = fc.record({
  name: nonEmptyStringArb,
  zeilen: fc.array(zeileArb, { minLength: 1, maxLength: 3 }),
  markups: fc.option(fc.array(stropheMarkupArb, { minLength: 0, maxLength: 2 }), {
    nil: undefined,
  }),
});

const importSongInputArb: fc.Arbitrary<ImportSongInput> = fc.record({
  titel: nonEmptyStringArb,
  kuenstler: optionalStringArb,
  sprache: optionalStringArb,
  emotionsTags: fc.option(emotionsTagsArb, { nil: undefined }),
  strophen: fc.array(stropheArb, { minLength: 1, maxLength: 3 }),
});

// --- Mock setup helpers ---
function setupMocks() {
  const mockedSongCreate = vi.mocked(prisma.song.create);
  const mockedSongFindUnique = vi.mocked(prisma.song.findUnique);
  const mockedSongDelete = vi.mocked(prisma.song.delete);
  const mockedStropheCreate = vi.mocked(prisma.strophe.create);
  const mockedZeileCreate = vi.mocked(prisma.zeile.create);
  const mockedMarkupCreate = vi.mocked(prisma.markup.create);
  const mockedSessionCount = vi.mocked(prisma.session.count);

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

  mockedStropheCreate.mockImplementation(async (args: any) => {
    const strophe: StoredStrophe = {
      id: nextId(),
      name: args.data.name,
      orderIndex: args.data.orderIndex,
      songId: args.data.songId,
      createdAt: new Date(),
    };
    strophen.push(strophe);
    return strophe as any;
  });

  mockedZeileCreate.mockImplementation(async (args: any) => {
    const zeile: StoredZeile = {
      id: nextId(),
      text: args.data.text,
      uebersetzung: args.data.uebersetzung ?? null,
      orderIndex: args.data.orderIndex,
      stropheId: args.data.stropheId,
    };
    zeilen.push(zeile);
    return zeile as any;
  });

  mockedMarkupCreate.mockImplementation(async (args: any) => {
    const markup: StoredMarkup = {
      id: nextId(),
      typ: args.data.typ,
      ziel: args.data.ziel,
      wert: args.data.wert ?? null,
      timecodeMs: args.data.timecodeMs ?? null,
      wortIndex: args.data.wortIndex ?? null,
      stropheId: args.data.stropheId ?? null,
      zeileId: args.data.zeileId ?? null,
      createdAt: new Date(),
    };
    markups.push(markup);
    return markup as any;
  });

  mockedSessionCount.mockResolvedValue(0);

  // Song findUnique: reconstruct full song with nested includes from in-memory store
  mockedSongFindUnique.mockImplementation(async (args: any) => {
    const songId = args.where.id;
    const song = songs.find((s) => s.id === songId);
    if (!song) return null as any;

    const songStrophen = strophen
      .filter((s) => s.songId === songId)
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((s) => {
        const stropheZeilen = zeilen
          .filter((z) => z.stropheId === s.id)
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((z) => ({
            ...z,
            markups: markups.filter((m) => m.zeileId === z.id),
          }));

        const stropheMarkups = markups.filter((m) => m.stropheId === s.id);

        return {
          ...s,
          zeilen: stropheZeilen,
          markups: stropheMarkups,
          fortschritte: [],
          notizen: [],
        };
      });

    return {
      ...song,
      strophen: songStrophen,
      audioQuellen: [],
    } as any;
  });

  // Song delete: simulate cascade — remove song and all related records
  mockedSongDelete.mockImplementation(async (args: any) => {
    const songId = args.where.id;
    const song = songs.find((s) => s.id === songId);
    if (!song) return null as any;

    // Find strophe IDs for this song
    const songStropheIds = strophen
      .filter((s) => s.songId === songId)
      .map((s) => s.id);

    // Find zeile IDs for these strophen
    const songZeileIds = zeilen
      .filter((z) => songStropheIds.includes(z.stropheId))
      .map((z) => z.id);

    // Cascade delete all related records
    markups = markups.filter(
      (m) =>
        !songStropheIds.includes(m.stropheId ?? "") &&
        !songZeileIds.includes(m.zeileId ?? "")
    );
    zeilen = zeilen.filter((z) => !songStropheIds.includes(z.stropheId));
    fortschritte = fortschritte.filter(
      (f) => !songStropheIds.includes(f.stropheId)
    );
    notizen = notizen.filter(
      (n) => !songStropheIds.includes(n.stropheId)
    );
    sessions = sessions.filter((s) => s.songId !== songId);
    strophen = strophen.filter((s) => s.songId !== songId);
    songs = songs.filter((s) => s.id !== songId);

    return song as any;
  });
}

describe("Property 3: Song Cascade Delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDb();
  });

  it("Nach deleteSong existieren keine zugehörigen Strophen, Zeilen, Markups, Sessions, Fortschritte oder Notizen mehr", () => {
    return fc.assert(
      fc.asyncProperty(importSongInputArb, async (input) => {
        vi.clearAllMocks();
        resetDb();
        setupMocks();

        const userId = "test-user-1";

        // 1. Import the song (creates strophen, zeilen, markups)
        const result = await importSong(userId, input);
        const songId = result.id;

        // 2. Create sessions, fortschritte, and notizen for the song
        const songStropheIds = strophen
          .filter((s) => s.songId === songId)
          .map((s) => s.id);

        for (const stropheId of songStropheIds) {
          sessions.push({
            id: nextId(),
            userId,
            songId,
            lernmethode: "EMOTIONAL",
            createdAt: new Date(),
          });
          fortschritte.push({
            id: nextId(),
            userId,
            stropheId,
            prozent: 50,
            updatedAt: new Date(),
          });
          notizen.push({
            id: nextId(),
            userId,
            stropheId,
            text: "Test note",
            updatedAt: new Date(),
          });
        }

        // Verify records exist before deletion
        expect(strophen.filter((s) => s.songId === songId).length).toBeGreaterThan(0);

        // 3. Delete the song
        await deleteSong(userId, songId);

        // 4. Verify all related records are gone
        expect(songs.filter((s) => s.id === songId)).toHaveLength(0);
        expect(strophen.filter((s) => s.songId === songId)).toHaveLength(0);

        const remainingStropheIds = strophen.map((s) => s.id);
        expect(
          zeilen.filter((z) => songStropheIds.includes(z.stropheId))
        ).toHaveLength(0);
        expect(
          markups.filter(
            (m) =>
              songStropheIds.includes(m.stropheId ?? "") ||
              songStropheIds.some((sid) =>
                zeilen
                  .filter((z) => z.stropheId === sid)
                  .map((z) => z.id)
                  .includes(m.zeileId ?? "")
              )
          )
        ).toHaveLength(0);
        expect(sessions.filter((s) => s.songId === songId)).toHaveLength(0);
        expect(
          fortschritte.filter((f) => songStropheIds.includes(f.stropheId))
        ).toHaveLength(0);
        expect(
          notizen.filter((n) => songStropheIds.includes(n.stropheId))
        ).toHaveLength(0);
      }),
      { numRuns: 20 }
    );
  });
});
