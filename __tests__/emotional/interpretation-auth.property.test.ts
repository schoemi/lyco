/**
 * Property 4: Interpretation Auth Required
 *
 * Für jede Interpretation-API-Route gilt: Ein Request ohne gültige Session
 * muss mit HTTP 401 abgelehnt werden.
 *
 * **Validates: Requirements 3.4**
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import { NextRequest } from "next/server";

// --- Mock auth to return null (no session) ---
const { mockAuth } = vi.hoisted(() => {
  const _mockAuth = vi.fn().mockResolvedValue(null);
  return { mockAuth: _mockAuth };
});

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

// Mock interpretation service to prevent real calls (auth should block before these)
vi.mock("@/lib/services/interpretation-service", () => ({
  upsertInterpretation: vi.fn(),
  getInterpretationsForSong: vi.fn(),
  deleteInterpretation: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

// --- Import route handlers ---
import {
  POST as interpretationsPOST,
  GET as interpretationsGET,
} from "@/app/api/interpretations/route";
import { DELETE as interpretationIdDELETE } from "@/app/api/interpretations/[id]/route";

// --- Helpers ---
function makeRequest(method: string, url: string, body?: unknown): NextRequest {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

function makeParams<T extends Record<string, string>>(obj: T): { params: Promise<T> } {
  return { params: Promise.resolve(obj) };
}

// Arbitrary for random JSON-like body content
const randomBodyArb = fc.record({
  stropheId: fc.string(),
  text: fc.string(),
  songId: fc.string(),
});

// --- Route definitions ---
type RouteTestCase = {
  name: string;
  call: (body: Record<string, unknown>) => Promise<Response>;
};

function getRouteTestCases(body: Record<string, unknown>): RouteTestCase[] {
  return [
    {
      name: "POST /api/interpretations",
      call: () =>
        interpretationsPOST(
          makeRequest("POST", "/api/interpretations", body)
        ),
    },
    {
      name: "GET /api/interpretations",
      call: () =>
        interpretationsGET(
          makeRequest("GET", `/api/interpretations?songId=${body.songId ?? "abc"}`)
        ),
    },
    {
      name: "DELETE /api/interpretations/[id]",
      call: () =>
        interpretationIdDELETE(
          makeRequest("DELETE", "/api/interpretations/abc"),
          makeParams({ id: "abc" })
        ),
    },
  ];
}

describe("Property 4: Interpretation Auth Required", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(null);
  });

  it("Alle Interpretation-API-Routen geben 401 zurück wenn keine Session vorhanden ist", () => {
    return fc.assert(
      fc.asyncProperty(randomBodyArb, async (body) => {
        mockAuth.mockResolvedValue(null);

        const routes = getRouteTestCases(body as Record<string, unknown>);

        for (const route of routes) {
          const response = await route.call(body as Record<string, unknown>);
          expect(
            response.status,
            `${route.name} should return 401 but got ${response.status}`
          ).toBe(401);

          const json = await response.json();
          expect(json.error).toBeDefined();
        }
      }),
      { numRuns: 20 }
    );
  });
});
