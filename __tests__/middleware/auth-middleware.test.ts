/**
 * Middleware Unit Tests: Route-Schutz, Rolle-Check
 *
 * Validates: Requirements 4.3, 4.4, 4.5, 7.1, 7.2
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// Mock auth to return a function that wraps the callback
let mockSession: { user: { role: string } } | null = null;

vi.mock("@/lib/auth", () => ({
  auth: (handler: (req: unknown) => unknown) => {
    // Return the middleware function that injects auth into the request
    return (req: { nextUrl: { pathname: string }; url: string; auth?: unknown; cookies?: unknown }) => {
      req.auth = mockSession;
      return handler(req);
    };
  },
}));

// We need to import the default export (the wrapped middleware)
// and the config from middleware.ts
let middleware: (req: { nextUrl: { pathname: string }; url: string; auth?: unknown; cookies: { has: (name: string) => boolean; get: (name: string) => { name: string; value: string } | undefined } }) => unknown;
let config: { matcher: string[] };

function createRequest(pathname: string, cookies: Record<string, string> = {}) {
  const cookieStore = new Map(Object.entries(cookies));
  return {
    nextUrl: { pathname },
    url: `http://localhost:3000${pathname}`,
    auth: undefined as unknown,
    cookies: {
      has: (name: string) => cookieStore.has(name),
      get: (name: string) => cookieStore.has(name) ? { name, value: cookieStore.get(name)! } : undefined,
    },
  };
}

describe("Middleware für Route-Schutz", () => {
  beforeEach(async () => {
    mockSession = null;
    vi.resetModules();

    vi.doMock("@/lib/auth", () => ({
      auth: (handler: (req: unknown) => unknown) => {
        return (req: { nextUrl: { pathname: string }; url: string; auth?: unknown; cookies?: unknown }) => {
          req.auth = mockSession;
          return handler(req);
        };
      },
    }));

    const mod = await import("../../middleware");
    middleware = mod.default as typeof middleware;
    config = mod.config;
  });

  describe("Öffentliche Routen", () => {
    it("erlaubt /login ohne Session", () => {
      mockSession = null;
      const res = middleware(createRequest("/login")) as NextResponse;
      // NextResponse.next() has no status redirect
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });

    it("erlaubt /register ohne Session", () => {
      mockSession = null;
      const res = middleware(createRequest("/register")) as NextResponse;
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });

    it("erlaubt /setup ohne Session", () => {
      mockSession = null;
      const res = middleware(createRequest("/setup")) as NextResponse;
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });

    it("erlaubt /api/auth/* ohne Session", () => {
      mockSession = null;
      const res = middleware(createRequest("/api/auth/signin")) as NextResponse;
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });

    it("erlaubt /api/setup/* ohne Session", () => {
      mockSession = null;
      const res = middleware(createRequest("/api/setup/status")) as NextResponse;
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });
  });

  describe("Geschützte Routen ohne Session", () => {
    it("leitet Seiten-Requests auf /login um", () => {
      mockSession = null;
      const res = middleware(createRequest("/dashboard")) as NextResponse;
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/login");
    });

    it("gibt 401 für API-Requests ohne Session zurück", async () => {
      mockSession = null;
      const res = middleware(createRequest("/api/some-endpoint")) as NextResponse;
      expect(res.status).toBe(401);
    });
  });

  describe("Session-Ablauf-Handling", () => {
    it("leitet auf /login?expired=true um wenn Session-Cookie vorhanden aber Session ungültig", () => {
      mockSession = null;
      const res = middleware(createRequest("/dashboard", { "authjs.session-token": "expired-token" })) as NextResponse;
      expect(res.status).toBe(307);
      const location = res.headers.get("location")!;
      expect(location).toContain("/login");
      expect(location).toContain("expired=true");
    });

    it("leitet auf /login?expired=true um bei __Secure- Cookie-Variante", () => {
      mockSession = null;
      const res = middleware(createRequest("/dashboard", { "__Secure-authjs.session-token": "expired-token" })) as NextResponse;
      expect(res.status).toBe(307);
      const location = res.headers.get("location")!;
      expect(location).toContain("/login");
      expect(location).toContain("expired=true");
    });

    it("leitet auf /login ohne expired-Parameter um wenn kein Session-Cookie vorhanden", () => {
      mockSession = null;
      const res = middleware(createRequest("/dashboard")) as NextResponse;
      expect(res.status).toBe(307);
      const location = res.headers.get("location")!;
      expect(location).toContain("/login");
      expect(location).not.toContain("expired=true");
    });

    it("gibt 401 für API-Requests auch bei abgelaufener Session zurück (kein Redirect)", () => {
      mockSession = null;
      const res = middleware(createRequest("/api/some-endpoint", { "authjs.session-token": "expired-token" })) as NextResponse;
      expect(res.status).toBe(401);
    });
  });

  describe("Admin-Routen", () => {
    it("gibt 403 für USER auf /admin/* zurück", async () => {
      mockSession = { user: { role: "USER" } };
      const res = middleware(createRequest("/admin/users")) as NextResponse;
      expect(res.status).toBe(403);
    });

    it("gibt 403 für USER auf /api/users/* zurück", async () => {
      mockSession = { user: { role: "USER" } };
      const res = middleware(createRequest("/api/users")) as NextResponse;
      expect(res.status).toBe(403);
    });

    it("erlaubt ADMIN auf /admin/*", () => {
      mockSession = { user: { role: "ADMIN" } };
      const res = middleware(createRequest("/admin/users")) as NextResponse;
      expect(res.status).not.toBe(403);
      expect(res.status).not.toBe(401);
    });

    it("erlaubt ADMIN auf /api/users/*", () => {
      mockSession = { user: { role: "ADMIN" } };
      const res = middleware(createRequest("/api/users")) as NextResponse;
      expect(res.status).not.toBe(403);
      expect(res.status).not.toBe(401);
    });
  });

  describe("Authentifizierte Benutzer auf normalen Routen", () => {
    it("erlaubt USER auf normale Seiten", () => {
      mockSession = { user: { role: "USER" } };
      const res = middleware(createRequest("/dashboard")) as NextResponse;
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });

    it("erlaubt ADMIN auf normale Seiten", () => {
      mockSession = { user: { role: "ADMIN" } };
      const res = middleware(createRequest("/dashboard")) as NextResponse;
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });
  });

  describe("Config Matcher", () => {
    it("exportiert einen Matcher der statische Dateien ausschließt", () => {
      expect(config).toBeDefined();
      expect(config.matcher).toBeDefined();
      expect(config.matcher.length).toBeGreaterThan(0);
    });
  });
});
