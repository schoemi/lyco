/**
 * Property 2: Interpretation Ownership
 *
 * Für jede Strophe, die zu einem Song eines anderen Benutzers gehört, muss jeder
 * Versuch, eine Interpretation zu erstellen, zu aktualisieren oder zu löschen,
 * mit einem Fehler abgelehnt werden („Zugriff verweigert").
 *
 * **Validates: Requirements 2.4, 4.7**
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

// --- In-memory store ---
interface StoredInterpretation {
  id: string;
  userId: string;
  stropheId: string;
  text: string;
  updatedAt: Date;
}

interface StoredSong {
  id: string;
  userId: string;
}

interface StoredStrophe {
  id: string;
  songId: string;
}

let interpretationen: StoredInterpretation[] = [];
let songs: StoredSong[] = [];
let strophen: StoredStrophe[] = [];
let idCounter = 0;

function nextId(prefix: string): string {
  return `${prefix}-${++idCounter}`;
}

function resetDb() {
  interpretationen = [];
  songs = [];
  strophen = [];
  idCounter = 0;
}

// --- Mock Prisma ---
const { mockPrisma } = vi.hoisted(() => {
  const _mockStrophe = { findUnique: vi.fn() };
  const _mockInterpretation = {
    upsert: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
  };
  const _mockSong = { findUnique: vi.fn() };
  const _mockSongFreigabe = { findUnique: vi.fn() };
  const _mockSetFreigabe = { findFirst: vi.fn() };

  const _mockPrisma: Record<string, unknown> = {
    strophe: _mockStrophe,
    interpretation: _mockInterpretation,
    song: _mockSong,
    songFreigabe: _mockSongFreigabe,
    setFreigabe: _mockSetFreigabe,
  };

  return { mockPrisma: _mockPrisma };
});

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import {
  upsertInterpretation,
  deleteInterpretation,
  getInterpretationsForSong,
} from "@/lib/services/interpretation-service";
import { prisma } from "@/lib/prisma";

// --- Arbitraries ---
const nonEmptyStringArb = fc
  .stringMatching(/^[A-Za-z0-9 ]{1,30}$/)
  .filter((s) => s.trim().length > 0);

// --- Mock setup ---
function setupMocks() {
  const mockedStropheFindUnique = vi.mocked(prisma.strophe.findUnique);
  const mockedInterpretationFindUnique = vi.mocked(prisma.interpretation.findUnique);
  const mockedSongFindUnique = vi.mocked(prisma.song.findUnique);
  const mockedSongFreigabeFindUnique = vi.mocked((prisma as any).songFreigabe.findUnique);
  const mockedSetFreigabeFindFirst = vi.mocked((prisma as any).setFreigabe.findFirst);

  mockedStropheFindUnique.mockImplementation(async (args: any) => {
    const stropheId = args?.where?.id;
    const found = strophen.find((s) => s.id === stropheId);
    if (!found) return null as any;
    const song = songs.find((s) => s.id === found.songId);
    return {
      id: found.id,
      songId: found.songId,
      song: song ? { userId: song.userId, id: song.id } : null,
    } as any;
  });

  mockedSongFindUnique.mockImplementation(async (args: any) => {
    const songId = args?.where?.id;
    const found = songs.find((s) => s.id === songId);
    return found ? ({ id: found.id, userId: found.userId } as any) : (null as any);
  });

  mockedInterpretationFindUnique.mockImplementation(async (args: any) => {
    const interpId = args?.where?.id;
    return (
      interpretationen.find((i) => i.id === interpId) ?? null
    ) as any;
  });

  // No freigabe exists for the intruder — access should be denied
  mockedSongFreigabeFindUnique.mockResolvedValue(null);
  mockedSetFreigabeFindFirst.mockResolvedValue(null);
}

// --- Seed helpers ---
function seedSong(ownerId: string): StoredSong {
  const song: StoredSong = { id: nextId("song"), userId: ownerId };
  songs.push(song);
  return song;
}

function seedStrophe(songId: string): StoredStrophe {
  const strophe: StoredStrophe = { id: nextId("strophe"), songId };
  strophen.push(strophe);
  return strophe;
}

function seedInterpretation(userId: string, stropheId: string): StoredInterpretation {
  const interp: StoredInterpretation = {
    id: nextId("interp"),
    userId,
    stropheId,
    text: "owner interpretation",
    updatedAt: new Date(),
  };
  interpretationen.push(interp);
  return interp;
}

describe("Property 2: Interpretation Ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDb();
  });

  it("upsertInterpretation lehnt Zugriff auf Strophen fremder Songs ab", () => {
    return fc.assert(
      fc.asyncProperty(nonEmptyStringArb, async (text) => {
        vi.clearAllMocks();
        resetDb();
        setupMocks();

        const owner = "user-owner";
        const intruder = "user-intruder";

        const song = seedSong(owner);
        const strophe = seedStrophe(song.id);

        await expect(
          upsertInterpretation(intruder, strophe.id, text)
        ).rejects.toThrow("Zugriff verweigert");
      }),
      { numRuns: 20 }
    );
  });

  it("deleteInterpretation lehnt Zugriff auf Interpretationen anderer Benutzer ab", () => {
    return fc.assert(
      fc.asyncProperty(nonEmptyStringArb, async (_text) => {
        vi.clearAllMocks();
        resetDb();
        setupMocks();

        const owner = "user-owner";
        const intruder = "user-intruder";

        const song = seedSong(owner);
        const strophe = seedStrophe(song.id);
        const interp = seedInterpretation(owner, strophe.id);

        await expect(
          deleteInterpretation(intruder, interp.id)
        ).rejects.toThrow("Zugriff verweigert");
      }),
      { numRuns: 20 }
    );
  });

  it("getInterpretationsForSong lehnt Zugriff auf Songs anderer Benutzer ab", () => {
    return fc.assert(
      fc.asyncProperty(nonEmptyStringArb, async (_text) => {
        vi.clearAllMocks();
        resetDb();
        setupMocks();

        const owner = "user-owner";
        const intruder = "user-intruder";

        const song = seedSong(owner);

        await expect(
          getInterpretationsForSong(intruder, song.id)
        ).rejects.toThrow("Zugriff verweigert");
      }),
      { numRuns: 20 }
    );
  });
});
