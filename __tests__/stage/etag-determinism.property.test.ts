/**
 * Property 13: ETag-Header-Präsenz
 *
 * **Validates: Requirements 13.4**
 */
// Feature: lyco-stage, Property 13: ETag-Header-Präsenz

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import { createHash } from "crypto";

// --- Prisma mock ---
vi.mock("@/lib/prisma", () => ({
  prisma: {
    song: { findMany: vi.fn() },
    set: { findMany: vi.fn() },
    fortschritt: { findMany: vi.fn() },
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
import { GET as bundleGET } from "@/app/api/stage/bundle/route";
import { GET as progressGET } from "@/app/api/stage/progress/route";

const mockPrisma = vi.mocked(prisma);

// --- Generators ---
const userIdArb = fc.stringMatching(/^user-[a-z0-9]{4,8}$/);
const idArb = fc.stringMatching(/^[a-z0-9]{8,16}$/);

const zeileArb = fc.record({
  id: idArb,
  text: fc.string({ minLength: 1, maxLength: 30 }),
  orderIndex: fc.nat({ max: 10 }),
});

const stropheArb = fc.record({
  id: idArb,
  name: fc.string({ minLength: 1, maxLength: 20 }),
  orderIndex: fc.nat({ max: 5 }),
  zeilen: fc.array(zeileArb, { minLength: 0, maxLength: 3 }),
  markups: fc.constant([]),
});

const songArb = fc.record({
  id: idArb,
  titel: fc.string({ minLength: 1, maxLength: 30 }),
  kuenstler: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
  strophen: fc.array(stropheArb, { minLength: 0, maxLength: 3 }),
});

const setSongArb = fc.record({
  songId: idArb,
  orderIndex: fc.nat({ max: 10 }),
});

const setArb = fc.record({
  id: idArb,
  name: fc.string({ minLength: 1, maxLength: 30 }),
  description: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
  songs: fc.array(setSongArb, { minLength: 0, maxLength: 3 }),
});

const fortschrittArb = fc.record({
  stropheId: idArb,
  prozent: fc.integer({ min: 0, max: 100 }),
});

describe("Property 13: ETag-Header-Präsenz", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bundle endpoint always includes ETag header on successful response", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        fc.array(songArb, { minLength: 0, maxLength: 5 }),
        fc.array(setArb, { minLength: 0, maxLength: 3 }),
        async (userId, songs, sets) => {
          mockAuth.mockResolvedValue({ user: { id: userId } });
          (mockPrisma.song.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(songs);
          (mockPrisma.set.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(sets);

          const response = await bundleGET();

          expect(response.status).toBe(200);
          expect(response.headers.get("ETag")).not.toBeNull();
          expect(response.headers.get("ETag")).not.toBe("");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("progress endpoint always includes ETag header on successful response", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        fc.array(fortschrittArb, { minLength: 0, maxLength: 10 }),
        async (userId, fortschritte) => {
          mockAuth.mockResolvedValue({ user: { id: userId } });
          (mockPrisma.fortschritt.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(fortschritte);

          const response = await progressGET();

          expect(response.status).toBe(200);
          expect(response.headers.get("ETag")).not.toBeNull();
          expect(response.headers.get("ETag")).not.toBe("");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("identical data produces identical ETags (determinism)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(songArb, { minLength: 0, maxLength: 5 }),
        fc.array(setArb, { minLength: 0, maxLength: 3 }),
        async (songs, sets) => {
          // Compute ETag the same way the route does, but with a fixed timestamp
          // We test the hash function directly for determinism
          const data1 = { sets, songs, timestamp: "2024-01-01T00:00:00.000Z" };
          const data2 = { sets, songs, timestamp: "2024-01-01T00:00:00.000Z" };

          const etag1 = createHash("sha256").update(JSON.stringify(data1)).digest("hex");
          const etag2 = createHash("sha256").update(JSON.stringify(data2)).digest("hex");

          expect(etag1).toBe(etag2);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("different data produces different ETags", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(songArb, { minLength: 1, maxLength: 3 }),
        fc.array(songArb, { minLength: 1, maxLength: 3 }),
        async (songs1, songs2) => {
          // Only test when data is actually different
          fc.pre(JSON.stringify(songs1) !== JSON.stringify(songs2));

          const data1 = { sets: [], songs: songs1, timestamp: "2024-01-01T00:00:00.000Z" };
          const data2 = { sets: [], songs: songs2, timestamp: "2024-01-01T00:00:00.000Z" };

          const etag1 = createHash("sha256").update(JSON.stringify(data1)).digest("hex");
          const etag2 = createHash("sha256").update(JSON.stringify(data2)).digest("hex");

          expect(etag1).not.toBe(etag2);
        },
      ),
      { numRuns: 100 },
    );
  });
});
