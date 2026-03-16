/**
 * Property 4: Zeile ownership chain enforcement
 *
 * Für jede Zeile-Operation (createZeile, updateZeile, deleteZeile, reorderZeilen)
 * und jede ungültige Stelle in der Ownership-Kette (Song-Eigentümer, Strophe gehört zum Song,
 * Zeile gehört zur Strophe) muss der Versuch mit einem passenden Fehler abgelehnt werden.
 *
 * **Validates: Requirements 12.10, 12.11**
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

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
  markups: never[];
}

// --- In-memory database ---
let songs: StoredSong[] = [];
let strophen: StoredStrophe[] = [];
let zeilen: StoredZeile[] = [];
let idCounter = 0;

function nextId(prefix: string): string {
  return `${prefix}-${++idCounter}`;
}

function resetDb() {
  songs = [];
  strophen = [];
  zeilen = [];
  idCounter = 0;
}

// --- Mock Prisma ---
const { mockPrisma } = vi.hoisted(() => {
  const _mockSong = {
    findUnique: vi.fn(),
  };
  const _mockStrophe = {
    findUnique: vi.fn(),
  };
  const _mockZeile = {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    aggregate: vi.fn(),
  };
  const _mockPrisma: Record<string, unknown> = {
    song: _mockSong,
    strophe: _mockStrophe,
    zeile: _mockZeile,
    $transaction: vi.fn(),
  };
  return { mockPrisma: _mockPrisma };
});

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import {
  createZeile,
  updateZeile,
  deleteZeile,
  reorderZeilen,
} from "@/lib/services/zeile-service";
import { prisma } from "@/lib/prisma";

// --- Arbitraries ---
const nonEmptyStringArb = fc
  .stringMatching(/^[A-Za-z0-9 ]{1,20}$/)
  .filter((s) => s.trim().length > 0);

// --- Mock setup ---
function setupMocks() {
  const mockedSongFindUnique = vi.mocked(prisma.song.findUnique);
  const mockedStropheFindUnique = vi.mocked(prisma.strophe.findUnique);
  const mockedZeileFindUnique = vi.mocked(prisma.zeile.findUnique);
  const mockedZeileAggregate = vi.mocked(prisma.zeile.aggregate);
  const mockedZeileFindMany = vi.mocked(prisma.zeile.findMany);

  mockedSongFindUnique.mockImplementation(async (args: any) => {
    const songId = args?.where?.id;
    const found = songs.find((s) => s.id === songId);
    return (found ?? null) as any;
  });

  mockedStropheFindUnique.mockImplementation(async (args: any) => {
    const stropheId = args?.where?.id;
    const found = strophen.find((s) => s.id === stropheId);
    return (found ?? null) as any;
  });

  mockedZeileFindUnique.mockImplementation(async (args: any) => {
    const zeileId = args?.where?.id;
    const found = zeilen.find((z) => z.id === zeileId);
    return (found ?? null) as any;
  });

  mockedZeileAggregate.mockImplementation(async (args: any) => {
    const stropheId = args?.where?.stropheId;
    const stropheZeilen = zeilen.filter((z) => z.stropheId === stropheId);
    const maxOrder =
      stropheZeilen.length > 0
        ? Math.max(...stropheZeilen.map((z) => z.orderIndex))
        : null;
    return { _max: { orderIndex: maxOrder } } as any;
  });

  mockedZeileFindMany.mockImplementation(async (args: any) => {
    const stropheId = args?.where?.stropheId;
    return zeilen
      .filter((z) => z.stropheId === stropheId)
      .map((z) => ({ id: z.id })) as any;
  });
}

// --- Seed helpers ---
function seedSong(ownerId: string, titel: string): StoredSong {
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

function seedStrophe(songId: string, name: string, orderIndex: number): StoredStrophe {
  const strophe: StoredStrophe = {
    id: nextId("strophe"),
    name,
    orderIndex,
    songId,
    createdAt: new Date(),
  };
  strophen.push(strophe);
  return strophe;
}

function seedZeile(stropheId: string, text: string, orderIndex: number): StoredZeile {
  const zeile: StoredZeile = {
    id: nextId("zeile"),
    text,
    uebersetzung: null,
    orderIndex,
    stropheId,
    markups: [],
  };
  zeilen.push(zeile);
  return zeile;
}

describe("Property 4: Zeile ownership chain enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDb();
  });

  // -------------------------------------------------------
  // Violation 1: Wrong song owner (userId !== song.userId)
  // -------------------------------------------------------
  describe("Wrong song owner → Zugriff verweigert", () => {
    it("createZeile rejects when userId !== song.userId", () => {
      return fc.assert(
        fc.asyncProperty(nonEmptyStringArb, async (zeileText) => {
          vi.clearAllMocks();
          resetDb();
          setupMocks();

          const owner = "owner-1";
          const intruder = "intruder-2";
          const song = seedSong(owner, "Test Song");
          const strophe = seedStrophe(song.id, "Verse 1", 0);

          await expect(
            createZeile(intruder, song.id, strophe.id, { text: zeileText })
          ).rejects.toThrow("Zugriff verweigert");
        }),
        { numRuns: 20 }
      );
    });

    it("updateZeile rejects when userId !== song.userId", () => {
      return fc.assert(
        fc.asyncProperty(nonEmptyStringArb, async (newText) => {
          vi.clearAllMocks();
          resetDb();
          setupMocks();

          const owner = "owner-1";
          const intruder = "intruder-2";
          const song = seedSong(owner, "Test Song");
          const strophe = seedStrophe(song.id, "Verse 1", 0);
          const zeile = seedZeile(strophe.id, "Original text", 0);

          await expect(
            updateZeile(intruder, song.id, strophe.id, zeile.id, { text: newText })
          ).rejects.toThrow("Zugriff verweigert");
        }),
        { numRuns: 20 }
      );
    });

    it("deleteZeile rejects when userId !== song.userId", () => {
      return fc.assert(
        fc.asyncProperty(nonEmptyStringArb, async (songTitel) => {
          vi.clearAllMocks();
          resetDb();
          setupMocks();

          const owner = "owner-1";
          const intruder = "intruder-2";
          const song = seedSong(owner, songTitel);
          const strophe = seedStrophe(song.id, "Verse 1", 0);
          const zeile = seedZeile(strophe.id, "Some text", 0);

          await expect(
            deleteZeile(intruder, song.id, strophe.id, zeile.id)
          ).rejects.toThrow("Zugriff verweigert");
        }),
        { numRuns: 20 }
      );
    });

    it("reorderZeilen rejects when userId !== song.userId", () => {
      return fc.assert(
        fc.asyncProperty(nonEmptyStringArb, async (songTitel) => {
          vi.clearAllMocks();
          resetDb();
          setupMocks();

          const owner = "owner-1";
          const intruder = "intruder-2";
          const song = seedSong(owner, songTitel);
          const strophe = seedStrophe(song.id, "Verse 1", 0);
          const z1 = seedZeile(strophe.id, "Line 1", 0);
          const z2 = seedZeile(strophe.id, "Line 2", 1);

          await expect(
            reorderZeilen(intruder, song.id, strophe.id, [
              { id: z1.id, orderIndex: 1 },
              { id: z2.id, orderIndex: 0 },
            ])
          ).rejects.toThrow("Zugriff verweigert");
        }),
        { numRuns: 20 }
      );
    });
  });

  // -------------------------------------------------------
  // Violation 2: Strophe doesn't belong to song
  // -------------------------------------------------------
  describe("Strophe doesn't belong to song → Strophe nicht gefunden", () => {
    it("createZeile rejects when strophe.songId !== songId", () => {
      return fc.assert(
        fc.asyncProperty(nonEmptyStringArb, async (zeileText) => {
          vi.clearAllMocks();
          resetDb();
          setupMocks();

          const owner = "owner-1";
          const song = seedSong(owner, "Song A");
          const otherSong = seedSong(owner, "Song B");
          // Strophe belongs to otherSong, not song
          const strophe = seedStrophe(otherSong.id, "Verse 1", 0);

          await expect(
            createZeile(owner, song.id, strophe.id, { text: zeileText })
          ).rejects.toThrow("Strophe nicht gefunden");
        }),
        { numRuns: 20 }
      );
    });

    it("updateZeile rejects when strophe.songId !== songId", () => {
      return fc.assert(
        fc.asyncProperty(nonEmptyStringArb, async (newText) => {
          vi.clearAllMocks();
          resetDb();
          setupMocks();

          const owner = "owner-1";
          const song = seedSong(owner, "Song A");
          const otherSong = seedSong(owner, "Song B");
          const strophe = seedStrophe(otherSong.id, "Verse 1", 0);
          const zeile = seedZeile(strophe.id, "Original", 0);

          await expect(
            updateZeile(owner, song.id, strophe.id, zeile.id, { text: newText })
          ).rejects.toThrow("Strophe nicht gefunden");
        }),
        { numRuns: 20 }
      );
    });

    it("deleteZeile rejects when strophe.songId !== songId", () => {
      return fc.assert(
        fc.asyncProperty(nonEmptyStringArb, async (songTitel) => {
          vi.clearAllMocks();
          resetDb();
          setupMocks();

          const owner = "owner-1";
          const song = seedSong(owner, songTitel);
          const otherSong = seedSong(owner, "Other Song");
          const strophe = seedStrophe(otherSong.id, "Verse 1", 0);
          const zeile = seedZeile(strophe.id, "Some text", 0);

          await expect(
            deleteZeile(owner, song.id, strophe.id, zeile.id)
          ).rejects.toThrow("Strophe nicht gefunden");
        }),
        { numRuns: 20 }
      );
    });

    it("reorderZeilen rejects when strophe.songId !== songId", () => {
      return fc.assert(
        fc.asyncProperty(nonEmptyStringArb, async (songTitel) => {
          vi.clearAllMocks();
          resetDb();
          setupMocks();

          const owner = "owner-1";
          const song = seedSong(owner, songTitel);
          const otherSong = seedSong(owner, "Other Song");
          const strophe = seedStrophe(otherSong.id, "Verse 1", 0);
          const z1 = seedZeile(strophe.id, "Line 1", 0);
          const z2 = seedZeile(strophe.id, "Line 2", 1);

          await expect(
            reorderZeilen(owner, song.id, strophe.id, [
              { id: z1.id, orderIndex: 1 },
              { id: z2.id, orderIndex: 0 },
            ])
          ).rejects.toThrow("Strophe nicht gefunden");
        }),
        { numRuns: 20 }
      );
    });
  });

  // -------------------------------------------------------
  // Violation 3: Zeile doesn't belong to strophe
  // (only applies to updateZeile, deleteZeile — createZeile
  //  and reorderZeilen don't take a zeileId directly for
  //  ownership check at the individual zeile level)
  // -------------------------------------------------------
  describe("Zeile doesn't belong to strophe → Zeile nicht gefunden", () => {
    it("updateZeile rejects when zeile.stropheId !== stropheId", () => {
      return fc.assert(
        fc.asyncProperty(nonEmptyStringArb, async (newText) => {
          vi.clearAllMocks();
          resetDb();
          setupMocks();

          const owner = "owner-1";
          const song = seedSong(owner, "Test Song");
          const strophe = seedStrophe(song.id, "Verse 1", 0);
          const otherStrophe = seedStrophe(song.id, "Chorus", 1);
          // Zeile belongs to otherStrophe, not strophe
          const zeile = seedZeile(otherStrophe.id, "Original", 0);

          await expect(
            updateZeile(owner, song.id, strophe.id, zeile.id, { text: newText })
          ).rejects.toThrow("Zeile nicht gefunden");
        }),
        { numRuns: 20 }
      );
    });

    it("deleteZeile rejects when zeile.stropheId !== stropheId", () => {
      return fc.assert(
        fc.asyncProperty(nonEmptyStringArb, async (songTitel) => {
          vi.clearAllMocks();
          resetDb();
          setupMocks();

          const owner = "owner-1";
          const song = seedSong(owner, songTitel);
          const strophe = seedStrophe(song.id, "Verse 1", 0);
          const otherStrophe = seedStrophe(song.id, "Chorus", 1);
          const zeile = seedZeile(otherStrophe.id, "Some text", 0);

          await expect(
            deleteZeile(owner, song.id, strophe.id, zeile.id)
          ).rejects.toThrow("Zeile nicht gefunden");
        }),
        { numRuns: 20 }
      );
    });
  });
});
