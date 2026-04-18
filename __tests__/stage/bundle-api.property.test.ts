/**
 * Property 10: Bundle-API liefert vollständige Nutzerdaten
 *
 * **Validates: Requirements 13.1**
 */
// Feature: lyco-stage, Property 10: Bundle-API liefert vollständige Nutzerdaten

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import { NextRequest } from "next/server";

// --- Prisma mock ---
vi.mock("@/lib/prisma", () => ({
  prisma: {
    song: {
      findMany: vi.fn(),
    },
    set: {
      findMany: vi.fn(),
    },
  },
}));

// --- Auth mock ---
const { mockAuth } = vi.hoisted(() => {
  const _mockAuth = vi.fn();
  return { mockAuth: _mockAuth };
});

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

import { prisma } from "@/lib/prisma";
import { GET } from "@/app/api/stage/bundle/route";

const mockPrisma = vi.mocked(prisma);

// --- Generators ---
const userIdArb = fc.stringMatching(/^user-[a-z0-9]{4,8}$/);
const idArb = fc.stringMatching(/^[a-z0-9]{8,16}$/);

const zeileArb = fc.record({
  id: idArb,
  text: fc.string({ minLength: 1, maxLength: 50 }),
  orderIndex: fc.nat({ max: 20 }),
});

const stropheArb = fc.record({
  id: idArb,
  name: fc.string({ minLength: 1, maxLength: 30 }),
  orderIndex: fc.nat({ max: 10 }),
  zeilen: fc.array(zeileArb, { minLength: 0, maxLength: 5 }),
  markups: fc.constant([]),
});

const songArb = fc.record({
  id: idArb,
  titel: fc.string({ minLength: 1, maxLength: 50 }),
  kuenstler: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: null }),
  strophen: fc.array(stropheArb, { minLength: 0, maxLength: 4 }),
});

const setSongArb = fc.record({
  songId: idArb,
  orderIndex: fc.nat({ max: 20 }),
});

const setArb = fc.record({
  id: idArb,
  name: fc.string({ minLength: 1, maxLength: 50 }),
  description: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
  songs: fc.array(setSongArb, { minLength: 0, maxLength: 5 }),
});

describe("Property 10: Bundle-API liefert vollständige Nutzerdaten", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("response song count equals DB song count for authenticated user", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        fc.array(songArb, { minLength: 0, maxLength: 10 }),
        fc.array(setArb, { minLength: 0, maxLength: 5 }),
        async (userId, songs, sets) => {
          mockAuth.mockResolvedValue({ user: { id: userId } });
          (mockPrisma.song.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(songs);
          (mockPrisma.set.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(sets);

          const request = new NextRequest("http://localhost:3000/api/stage/bundle");
          const response = await GET();

          expect(response.status).toBe(200);

          const body = await response.json();
          expect(body.songs).toHaveLength(songs.length);
          expect(body.sets).toHaveLength(sets.length);
          expect(body.timestamp).toBeDefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  it("all strophen and zeilen are included in the response", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        fc.array(songArb, { minLength: 1, maxLength: 5 }),
        async (userId, songs) => {
          mockAuth.mockResolvedValue({ user: { id: userId } });
          (mockPrisma.song.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(songs);
          (mockPrisma.set.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

          const response = await GET();
          const body = await response.json();

          for (let i = 0; i < songs.length; i++) {
            const dbSong = songs[i];
            const resSong = body.songs[i];
            expect(resSong.strophen).toHaveLength(dbSong.strophen.length);

            for (let j = 0; j < dbSong.strophen.length; j++) {
              expect(resSong.strophen[j].zeilen).toHaveLength(dbSong.strophen[j].zeilen.length);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
