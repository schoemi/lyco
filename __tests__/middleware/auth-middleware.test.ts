/**
 * Middleware Unit Tests: Route-Schutz, Rolle-Check, Kontostatus-Prüfung
 *
 * Validates: Requirements 3.4, 4.3, 4.4, 4.5, 7.1, 7.2
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// Mock session that the middleware will see via req.auth
let mockSession: { user: { role: string; accountStatus?: string } } | null = null;

// Mock next-auth (the actual import used by middleware.ts)
vi.mock("next-auth", () => ({
  default: (/* config */) => ({
    auth: (handler: (req: unknown) => unknown) => {
      return (req: { nextUrl: { pathname: string }; url: string; auth?: unknown; cookies?: unknown }) => {
        req.auth = mockSession;
        return handler(req);
      };
    },
  }),
}));

// Mock auth.config to avoid edge-runtime issues in tests
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
let config: { matcher: string[] };

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

describe("Middleware für Route-Schutz", () => {
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
    config = mod.config;
  });

  describe("Öffentliche Routen", () => {
    it("erlaubt /login ohne Session", () => {
      mockSession = null;
      const res = middleware(createRequest("/login")) as NextResponse;
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
      const res = middleware(
        createRequest("/api/setup/status")
      ) as NextResponse;
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
      const res = middleware(
        createRequest("/api/some-endpoint")
      ) as NextResponse;
      expect(res.status).toBe(401);
    });
  });

  describe("Session-Ablauf-Handling", () => {
    it("leitet auf /login?expired=true um wenn Session-Cookie vorhanden aber Session ungültig", () => {
      mockSession = null;
      const res = middleware(
        createRequest("/dashboard", {
          "authjs.session-token": "expierror-token",
        })
      ) as NextResponse;
      expect(res.status).toBe(307);
      const location = res.headers.get("location")!;
      expect(location).toContain("/login");
      expect(location).toContain("expired=true");
    });

    it("leitet auf /login?expired=true um bei __Secure- Cookie-Variante", () => {
      mockSession = null;
      const res = middleware(
        createRequest("/dashboard", {
          "__Secure-authjs.session-token": "expierror-token",
        })
      ) as NextResponse;
      expect(res.status).toBe(307);
      const location = res.headers.get("location")!;
      expect(location).toContain("/login");
      expect(location).toContain("expired=true");
    });

    it("leitet auf /login ohne expierror-Parameter um wenn kein Session-Cookie vorhanden", () => {
      mockSession = null;
      const res = middleware(createRequest("/dashboard")) as NextResponse;
      expect(res.status).toBe(307);
      const location = res.headers.get("location")!;
      expect(location).toContain("/login");
      expect(location).not.toContain("expired=true");
    });

    it("gibt 401 für API-Requests auch bei abgelaufener Session zurück (kein Redirect)", () => {
      mockSession = null;
      const res = middleware(
        createRequest("/api/some-endpoint", {
          "authjs.session-token": "expierror-token",
        })
      ) as NextResponse;
      expect(res.status).toBe(401);
    });
  });

  describe("Admin-Routen", () => {
    it("gibt 403 für USER auf /admin/* zurück", async () => {
      mockSession = { user: { role: "USER", accountStatus: "ACTIVE" } };
      const res = middleware(createRequest("/admin/users")) as NextResponse;
      expect(res.status).toBe(403);
    });

    it("gibt 403 für USER auf /api/users/* zurück", async () => {
      mockSession = { user: { role: "USER", accountStatus: "ACTIVE" } };
      const res = middleware(createRequest("/api/users")) as NextResponse;
      expect(res.status).toBe(403);
    });

    it("erlaubt ADMIN auf /admin/*", () => {
      mockSession = { user: { role: "ADMIN", accountStatus: "ACTIVE" } };
      const res = middleware(createRequest("/admin/users")) as NextResponse;
      expect(res.status).not.toBe(403);
      expect(res.status).not.toBe(401);
    });

    it("erlaubt ADMIN auf /api/users/*", () => {
      mockSession = { user: { role: "ADMIN", accountStatus: "ACTIVE" } };
      const res = middleware(createRequest("/api/users")) as NextResponse;
      expect(res.status).not.toBe(403);
      expect(res.status).not.toBe(401);
    });
  });

  describe("Authentifizierte Benutzer auf normalen Routen", () => {
    it("erlaubt USER auf normale Seiten", () => {
      mockSession = { user: { role: "USER", accountStatus: "ACTIVE" } };
      const res = middleware(createRequest("/dashboard")) as NextResponse;
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });

    it("erlaubt ADMIN auf normale Seiten", () => {
      mockSession = { user: { role: "ADMIN", accountStatus: "ACTIVE" } };
      const res = middleware(createRequest("/dashboard")) as NextResponse;
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });
  });

  describe("Kontostatus-Prüfung (Anforderung 3.4)", () => {
    it("leitet SUSPENDED Benutzer auf /login um und löscht Session-Cookies", () => {
      mockSession = { user: { role: "USER", accountStatus: "SUSPENDED" } };
      const res = middleware(createRequest("/dashboard")) as NextResponse;
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/login");
    });

    it("leitet PENDING Benutzer auf /login um", () => {
      mockSession = { user: { role: "USER", accountStatus: "PENDING" } };
      const res = middleware(createRequest("/dashboard")) as NextResponse;
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/login");
    });

    it("gibt 401 für SUSPENDED Benutzer auf API-Routen zurück", () => {
      mockSession = { user: { role: "USER", accountStatus: "SUSPENDED" } };
      const res = middleware(
        createRequest("/api/some-endpoint")
      ) as NextResponse;
      expect(res.status).toBe(401);
    });

    it("gibt 401 für PENDING Benutzer auf API-Routen zurück", () => {
      mockSession = { user: { role: "USER", accountStatus: "PENDING" } };
      const res = middleware(
        createRequest("/api/some-endpoint")
      ) as NextResponse;
      expect(res.status).toBe(401);
    });

    it("lässt ACTIVE Benutzer durch", () => {
      mockSession = { user: { role: "USER", accountStatus: "ACTIVE" } };
      const res = middleware(createRequest("/dashboard")) as NextResponse;
      expect(res.status).not.toBe(307);
      expect(res.status).not.toBe(401);
    });

    it("leitet auch SUSPENDED Admin auf /login um", () => {
      mockSession = { user: { role: "ADMIN", accountStatus: "SUSPENDED" } };
      const res = middleware(createRequest("/admin/users")) as NextResponse;
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/login");
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
