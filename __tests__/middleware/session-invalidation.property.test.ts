/**
 * Property-Test: Aktive Session-Invalidierung bei Sperrung
 *
 * Property 7: Für jeden Benutzer mit einer aktiven Session, dessen accountStatus
 * auf SUSPENDED geändert wird, muss die nächste Anfrage über die Middleware
 * die Session beenden und auf die Login-Seite weiterleiten.
 *
 * **Validates: Requirements 3.4**
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import { NextResponse } from "next/server";

// Mock session controlled per test
let mockSession: { user: { role: string; accountStatus?: string } } | null =
  null;

vi.mock("next-auth", () => ({
  default: () => ({
    auth: (handler: (req: unknown) => unknown) => {
      return (req: {
        nextUrl: { pathname: string };
        url: string;
        auth?: unknown;
        cookies?: unknown;
      }) => {
        req.auth = mockSession;
        return handler(req);
      };
    },
  }),
}));

vi.mock("@/lib/auth.config", () => ({
  authConfig: {},
}));

let middleware: (req: {
  nextUrl: { pathname: string };
  url: string;
  auth?: unknown;
  cookies: {
    has: (name: string) => boolean;
    get: (name: string) => { name: string; value: string } | undefined;
  };
}) => unknown;

function createRequest(pathname: string, cookies: Record<string, string> = {}) {
  const cookieStore = new Map(Object.entries(cookies));
  return {
    nextUrl: { pathname },
    url: `http://localhost:3000${pathname}`,
    auth: undefined as unknown,
    cookies: {
      has: (name: string) => cookieStore.has(name),
      get: (name: string) =>
        cookieStore.has(name)
          ? { name, value: cookieStore.get(name)! }
          : undefined,
    },
  };
}

// Arbitraries
const roleArb = fc.constantFrom("USER", "ADMIN");

const protectedPagePathArb = fc.constantFrom(
  "/dashboard",
  "/songs",
  "/profile",
  "/settings",
  "/practice"
);

const protectedApiPathArb = fc.constantFrom(
  "/api/songs",
  "/api/profile",
  "/api/coach",
  "/api/some-endpoint"
);

describe("Property 7: Aktive Session-Invalidierung bei Sperrung", () => {
  beforeEach(async () => {
    mockSession = null;
    vi.resetModules();

    vi.doMock("next-auth", () => ({
      default: () => ({
        auth: (handler: (req: unknown) => unknown) => {
          return (req: {
            nextUrl: { pathname: string };
            url: string;
            auth?: unknown;
            cookies?: unknown;
          }) => {
            req.auth = mockSession;
            return handler(req);
          };
        },
      }),
    }));

    vi.doMock("@/lib/auth.config", () => ({
      authConfig: {},
    }));

    const mod = await import("../../middleware");
    middleware = mod.default as typeof middleware;
  });

  it("SUSPENDED user page requests redirect to /login", () => {
    fc.assert(
      fc.property(roleArb, protectedPagePathArb, (role, path) => {
        mockSession = { user: { role, accountStatus: "SUSPENDED" } };
        const res = middleware(createRequest(path)) as NextResponse;
        expect(res.status).toBe(307);
        expect(res.headers.get("location")).toContain("/login");
      }),
      { numRuns: 100 }
    );
  });

  it("SUSPENDED user API requests return 401", () => {
    fc.assert(
      fc.property(roleArb, protectedApiPathArb, (role, path) => {
        mockSession = { user: { role, accountStatus: "SUSPENDED" } };
        const res = middleware(createRequest(path)) as NextResponse;
        expect(res.status).toBe(401);
      }),
      { numRuns: 100 }
    );
  });

  it("ACTIVE user requests are allowed through", () => {
    fc.assert(
      fc.property(roleArb, protectedPagePathArb, (role, path) => {
        mockSession = { user: { role, accountStatus: "ACTIVE" } };
        const res = middleware(createRequest(path)) as NextResponse;
        expect(res.status).not.toBe(307);
        expect(res.status).not.toBe(401);
      }),
      { numRuns: 100 }
    );
  });
});
