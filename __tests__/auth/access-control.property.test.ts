/**
 * Property 7: Rollenbasierte Zugriffskontrolle
 *
 * Für jede geschützte API-Route und jeden Benutzer gilt:
 * - Ein Request ohne gültige Session muss mit HTTP 401 abgelehnt werden.
 * - Ein Request mit Rolle "USER" auf eine Admin-Route muss mit HTTP 403 abgelehnt werden.
 * - Ein Request mit Rolle "ADMIN" auf eine Admin-Route muss zugelassen werden.
 *
 * **Validates: Requirements 4.3, 4.4, 4.5, 7.1, 7.2**
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import fc from "fast-check";

const PBT_CONFIG = { numRuns: 20 };

// Mutable session for controlling auth state per test
let mockSession: { user: { role: string } } | null = null;

// Arbitrary: generates a random alphanumeric path segment
const pathSegmentArb = fc.stringMatching(/^[a-z0-9]{1,12}$/);

// Arbitrary: generates random sub-paths for admin API routes (/api/users/...)
const adminApiRouteArb = fc
  .tuple(pathSegmentArb, fc.boolean())
  .map(([segment, hasExtra]) =>
    hasExtra ? `/api/users/${segment}` : `/api/users`
  );

// Arbitrary: generates random sub-paths for admin page routes (/admin/...)
const adminPageRouteArb = pathSegmentArb.map((segment) => `/admin/${segment}`);

// Combined arbitrary for any admin route
const adminRouteArb = fc.oneof(adminApiRouteArb, adminPageRouteArb);

// Only admin API routes (for 401 test on API routes without session)
const adminApiOnlyRouteArb = adminApiRouteArb;

type MiddlewareFn = (req: {
  nextUrl: { pathname: string };
  url: string;
  auth?: unknown;
}) => unknown;

function createRequest(pathname: string) {
  return {
    nextUrl: { pathname },
    url: `http://localhost:3000${pathname}`,
    auth: undefined as unknown,
  };
}

describe("Property 7: Rollenbasierte Zugriffskontrolle", () => {
  let middleware: MiddlewareFn;

  beforeEach(async () => {
    mockSession = null;
    vi.resetModules();

    vi.doMock("@/lib/auth", () => ({
      auth: (
        handler: (req: unknown) => unknown
      ) => {
        return (req: {
          nextUrl: { pathname: string };
          url: string;
          auth?: unknown;
        }) => {
          req.auth = mockSession;
          return handler(req);
        };
      },
    }));

    const mod = await import("../../middleware");
    middleware = mod.default as MiddlewareFn;
  });

  it("Ohne Session auf Admin-API-Route → 401", () => {
    fc.assert(
      fc.property(adminApiOnlyRouteArb, (route) => {
        mockSession = null;
        const res = middleware(createRequest(route)) as NextResponse;
        expect(res.status).toBe(401);
      }),
      PBT_CONFIG
    );
  });

  it("User-Rolle auf Admin-Route → 403", () => {
    fc.assert(
      fc.property(adminRouteArb, (route) => {
        mockSession = { user: { role: "USER" } };
        const res = middleware(createRequest(route)) as NextResponse;
        expect(res.status).toBe(403);
      }),
      PBT_CONFIG
    );
  });

  it("Admin-Rolle auf Admin-Route → Zugriff erlaubt (kein 401/403)", () => {
    fc.assert(
      fc.property(adminRouteArb, (route) => {
        mockSession = { user: { role: "ADMIN" } };
        const res = middleware(createRequest(route)) as NextResponse;
        expect(res.status).not.toBe(401);
        expect(res.status).not.toBe(403);
      }),
      PBT_CONFIG
    );
  });
});
