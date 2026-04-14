/**
 * Property 11: Progress-API liefert vollständige Fortschrittsdaten
 *
 * **Validates: Requirements 13.2**
 */
// Feature: lyco-stage, Property 11: Progress-API liefert vollständige Fortschrittsdaten

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import { NextRequest } from "next/server";

// --- Prisma mock ---
vi.mock("@/lib/prisma", () => ({
  prisma: {
    fortschritt: {
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
import { GET } from "@/app/api/stage/progress/route";

const mockPrisma = vi.mocked(prisma);

// --- Generators ---
const userIdArb = fc.stringMatching(/^user-[a-z0-9]{4,8}$/);
const idArb = fc.stringMatching(/^[a-z0-9]{8,16}$/);

const fortschrittArb = fc.record({
  stropheId: idArb,
  prozent: fc.integer({ min: 0, max: 100 }),
});

describe("Property 11: Progress-API liefert vollständige Fortschrittsdaten", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("response progress count equals DB fortschritt count for authenticated user", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        fc.array(fortschrittArb, { minLength: 0, maxLength: 20 }),
        async (userId, fortschritte) => {
          mockAuth.mockResolvedValue({ user: { id: userId } });
          (mockPrisma.fortschritt.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
            fortschritte,
          );

          const response = await GET();

          expect(response.status).toBe(200);

          const body = await response.json();
          expect(body.progress).toHaveLength(fortschritte.length);
          expect(body.timestamp).toBeDefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  it("each stropheId and prozent value is correctly mapped from DB records", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        fc.array(fortschrittArb, { minLength: 1, maxLength: 10 }),
        async (userId, fortschritte) => {
          mockAuth.mockResolvedValue({ user: { id: userId } });
          (mockPrisma.fortschritt.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
            fortschritte,
          );

          const response = await GET();
          const body = await response.json();

          for (let i = 0; i < fortschritte.length; i++) {
            expect(body.progress[i].stropheId).toBe(fortschritte[i].stropheId);
            expect(body.progress[i].prozent).toBe(fortschritte[i].prozent);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
