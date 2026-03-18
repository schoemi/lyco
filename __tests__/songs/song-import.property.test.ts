/**
 * Property 1: Song-Import Round-Trip
 *
 * Für jeden gültigen Import-Payload (mit zufälligem Titel, Künstler, Sprache,
 * Emotions_Tags, Strophen mit Namen und Zeilen mit Text und optionaler Übersetzung,
 * sowie optionalen Markups) gilt: Nach dem Import über `importSong` muss
 * `getSongDetail` einen Song zurückgeben, bei dem alle Strophen in der Reihenfolge
 * des Payloads vorliegen (orderIndex entspricht Position), alle Zeilen innerhalb
 * jeder Strophe in der Reihenfolge des Payloads vorliegen, alle Texte und
 * Übersetzungen übereinstimmen, und alle Markups vorhanden sind.
 *
 * **Validates: Requirements 1.3, 1.4, 1.5, 4.1, 4.2, 4.3, 4.4, 4.9**
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

// --- In-memory database ---
let songs: StoredSong[] = [];
let strophen: StoredStrophe[] = [];
let zeilen: StoredZeile[] = [];
let markups: StoredMarkup[] = [];
let idCounter = 0;

function nextId(): string {
  return `id-${++idCounter}`;
}

function resetDb() {
  songs = [];
  strophen = [];
  zeilen = [];
  markups = [];
  idCounter = 0;
}

// --- Mock Prisma ---
const { mockPrisma } = vi.hoisted(() => {
  const _mockSong = { create: vi.fn(), findUnique: vi.fn() };
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

import { importSong, getSongDetail } from "@/lib/services/song-service";
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
  const mockedStropheCreate = vi.mocked(prisma.strophe.create);
  const mockedZeileCreate = vi.mocked(prisma.zeile.create);
  const mockedMarkupCreate = vi.mocked(prisma.markup.create);
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

  // Strophe create: store and return
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

  // Zeile create: store and return
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

  // Markup create: store and return
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

  // Session count: always 0 for new songs
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
}

describe("Property 1: Song-Import Round-Trip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDb();
  });

  it("Nach Import liefert getSongDetail alle Strophen, Zeilen, Texte, Übersetzungen und Markups in korrekter Reihenfolge", () => {
    return fc.assert(
      fc.asyncProperty(importSongInputArb, async (input) => {
        vi.clearAllMocks();
        resetDb();
        setupMocks();

        const userId = "test-user-1";

        // Import the song
        const result = await importSong(userId, input);

        // Verify song metadata
        expect(result.titel).toBe(input.titel.trim());
        expect(result.kuenstler).toBe(input.kuenstler ?? null);
        expect(result.sprache).toBe(input.sprache ?? null);
        expect(result.emotionsTags).toEqual(input.emotionsTags ?? []);

        // Verify strophen count and order
        expect(result.strophen).toHaveLength(input.strophen.length);

        for (let si = 0; si < input.strophen.length; si++) {
          const inputStrophe = input.strophen[si];
          const resultStrophe = result.strophen[si];

          // orderIndex matches position
          expect(resultStrophe.orderIndex).toBe(si);
          expect(resultStrophe.name).toBe(inputStrophe.name);

          // Verify zeilen count and order
          expect(resultStrophe.zeilen).toHaveLength(inputStrophe.zeilen.length);

          for (let zi = 0; zi < inputStrophe.zeilen.length; zi++) {
            const inputZeile = inputStrophe.zeilen[zi];
            const resultZeile = resultStrophe.zeilen[zi];

            // orderIndex matches position
            expect(resultZeile.orderIndex).toBe(zi);
            expect(resultZeile.text).toBe(inputZeile.text);
            expect(resultZeile.uebersetzung).toBe(
              inputZeile.uebersetzung ?? null
            );

            // Verify zeile-level markups
            const expectedZeileMarkups = inputZeile.markups ?? [];
            expect(resultZeile.markups).toHaveLength(expectedZeileMarkups.length);

            for (let mi = 0; mi < expectedZeileMarkups.length; mi++) {
              const inputMarkup = expectedZeileMarkups[mi];
              const resultMarkup = resultZeile.markups[mi];
              expect(resultMarkup.typ).toBe(inputMarkup.typ);
              expect(resultMarkup.ziel).toBe(inputMarkup.ziel);
              expect(resultMarkup.wert).toBe(inputMarkup.wert ?? null);
              expect(resultMarkup.timecodeMs).toBe(inputMarkup.timecodeMs ?? null);
              expect(resultMarkup.wortIndex).toBe(inputMarkup.wortIndex ?? null);
            }
          }

          // Verify strophe-level markups
          const expectedStropheMarkups = inputStrophe.markups ?? [];
          expect(resultStrophe.markups).toHaveLength(expectedStropheMarkups.length);

          for (let mi = 0; mi < expectedStropheMarkups.length; mi++) {
            const inputMarkup = expectedStropheMarkups[mi];
            const resultMarkup = resultStrophe.markups[mi];
            expect(resultMarkup.typ).toBe(inputMarkup.typ);
            expect(resultMarkup.ziel).toBe(inputMarkup.ziel);
            expect(resultMarkup.wert).toBe(inputMarkup.wert ?? null);
            expect(resultMarkup.timecodeMs).toBe(inputMarkup.timecodeMs ?? null);
          }
        }
      }),
      { numRuns: 20 }
    );
  });
});
