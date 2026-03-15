/**
 * Property 21: Markup-Validierung
 *
 * Für jedes Markup: Ziel STROPHE erfordert stropheId, Ziel ZEILE erfordert zeileId,
 * Ziel WORT erfordert zeileId + wortIndex im gültigen Bereich; ungültige Kombinationen
 * werden abgelehnt.
 *
 * **Validates: Requirements 1.12, 12.10**
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

// --- Mock Prisma ---
const { mockPrisma } = vi.hoisted(() => {
  const _mockStrophe = { findUnique: vi.fn() };
  const _mockZeile = { findUnique: vi.fn() };
  const _mockMarkup = { create: vi.fn() };

  const _mockPrisma: Record<string, unknown> = {
    strophe: _mockStrophe,
    zeile: _mockZeile,
    markup: _mockMarkup,
  };

  return { mockPrisma: _mockPrisma };
});

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { createMarkup } from "@/lib/services/markup-service";
import { prisma } from "@/lib/prisma";

// --- Arbitraries ---
const markupTypArb = fc.constantFrom(
  "PAUSE", "WIEDERHOLUNG", "ATMUNG", "KOPFSTIMME",
  "BRUSTSTIMME", "BELT", "FALSETT", "TIMECODE"
);

// --- Mock setup ---
function setupMocks(userId: string) {
  const mockedStropheFindUnique = vi.mocked(prisma.strophe.findUnique);
  const mockedZeileFindUnique = vi.mocked(prisma.zeile.findUnique);
  const mockedMarkupCreate = vi.mocked(prisma.markup.create);

  mockedStropheFindUnique.mockImplementation(async (args: any) => {
    if (args.where.id === "valid-strophe") {
      return {
        id: "valid-strophe",
        songId: "song-1",
        song: { userId, id: "song-1" },
      } as any;
    }
    return null as any;
  });

  mockedZeileFindUnique.mockImplementation(async (args: any) => {
    if (args.where.id === "valid-zeile") {
      return {
        id: "valid-zeile",
        stropheId: "valid-strophe",
        text: "hello world foo",
        strophe: { id: "valid-strophe", songId: "song-1", song: { userId, id: "song-1" } },
      } as any;
    }
    return null as any;
  });

  mockedMarkupCreate.mockImplementation(async (args: any) => ({
    id: "markup-1",
    ...args.data,
  }) as any);
}

describe("Property 21: Markup-Validierung", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("STROPHE ohne stropheId wird abgelehnt", () => {
    return fc.assert(
      fc.asyncProperty(markupTypArb, async (typ) => {
        vi.clearAllMocks();
        const userId = "user-1";
        setupMocks(userId);

        await expect(
          createMarkup(userId, {
            typ: typ as any,
            ziel: "STROPHE" as any,
            // stropheId missing
          })
        ).rejects.toThrow("stropheId");
      }),
      { numRuns: 20 }
    );
  });

  it("ZEILE ohne zeileId wird abgelehnt", () => {
    return fc.assert(
      fc.asyncProperty(markupTypArb, async (typ) => {
        vi.clearAllMocks();
        const userId = "user-1";
        setupMocks(userId);

        await expect(
          createMarkup(userId, {
            typ: typ as any,
            ziel: "ZEILE" as any,
            // zeileId missing
          })
        ).rejects.toThrow("zeileId");
      }),
      { numRuns: 20 }
    );
  });

  it("WORT ohne zeileId wird abgelehnt", () => {
    return fc.assert(
      fc.asyncProperty(markupTypArb, async (typ) => {
        vi.clearAllMocks();
        const userId = "user-1";
        setupMocks(userId);

        await expect(
          createMarkup(userId, {
            typ: typ as any,
            ziel: "WORT" as any,
            wortIndex: 0,
            // zeileId missing
          })
        ).rejects.toThrow("zeileId");
      }),
      { numRuns: 20 }
    );
  });

  it("WORT ohne wortIndex wird abgelehnt", () => {
    return fc.assert(
      fc.asyncProperty(markupTypArb, async (typ) => {
        vi.clearAllMocks();
        const userId = "user-1";
        setupMocks(userId);

        await expect(
          createMarkup(userId, {
            typ: typ as any,
            ziel: "WORT" as any,
            zeileId: "valid-zeile",
            // wortIndex missing
          })
        ).rejects.toThrow("wortIndex");
      }),
      { numRuns: 20 }
    );
  });

  it("WORT mit wortIndex außerhalb des gültigen Bereichs wird abgelehnt", () => {
    return fc.assert(
      fc.asyncProperty(
        markupTypArb,
        fc.integer({ min: 3, max: 100 }),
        async (typ, badIndex) => {
          vi.clearAllMocks();
          const userId = "user-1";
          setupMocks(userId);

          // "hello world foo" has 3 words, so valid indices are 0, 1, 2
          await expect(
            createMarkup(userId, {
              typ: typ as any,
              ziel: "WORT" as any,
              zeileId: "valid-zeile",
              wortIndex: badIndex,
            })
          ).rejects.toThrow("Wort-Index");
        }
      ),
      { numRuns: 20 }
    );
  });

  it("Gültige Kombinationen werden akzeptiert", () => {
    return fc.assert(
      fc.asyncProperty(
        markupTypArb,
        fc.constantFrom(0, 1, 2),
        async (typ, validWortIndex) => {
          vi.clearAllMocks();
          const userId = "user-1";
          setupMocks(userId);

          // Valid STROPHE
          const stropheResult = await createMarkup(userId, {
            typ: typ as any,
            ziel: "STROPHE" as any,
            stropheId: "valid-strophe",
          });
          expect(stropheResult.ziel).toBe("STROPHE");

          // Valid ZEILE
          const zeileResult = await createMarkup(userId, {
            typ: typ as any,
            ziel: "ZEILE" as any,
            zeileId: "valid-zeile",
          });
          expect(zeileResult.ziel).toBe("ZEILE");

          // Valid WORT
          const wortResult = await createMarkup(userId, {
            typ: typ as any,
            ziel: "WORT" as any,
            zeileId: "valid-zeile",
            wortIndex: validWortIndex,
          });
          expect(wortResult.ziel).toBe("WORT");
        }
      ),
      { numRuns: 20 }
    );
  });
});
