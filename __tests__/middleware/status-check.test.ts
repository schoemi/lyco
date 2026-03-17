/**
 * Unit-Test: Middleware Status-Check
 *
 * Testen: Session-Invalidierung bei gesperrtem Konto, Weiterleitung bei PENDING
 *
 * Validates: Requirements 3.4
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
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

describe("Middleware Status-Check (Anforderung 3.4)", () => {
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

  it("SUSPENDED Benutzer auf Seiten-Route → Redirect auf /login mit Session-Cookies gelöscht", () => {
    mockSession = { user: { role: "USER", accountStatus: "SUSPENDED" } };
    const res = middleware(createRequest("/dashboard")) as NextResponse;

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");

    // Verify session cookies are deleted via Set-Cookie headers
    const setCookieHeader = res.headers.get("set-cookie");
    expect(setCookieHeader).toBeTruthy();
    expect(setCookieHeader).toContain("authjs.session-token");
  });

  it("PENDING Benutzer auf Seiten-Route → Redirect auf /login", () => {
    mockSession = { user: { role: "USER", accountStatus: "PENDING" } };
    const res = middleware(createRequest("/dashboard")) as NextResponse;

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("SUSPENDED Benutzer auf API-Route → 401 Response", () => {
    mockSession = { user: { role: "USER", accountStatus: "SUSPENDED" } };
    const res = middleware(createRequest("/api/songs")) as NextResponse;

    expect(res.status).toBe(401);
  });

  it("PENDING Benutzer auf API-Route → 401 Response", () => {
    mockSession = { user: { role: "USER", accountStatus: "PENDING" } };
    const res = middleware(createRequest("/api/songs")) as NextResponse;

    expect(res.status).toBe(401);
  });

  it("ACTIVE Benutzer passiert normal durch", () => {
    mockSession = { user: { role: "USER", accountStatus: "ACTIVE" } };
    const res = middleware(createRequest("/dashboard")) as NextResponse;

    expect(res.status).not.toBe(307);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});
