/**
 * Property 20: Markup-Gruppierung
 *
 * Für jeden Song mit Markups auf verschiedenen Ebenen (Strophe, Zeile, Wort):
 * `getMarkupsForSong` muss alle Markups gruppiert nach Strophe und Zeile zurückgeben,
 * sodass jedes Markup seiner korrekten Strophe bzw. Zeile zugeordnet ist.
 *
 * **Validates: Requirements 12.7**
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
  const _mockSong = { findUnique: vi.fn() };
  const _mockStrophe = { findMany: vi.fn() };

  const _mockPrisma: Record<string, unknown> = {
    song: _mockSong,
    strophe: _mockStrophe,
  };

  return { mockPrisma: _mockPrisma };
});

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { getMarkupsForSong } from "@/lib/services/markup-service";
import { prisma } from "@/lib/prisma";

// --- Arbitraries ---
const markupTypArb = fc.constantFrom(
  "PAUSE", "WIEDERHOLUNG", "ATMUNG", "KOPFSTIMME",
  "BRUSTSTIMME", "BELT", "FALSETT", "TIMECODE"
);

describe("Property 20: Markup-Gruppierung", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDb();
  });

  it("getMarkupsForSong liefert Markups gruppiert nach Strophe und Zeile", () => {
    return fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 3 }),
        fc.integer({ min: 1, max: 3 }),
        markupTypArb,
        async (numStrophen, numZeilen, typ) => {
          vi.clearAllMocks();
          resetDb();

          const userId = "user-1";
          const songId = "song-1";

          // Build strophen with zeilen and markups
          const strophenData: any[] = [];
          for (let si = 0; si < numStrophen; si++) {
            const stropheId = `strophe-${si}`;

            // Strophe-level markup
            const stropheMarkup: StoredMarkup = {
              id: nextId(),
              typ,
              ziel: "STROPHE",
              wert: null,
              timecodeMs: null,
              wortIndex: null,
              stropheId,
              zeileId: null,
            };
            markups.push(stropheMarkup);

            const zeilenData: any[] = [];
            for (let zi = 0; zi < numZeilen; zi++) {
              const zeileId = `zeile-${si}-${zi}`;

              // Zeile-level markup
              const zeileMarkup: StoredMarkup = {
                id: nextId(),
                typ,
                ziel: "ZEILE",
                wert: null,
                timecodeMs: null,
                wortIndex: null,
                stropheId: null,
                zeileId,
              };
              markups.push(zeileMarkup);

              zeilenData.push({
                id: zeileId,
                orderIndex: zi,
                markups: markups.filter((m) => m.zeileId === zeileId),
              });
            }

            strophenData.push({
              id: stropheId,
              orderIndex: si,
              markups: markups.filter((m) => m.stropheId === stropheId),
              zeilen: zeilenData,
            });
          }

          // Setup mocks
          vi.mocked(prisma.song.findUnique).mockImplementation(async () => ({
            id: songId,
            userId,
          }) as any);

          vi.mocked(prisma.strophe.findMany).mockImplementation(async () => strophenData as any);

          const grouped = await getMarkupsForSong(userId, songId);

          // Verify grouping
          for (let si = 0; si < numStrophen; si++) {
            const stropheId = `strophe-${si}`;
            expect(grouped[stropheId]).toBeDefined();

            // Strophe-level markups
            expect(grouped[stropheId].stropheMarkups.length).toBeGreaterThanOrEqual(1);
            for (const m of grouped[stropheId].stropheMarkups) {
              expect(m.ziel).toBe("STROPHE");
            }

            // Zeile-level markups
            for (let zi = 0; zi < numZeilen; zi++) {
              const zeileId = `zeile-${si}-${zi}`;
              expect(grouped[stropheId].zeilen[zeileId]).toBeDefined();
              expect(grouped[stropheId].zeilen[zeileId].length).toBeGreaterThanOrEqual(1);
              for (const m of grouped[stropheId].zeilen[zeileId]) {
                expect(m.ziel).toBe("ZEILE");
              }
            }
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});
