/**
 * Property 12: API-Authentifizierung
 *
 * **Validates: Requirements 13.3**
 */
// Feature: lyco-stage, Property 12: API-Authentifizierung

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import { NextRequest } from "next/server";

// --- Prisma mock (not used but required by route imports) ---
vi.mock("@/lib/prisma", () => ({
  prisma: {
    song: { findMany: vi.fn() },
    set: { findMany: vi.fn() },
    fortschritt: { findMany: vi.fn() },
  },
}));

// --- Auth mock ---
const { mockAuth } = vi.hoisted(() => {
  const _mockAuth = vi.fn().mockResolvedValue(null);
  return { mockAuth: _mockAuth };
});

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

import { GET as bundleGET } from "@/app/api/stage/bundle/route";
import { GET as progressGET } from "@/app/api/stage/progress/route";

describe("Property 12: API-Authentifizierung", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(null);
  });

  it("both stage endpoints return 401 when no session", async () => {
    const endpoints = [
      { path: "/api/stage/bundle", handler: bundleGET },
      { path: "/api/stage/progress", handler: progressGET },
    ] as const;

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom("/api/stage/bundle", "/api/stage/progress"),
        async (path) => {
          mockAuth.mockResolvedValue(null);

          const endpoint = endpoints.find((e) => e.path === path)!;
          const response = await endpoint.handler();

          expect(
            response.status,
            `${path} should return 401 but got ${response.status}`,
          ).toBe(401);

          const body = await response.json();
          expect(body.error).toBe("Nicht authentifiziert");
        },
      ),
      { numRuns: 100 },
    );
  });
});
