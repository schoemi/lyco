/**
 * Property 11: Session Round-Trip
 *
 * Für jede gültige Lernmethode und jeden eigenen Song: Nach dem Anlegen von N Sessions
 * über `createSession` muss `getSessionCount` den Wert N zurückgeben.
 *
 * **Validates: Requirements 7.1, 7.2, 7.3**
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

// --- In-memory store ---
interface StoredSession {
  id: string;
  userId: string;
  songId: string;
  lernmethode: string;
  createdAt: Date;
}

let sessions: StoredSession[] = [];
let idCounter = 0;

function nextId(): string {
  return `id-${++idCounter}`;
}

function resetDb() {
  sessions = [];
  idCounter = 0;
}

// --- Mock Prisma ---
const { mockPrisma } = vi.hoisted(() => {
  const _mockSong = { findUnique: vi.fn() };
  const _mockSession = { create: vi.fn(), count: vi.fn() };

  const _mockPrisma: Record<string, unknown> = {
    song: _mockSong,
    session: _mockSession,
  };

  return { mockPrisma: _mockPrisma };
});

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { createSession, getSessionCount } from "@/lib/services/session-service";
import { prisma } from "@/lib/prisma";

// --- Arbitraries ---
const lernmethodeArb = fc.constantFrom(
  "EMOTIONAL",
  "LUECKENTEXT",
  "ZEILE_FUER_ZEILE",
  "RUECKWAERTS",
  "SPACED_REPETITION",
  "QUIZ"
) as fc.Arbitrary<any>;

// --- Mock setup ---
function setupMocks(userId: string, songId: string) {
  const mockedSongFindUnique = vi.mocked(prisma.song.findUnique);
  const mockedSessionCreate = vi.mocked(prisma.session.create);
  const mockedSessionCount = vi.mocked(prisma.session.count);

  mockedSongFindUnique.mockImplementation(async () => {
    return { id: songId, userId } as any;
  });

  mockedSessionCreate.mockImplementation(async (args: any) => {
    const session: StoredSession = {
      id: nextId(),
      userId: args.data.userId,
      songId: args.data.songId,
      lernmethode: args.data.lernmethode,
      createdAt: new Date(),
    };
    sessions.push(session);
    return session as any;
  });

  mockedSessionCount.mockImplementation(async (args: any) => {
    return sessions.filter(
      (s) => s.userId === args.where.userId && s.songId === args.where.songId
    ).length;
  });
}

describe("Property 11: Session Round-Trip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDb();
  });

  it("Nach N createSession-Aufrufen liefert getSessionCount den Wert N", () => {
    return fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        lernmethodeArb,
        async (n, lernmethode) => {
          vi.clearAllMocks();
          resetDb();

          const userId = "user-1";
          const songId = "song-1";
          setupMocks(userId, songId);

          // Create N sessions
          for (let i = 0; i < n; i++) {
            await createSession(userId, songId, lernmethode);
          }

          // getSessionCount returns N
          const count = await getSessionCount(userId, songId);
          expect(count).toBe(n);
        }
      ),
      { numRuns: 20 }
    );
  });
});
