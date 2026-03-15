/**
 * Property 9: Song-Detail Vollständigkeit und Sortierung
 *
 * Für jeden importierten Song mit Strophen, Zeilen, Markups, Sessions und Fortschritten:
 * `getSongDetail` muss alle Strophen sortiert nach orderIndex zurückgeben, alle Zeilen
 * innerhalb jeder Strophe sortiert nach orderIndex, den Gesamtfortschritt und Fortschritt
 * je Strophe, die Session-Anzahl, und alle zugehörigen Markups.
 *
 * **Validates: Requirements 5.1, 5.2, 5.3, 12.9**
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

interface StoredFortschritt {
  id: string;
  userId: string;
  stropheId: string;
  prozent: number;
  updatedAt: Date;
}

interface StoredSession {
  id: string;
  userId: string;
  songId: string;
  lernmethode: string;
  createdAt: Date;
}

// --- In-memory database ---
let songs: StoredSong[] = [];
let strophen: StoredStrophe[] = [];
let zeilen: StoredZeile[] = [];
let markups: StoredMarkup[] = [];
let fortschritte: StoredFortschritt[] = [];
let sessions: StoredSession[] = [];
let idCounter = 0;

function nextId(): string {
  return `id-${++idCounter}`;
}

function resetDb() {
  songs = [];
  strophen = [];
  zeilen = [];
  markups = [];
  fortschritte = [];
  sessions = [];
  idCounter = 0;
}

// --- Mock Prisma ---
const { mockPrisma } = vi.hoisted(() => {
  const _mockSong = { create: vi.fn(), findUnique: vi.fn() };
  const _mockStrophe = { create: vi.fn() };
  const _mockZeile = { create: vi.fn() };
  const _mockMarkup = { create: vi.fn() };
  const _mockSession = { count: vi.fn(), create: vi.fn() };
  const _mockFortschritt = { upsert: vi.fn() };

  const _mockPrisma: Record<string, unknown> = {
    song: _mockSong,
    strophe: _mockStrophe,
    zeile: _mockZeile,
    markup: _mockMarkup,
    session: _mockSession,
    fortschritt: _mockFortschritt,
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

const markupTypArb = fc.constantFrom(
  "PAUSE", "WIEDERHOLUNG", "ATMUNG", "KOPFSTIMME",
  "BRUSTSTIMME", "BELT", "FALSETT", "TIMECODE"
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
  markups: fc.option(fc.array(zeileMarkupArb, { minLength: 0, maxLength: 2 }), { nil: undefined }),
});

const stropheArb = fc.record({
  name: nonEmptyStringArb,
  zeilen: fc.array(zeileArb, { minLength: 1, maxLength: 3 }),
  markups: fc.option(fc.array(stropheMarkupArb, { minLength: 0, maxLength: 2 }), { nil: undefined }),
});

const importSongInputArb: fc.Arbitrary<ImportSongInput> = fc.record({
  titel: nonEmptyStringArb,
  kuenstler: optionalStringArb,
  sprache: optionalStringArb,
  emotionsTags: fc.option(fc.array(nonEmptyStringArb, { minLength: 0, maxLength: 3 }), { nil: undefined }),
  strophen: fc.array(stropheArb, { minLength: 1, maxLength: 3 }),
});

// --- Mock setup ---
function setupMocks(sessionCount: number, progressValues: number[]) {
  const mockedSongCreate = vi.mocked(prisma.song.create);
  const mockedSongFindUnique = vi.mocked(prisma.song.findUnique);
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

  mockedSessionCount.mockImplementation(async () => sessionCount);

  mockedSongFindUnique.mockImplementation(async (args: any) => {
    const songId = args.where.id;
    const song = songs.find((s) => s.id === songId);
    if (!song) return null as any;

    let progressIdx = 0;
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
        const prozent = progressValues[progressIdx] ?? 0;
        progressIdx++;

        return {
          ...s,
          zeilen: stropheZeilen,
          markups: stropheMarkups,
          fortschritte: [{ prozent }],
          notizen: [],
        };
      });

    return { ...song, strophen: songStrophen } as any;
  });
}

describe("Property 9: Song-Detail Vollständigkeit und Sortierung", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDb();
  });

  it("getSongDetail liefert Strophen/Zeilen sortiert nach orderIndex, Fortschritt, Session-Anzahl und Markups", () => {
    return fc.assert(
      fc.asyncProperty(
        importSongInputArb,
        fc.nat({ max: 50 }),
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 3 }),
        async (input, sessionCount, progressValues) => {
          vi.clearAllMocks();
          resetDb();
          setupMocks(sessionCount, progressValues);

          const userId = "test-user-1";
          const result = await importSong(userId, input);

          // Strophen sorted by orderIndex
          for (let i = 0; i < result.strophen.length; i++) {
            expect(result.strophen[i].orderIndex).toBe(i);
            if (i > 0) {
              expect(result.strophen[i].orderIndex).toBeGreaterThan(
                result.strophen[i - 1].orderIndex
              );
            }
          }

          // Zeilen sorted by orderIndex within each strophe
          for (const strophe of result.strophen) {
            for (let j = 0; j < strophe.zeilen.length; j++) {
              expect(strophe.zeilen[j].orderIndex).toBe(j);
            }
          }

          // Session count
          expect(result.sessionCount).toBe(sessionCount);

          // Per-strophe progress
          for (let i = 0; i < result.strophen.length; i++) {
            const expected = progressValues[i] ?? 0;
            expect(result.strophen[i].progress).toBe(expected);
          }

          // Overall progress = arithmetic mean of strophe progresses (rounded)
          const stropheCount = result.strophen.length;
          if (stropheCount > 0) {
            const totalProgress = result.strophen.reduce((sum, s) => sum + s.progress, 0);
            const expectedOverall = Math.round(totalProgress / stropheCount);
            expect(result.progress).toBe(expectedOverall);
          }

          // All markups present
          for (let si = 0; si < input.strophen.length; si++) {
            const inputStrophe = input.strophen[si];
            const resultStrophe = result.strophen[si];

            const expectedStropheMarkups = inputStrophe.markups ?? [];
            expect(resultStrophe.markups).toHaveLength(expectedStropheMarkups.length);

            for (const zeileIdx in inputStrophe.zeilen) {
              const expectedZeileMarkups = inputStrophe.zeilen[zeileIdx].markups ?? [];
              expect(resultStrophe.zeilen[zeileIdx].markups).toHaveLength(expectedZeileMarkups.length);
            }
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});
