/**
 * Unit-Test für Service Worker (public/stage-sw.js)
 *
 * Testet:
 * - Cache-First-Verhalten für Stage-API-URLs und Stage-Assets (Anforderung 3.1)
 * - Offline-Fallback: gecachte Daten bei Netzwerkfehler (Anforderung 3.2)
 * - Stale-While-Revalidate: Cache-Aktualisierung im Hintergrund (Anforderung 3.3)
 * - Network-First für alle anderen Routen
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequire } from "module";
import path from "path";

// --- Typen für die exportierten SW-Funktionen ---
interface SWModule {
  STAGE_CACHE: string;
  STAGE_API_URLS: string[];
  isStageApiUrl: (url: string) => boolean;
  isStageAsset: (url: string) => boolean;
  cacheFirstWithRevalidate: (request: Request, cache: Cache) => Promise<Response>;
  networkFirst: (request: Request, cache: Cache) => Promise<Response>;
}

// Service Worker als CommonJS-Modul laden (umgeht SW-Kontext-Prüfung)
const require = createRequire(import.meta.url);
const swPath = path.resolve(process.cwd(), "public/stage-sw.js");
const sw: SWModule = require(swPath);

// --- Hilfsfunktionen für Mocks ---
function makeResponse(body: string, status = 200): Response {
  return new Response(body, { status, headers: { "Content-Type": "application/json" } });
}

function makeCacheMock(initialEntries: Map<string, Response> = new Map()) {
  const store = new Map(initialEntries);
  return {
    match: vi.fn(async (req: Request | string) => {
      const url = typeof req === "string" ? req : req.url;
      return store.get(url) ?? undefined;
    }),
    put: vi.fn(async (req: Request | string, res: Response) => {
      const url = typeof req === "string" ? req : req.url;
      store.set(url, res);
    }),
    _store: store,
  } as unknown as Cache & { _store: Map<string, Response> };
}

// ============================================================
// isStageApiUrl
// ============================================================
describe("isStageApiUrl", () => {
  it("returns true for /api/stage/bundle", () => {
    expect(sw.isStageApiUrl("http://localhost/api/stage/bundle")).toBe(true);
  });

  it("returns true for /api/stage/progress", () => {
    expect(sw.isStageApiUrl("http://localhost/api/stage/progress")).toBe(true);
  });

  it("returns false for other API routes", () => {
    expect(sw.isStageApiUrl("http://localhost/api/songs")).toBe(false);
    expect(sw.isStageApiUrl("http://localhost/api/stage/other")).toBe(false);
  });
});

// ============================================================
// isStageAsset
// ============================================================
describe("isStageAsset", () => {
  it("returns true for /stage/* paths", () => {
    expect(sw.isStageAsset("http://localhost/stage")).toBe(true);
    expect(sw.isStageAsset("http://localhost/stage/some-song-id")).toBe(true);
  });

  it("returns true for JS files", () => {
    expect(sw.isStageAsset("http://localhost/_next/static/chunks/main.js")).toBe(true);
  });

  it("returns true for CSS files", () => {
    expect(sw.isStageAsset("http://localhost/_next/static/css/app.css")).toBe(true);
  });

  it("returns true for font files", () => {
    expect(sw.isStageAsset("http://localhost/fonts/inter.woff2")).toBe(true);
    expect(sw.isStageAsset("http://localhost/fonts/inter.ttf")).toBe(true);
  });

  it("returns false for non-stage routes", () => {
    expect(sw.isStageAsset("http://localhost/api/songs")).toBe(false);
    expect(sw.isStageAsset("http://localhost/dashboard")).toBe(false);
  });
});

// ============================================================
// cacheFirstWithRevalidate — Cache-First-Verhalten (Anforderung 3.1)
// ============================================================
describe("cacheFirstWithRevalidate — Cache-First", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns cached response immediately when cache hit exists (Req 3.1)", async () => {
    const cachedResponse = makeResponse('{"cached":true}');
    const cache = makeCacheMock(
      new Map([["http://localhost/api/stage/bundle", cachedResponse]]),
    );

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(makeResponse('{"fresh":true}'));

    const request = new Request("http://localhost/api/stage/bundle");
    const result = await sw.cacheFirstWithRevalidate(request, cache);

    // Muss die gecachte Antwort zurückgeben
    expect(result).toBe(cachedResponse);
    // fetch darf aufgerufen werden (Stale-While-Revalidate), aber Ergebnis wird nicht abgewartet
    fetchSpy.mockRestore();
  });

  it("fetches from network and caches when no cache entry exists", async () => {
    const cache = makeCacheMock();
    const networkResponse = makeResponse('{"fresh":true}');
    vi.spyOn(globalThis, "fetch").mockResolvedValue(networkResponse);

    const request = new Request("http://localhost/api/stage/bundle");
    const result = await sw.cacheFirstWithRevalidate(request, cache);

    expect(result).toBe(networkResponse);
    expect(cache.put).toHaveBeenCalled();
  });

  it("throws when no cache and network fails (Req 3.2 — no fallback without cache)", async () => {
    const cache = makeCacheMock();
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

    const request = new Request("http://localhost/api/stage/bundle");
    await expect(sw.cacheFirstWithRevalidate(request, cache)).rejects.toThrow("Network error");
  });
});

// ============================================================
// cacheFirstWithRevalidate — Offline-Fallback (Anforderung 3.2)
// ============================================================
describe("cacheFirstWithRevalidate — Offline-Fallback (Req 3.2)", () => {
  it("returns cached data when network fails and cache exists", async () => {
    const cachedResponse = makeResponse('{"offline":true}');
    const cache = makeCacheMock(
      new Map([["http://localhost/api/stage/bundle", cachedResponse]]),
    );

    // Netzwerk schlägt fehl
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));

    const request = new Request("http://localhost/api/stage/bundle");
    const result = await sw.cacheFirstWithRevalidate(request, cache);

    // Gecachte Antwort wird zurückgegeben (Cache-First — Netzwerkfehler beim Revalidieren ignoriert)
    expect(result).toBe(cachedResponse);
  });
});

// ============================================================
// cacheFirstWithRevalidate — Stale-While-Revalidate (Anforderung 3.3)
// ============================================================
describe("cacheFirstWithRevalidate — Stale-While-Revalidate (Req 3.3)", () => {
  it("updates cache in background when online and cache hit exists", async () => {
    const cachedResponse = makeResponse('{"stale":true}');
    const freshResponse = makeResponse('{"fresh":true}');
    const cache = makeCacheMock(
      new Map([["http://localhost/api/stage/bundle", cachedResponse]]),
    );

    // Netzwerk ist verfügbar
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(freshResponse);

    const request = new Request("http://localhost/api/stage/bundle");
    const result = await sw.cacheFirstWithRevalidate(request, cache);

    // Sofort gecachte Antwort zurückgeben
    expect(result).toBe(cachedResponse);

    // Kurz warten damit Hintergrund-Revalidierung abläuft
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Cache soll mit frischer Antwort aktualisiert worden sein
    expect(cache.put).toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("does not update cache when network response is not ok", async () => {
    const cachedResponse = makeResponse('{"stale":true}');
    const cache = makeCacheMock(
      new Map([["http://localhost/api/stage/bundle", cachedResponse]]),
    );

    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("error", { status: 500 }));

    const request = new Request("http://localhost/api/stage/bundle");
    await sw.cacheFirstWithRevalidate(request, cache);

    await new Promise((resolve) => setTimeout(resolve, 10));

    // Cache soll NICHT mit Fehler-Response aktualisiert werden
    expect(cache.put).not.toHaveBeenCalled();
  });
});

// ============================================================
// networkFirst — Network-First für andere Routen
// ============================================================
describe("networkFirst", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns network response and caches it when network succeeds", async () => {
    const cache = makeCacheMock();
    const networkResponse = makeResponse('{"data":true}');
    vi.spyOn(globalThis, "fetch").mockResolvedValue(networkResponse);

    const request = new Request("http://localhost/dashboard");
    const result = await sw.networkFirst(request, cache);

    expect(result).toBe(networkResponse);
    expect(cache.put).toHaveBeenCalled();
  });

  it("falls back to cache when network fails (Req 3.2)", async () => {
    const cachedResponse = makeResponse('{"cached":true}');
    const cache = makeCacheMock(
      new Map([["http://localhost/dashboard", cachedResponse]]),
    );
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));

    const request = new Request("http://localhost/dashboard");
    const result = await sw.networkFirst(request, cache);

    expect(result).toBe(cachedResponse);
  });

  it("throws when network fails and no cache exists", async () => {
    const cache = makeCacheMock();
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));

    const request = new Request("http://localhost/dashboard");
    await expect(sw.networkFirst(request, cache)).rejects.toThrow("offline");
  });
});

// ============================================================
// Konstanten
// ============================================================
describe("SW constants", () => {
  it("STAGE_CACHE is lyco-stage-v1", () => {
    expect(sw.STAGE_CACHE).toBe("lyco-stage-v1");
  });

  it("STAGE_API_URLS contains bundle and progress endpoints", () => {
    expect(sw.STAGE_API_URLS).toContain("/api/stage/bundle");
    expect(sw.STAGE_API_URLS).toContain("/api/stage/progress");
  });
});
