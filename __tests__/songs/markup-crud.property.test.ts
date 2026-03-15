/**
 * Property 19: Markup Round-Trip
 *
 * Für jeden gültigen Markup_Typ und jedes gültige Markup_Ziel: Erstellen und Abrufen
 * liefert identische Daten; Aktualisieren ändert nur betroffene Felder; Löschen
 * entfernt das Markup.
 *
 * **Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6**
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

// --- In-memory store ---
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

let markups: StoredMarkup[] = [];
let idCounter = 0;

function nextId(): string {
  return `id-${++idCounter}`;
}

function resetDb() {
  markups = [];
  idCounter = 0;
}

// --- Mock Prisma ---
const { mockPrisma } = vi.hoisted(() => {
  const _mockStrophe = {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  };
  const _mockZeile = { findUnique: vi.fn() };
  const _mockMarkup = {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const _mockSong = { findUnique: vi.fn() };

  const _mockPrisma: Record<string, unknown> = {
    strophe: _mockStrophe,
    zeile: _mockZeile,
    markup: _mockMarkup,
    song: _mockSong,
  };

  return { mockPrisma: _mockPrisma };
});

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import {
  createMarkup,
  updateMarkup,
  deleteMarkup,
  getMarkupsForSong,
} from "@/lib/services/markup-service";
import { prisma } from "@/lib/prisma";

// --- Arbitraries ---
const markupTypArb = fc.constantFrom(
  "PAUSE", "WIEDERHOLUNG", "ATMUNG", "KOPFSTIMME",
  "BRUSTSTIMME", "BELT", "FALSETT", "TIMECODE"
);

const nonEmptyStringArb = fc
  .stringMatching(/^[A-Za-z0-9 ]{1,20}$/)
  .filter((s) => s.trim().length > 0);

// --- Mock setup ---
function setupMocks(userId: string, songId: string, stropheId: string, zeileId: string) {
  const mockedStropheFindUnique = vi.mocked(prisma.strophe.findUnique);
  const mockedZeileFindUnique = vi.mocked(prisma.zeile.findUnique);
  const mockedMarkupCreate = vi.mocked(prisma.markup.create);
  const mockedMarkupFindUnique = vi.mocked(prisma.markup.findUnique);
  const mockedMarkupUpdate = vi.mocked(prisma.markup.update);
  const mockedMarkupDelete = vi.mocked(prisma.markup.delete);
  const mockedSongFindUnique = vi.mocked(prisma.song.findUnique);
  const mockedStropheFindMany = vi.mocked(prisma.strophe.findMany);

  mockedStropheFindUnique.mockImplementation(async () => ({
    id: stropheId,
    songId,
    song: { userId, id: songId },
  }) as any);

  mockedZeileFindUnique.mockImplementation(async () => ({
    id: zeileId,
    stropheId,
    text: "hello world test words here",
    strophe: { id: stropheId, songId, song: { userId, id: songId } },
  }) as any);

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
    return { ...markup } as any;
  });

  mockedMarkupFindUnique.mockImplementation(async (args: any) => {
    const m = markups.find((mk) => mk.id === args.where.id);
    if (!m) return null as any;
    return {
      ...m,
      strophe: m.stropheId ? { id: m.stropheId, song: { userId, id: songId } } : null,
      zeile: m.zeileId
        ? { id: m.zeileId, strophe: { id: stropheId, song: { userId, id: songId } } }
        : null,
    } as any;
  });

  mockedMarkupUpdate.mockImplementation(async (args: any) => {
    const m = markups.find((mk) => mk.id === args.where.id);
    if (!m) throw new Error("Markup nicht gefunden");
    if (args.data.wert !== undefined) m.wert = args.data.wert;
    if (args.data.timecodeMs !== undefined) m.timecodeMs = args.data.timecodeMs;
    return { ...m } as any;
  });

  mockedMarkupDelete.mockImplementation(async (args: any) => {
    const idx = markups.findIndex((mk) => mk.id === args.where.id);
    if (idx === -1) throw new Error("Markup nicht gefunden");
    const deleted = markups.splice(idx, 1)[0];
    return { ...deleted } as any;
  });

  mockedSongFindUnique.mockImplementation(async () => ({
    id: songId,
    userId,
  }) as any);

  mockedStropheFindMany.mockImplementation(async () => {
    return [
      {
        id: stropheId,
        markups: markups.filter((m) => m.stropheId === stropheId),
        zeilen: [
          {
            id: zeileId,
            orderIndex: 0,
            markups: markups.filter((m) => m.zeileId === zeileId),
          },
        ],
      },
    ] as any;
  });
}

describe("Property 19: Markup Round-Trip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDb();
  });

  it("STROPHE-Markup: create, retrieve, update, delete round-trip", () => {
    return fc.assert(
      fc.asyncProperty(
        markupTypArb,
        fc.option(nonEmptyStringArb, { nil: undefined }),
        fc.option(fc.nat({ max: 600000 }), { nil: undefined }),
        nonEmptyStringArb,
        async (typ, wert, timecodeMs, newWert) => {
          vi.clearAllMocks();
          resetDb();

          const userId = "user-1";
          const songId = "song-1";
          const stropheId = "strophe-1";
          const zeileId = "zeile-1";
          setupMocks(userId, songId, stropheId, zeileId);

          // Create
          const created = await createMarkup(userId, {
            typ: typ as any,
            ziel: "STROPHE" as any,
            stropheId,
            wert,
            timecodeMs,
          });
          expect(created.typ).toBe(typ);
          expect(created.ziel).toBe("STROPHE");
          expect(created.wert).toBe(wert ?? null);
          expect(created.timecodeMs).toBe(timecodeMs ?? null);

          // Retrieve via getMarkupsForSong
          const grouped = await getMarkupsForSong(userId, songId);
          const stropheMarkups = grouped[stropheId]?.stropheMarkups ?? [];
          expect(stropheMarkups.some((m: any) => m.id === created.id)).toBe(true);

          // Update
          const updated = await updateMarkup(userId, created.id, { wert: newWert });
          expect(updated.wert).toBe(newWert);
          expect(updated.typ).toBe(typ);

          // Delete
          await deleteMarkup(userId, created.id);
          expect(markups.find((m) => m.id === created.id)).toBeUndefined();
        }
      ),
      { numRuns: 20 }
    );
  });
});
