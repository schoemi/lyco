/**
 * Property 6: Zeile API auth and error responses
 *
 * Verify that the Zeile API route handlers return correct HTTP status codes:
 * - 401 when no session (unauthenticated)
 * - 403 when userId doesn't match song owner
 * - 404 when song, strophe, or zeile doesn't exist
 * - 400 when input validation fails (e.g., empty text, empty order)
 *
 * **Validates: Requirements 12.9, 12.10, 12.11**
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import { NextRequest } from "next/server";

// --- Mock auth ---
const { mockAuth } = vi.hoisted(() => {
  const _mockAuth = vi.fn();
  return { mockAuth: _mockAuth };
});

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

// --- Mock zeile service ---
const { mockCreateZeile, mockUpdateZeile, mockDeleteZeile, mockReorderZeilen } =
  vi.hoisted(() => ({
    mockCreateZeile: vi.fn(),
    mockUpdateZeile: vi.fn(),
    mockDeleteZeile: vi.fn(),
    mockReorderZeilen: vi.fn(),
  }));

vi.mock("@/lib/services/zeile-service", () => ({
  createZeile: mockCreateZeile,
  updateZeile: mockUpdateZeile,
  deleteZeile: mockDeleteZeile,
  reorderZeilen: mockReorderZeilen,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

// --- Import route handlers ---
import { POST as zeilenPOST } from "@/app/api/songs/[id]/strophen/[stropheId]/zeilen/route";
import {
  PUT as zeileIdPUT,
  DELETE as zeileIdDELETE,
} from "@/app/api/songs/[id]/strophen/[stropheId]/zeilen/[zeileId]/route";
import { PUT as reorderPUT } from "@/app/api/songs/[id]/strophen/[stropheId]/zeilen/reorder/route";

// --- Helpers ---
function makeRequest(method: string, url: string, body?: unknown): NextRequest {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

function makeParams<T extends Record<string, string>>(obj: T): {
  params: Promise<T>;
} {
  return { params: Promise.resolve(obj) };
}

// --- Arbitraries ---
const idArb = fc.stringMatching(/^[a-z0-9]{4,12}$/);
const userIdArb = fc.stringMatching(/^user-[a-z0-9]{3,8}$/);
const textArb = fc
  .stringMatching(/^[A-Za-z0-9 ]{1,30}$/)
  .filter((s) => s.trim().length > 0);

// --- Test suites ---
describe("Property 6: Zeile API auth and error responses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("401 — unauthenticated requests", () => {
    it("POST /api/songs/[id]/strophen/[stropheId]/zeilen returns 401 without session", () => {
      return fc.assert(
        fc.asyncProperty(idArb, idArb, textArb, async (songId, stropheId, text) => {
          mockAuth.mockResolvedValue(null);

          const res = await zeilenPOST(
            makeRequest("POST", `/api/songs/${songId}/strophen/${stropheId}/zeilen`, { text }),
            makeParams({ id: songId, stropheId })
          );

          expect(res.status).toBe(401);
          const json = await res.json();
          expect(json.error).toBe("Nicht authentifiziert");
        }),
        { numRuns: 20 }
      );
    });

    it("PUT /api/songs/[id]/strophen/[stropheId]/zeilen/[zeileId] returns 401 without session", () => {
      return fc.assert(
        fc.asyncProperty(idArb, idArb, idArb, textArb, async (songId, stropheId, zeileId, text) => {
          mockAuth.mockResolvedValue(null);

          const res = await zeileIdPUT(
            makeRequest("PUT", `/api/songs/${songId}/strophen/${stropheId}/zeilen/${zeileId}`, { text }),
            makeParams({ id: songId, stropheId, zeileId })
          );

          expect(res.status).toBe(401);
          const json = await res.json();
          expect(json.error).toBe("Nicht authentifiziert");
        }),
        { numRuns: 20 }
      );
    });

    it("DELETE /api/songs/[id]/strophen/[stropheId]/zeilen/[zeileId] returns 401 without session", () => {
      return fc.assert(
        fc.asyncProperty(idArb, idArb, idArb, async (songId, stropheId, zeileId) => {
          mockAuth.mockResolvedValue(null);

          const res = await zeileIdDELETE(
            makeRequest("DELETE", `/api/songs/${songId}/strophen/${stropheId}/zeilen/${zeileId}`),
            makeParams({ id: songId, stropheId, zeileId })
          );

          expect(res.status).toBe(401);
          const json = await res.json();
          expect(json.error).toBe("Nicht authentifiziert");
        }),
        { numRuns: 20 }
      );
    });

    it("PUT /api/songs/[id]/strophen/[stropheId]/zeilen/reorder returns 401 without session", () => {
      return fc.assert(
        fc.asyncProperty(idArb, idArb, async (songId, stropheId) => {
          mockAuth.mockResolvedValue(null);

          const res = await reorderPUT(
            makeRequest("PUT", `/api/songs/${songId}/strophen/${stropheId}/zeilen/reorder`, {
              order: [{ id: "z1", orderIndex: 0 }],
            }),
            makeParams({ id: songId, stropheId })
          );

          expect(res.status).toBe(401);
          const json = await res.json();
          expect(json.error).toBe("Nicht authentifiziert");
        }),
        { numRuns: 20 }
      );
    });
  });

  describe("403 — wrong owner", () => {
    it("POST /api/songs/[id]/strophen/[stropheId]/zeilen returns 403 when service throws Zugriff verweigert", () => {
      return fc.assert(
        fc.asyncProperty(idArb, idArb, userIdArb, textArb, async (songId, stropheId, userId, text) => {
          mockAuth.mockResolvedValue({ user: { id: userId } });
          mockCreateZeile.mockRejectedValue(new Error("Zugriff verweigert"));

          const res = await zeilenPOST(
            makeRequest("POST", `/api/songs/${songId}/strophen/${stropheId}/zeilen`, { text }),
            makeParams({ id: songId, stropheId })
          );

          expect(res.status).toBe(403);
          const json = await res.json();
          expect(json.error).toBe("Zugriff verweigert");
        }),
        { numRuns: 20 }
      );
    });

    it("PUT /api/songs/[id]/strophen/[stropheId]/zeilen/[zeileId] returns 403 when service throws Zugriff verweigert", () => {
      return fc.assert(
        fc.asyncProperty(
          idArb, idArb, idArb, userIdArb, textArb,
          async (songId, stropheId, zeileId, userId, text) => {
            mockAuth.mockResolvedValue({ user: { id: userId } });
            mockUpdateZeile.mockRejectedValue(new Error("Zugriff verweigert"));

            const res = await zeileIdPUT(
              makeRequest("PUT", `/api/songs/${songId}/strophen/${stropheId}/zeilen/${zeileId}`, { text }),
              makeParams({ id: songId, stropheId, zeileId })
            );

            expect(res.status).toBe(403);
            const json = await res.json();
            expect(json.error).toBe("Zugriff verweigert");
          }
        ),
        { numRuns: 20 }
      );
    });

    it("DELETE /api/songs/[id]/strophen/[stropheId]/zeilen/[zeileId] returns 403 when service throws Zugriff verweigert", () => {
      return fc.assert(
        fc.asyncProperty(idArb, idArb, idArb, userIdArb, async (songId, stropheId, zeileId, userId) => {
          mockAuth.mockResolvedValue({ user: { id: userId } });
          mockDeleteZeile.mockRejectedValue(new Error("Zugriff verweigert"));

          const res = await zeileIdDELETE(
            makeRequest("DELETE", `/api/songs/${songId}/strophen/${stropheId}/zeilen/${zeileId}`),
            makeParams({ id: songId, stropheId, zeileId })
          );

          expect(res.status).toBe(403);
          const json = await res.json();
          expect(json.error).toBe("Zugriff verweigert");
        }),
        { numRuns: 20 }
      );
    });

    it("PUT /api/songs/[id]/strophen/[stropheId]/zeilen/reorder returns 403 when service throws Zugriff verweigert", () => {
      return fc.assert(
        fc.asyncProperty(idArb, idArb, userIdArb, async (songId, stropheId, userId) => {
          mockAuth.mockResolvedValue({ user: { id: userId } });
          mockReorderZeilen.mockRejectedValue(new Error("Zugriff verweigert"));

          const res = await reorderPUT(
            makeRequest("PUT", `/api/songs/${songId}/strophen/${stropheId}/zeilen/reorder`, {
              order: [{ id: "z1", orderIndex: 0 }],
            }),
            makeParams({ id: songId, stropheId })
          );

          expect(res.status).toBe(403);
          const json = await res.json();
          expect(json.error).toBe("Zugriff verweigert");
        }),
        { numRuns: 20 }
      );
    });
  });

  describe("404 — missing resources", () => {
    it("POST /api/songs/[id]/strophen/[stropheId]/zeilen returns 404 when song not found", () => {
      return fc.assert(
        fc.asyncProperty(idArb, idArb, userIdArb, textArb, async (songId, stropheId, userId, text) => {
          mockAuth.mockResolvedValue({ user: { id: userId } });
          mockCreateZeile.mockRejectedValue(new Error("Song nicht gefunden"));

          const res = await zeilenPOST(
            makeRequest("POST", `/api/songs/${songId}/strophen/${stropheId}/zeilen`, { text }),
            makeParams({ id: songId, stropheId })
          );

          expect(res.status).toBe(404);
          const json = await res.json();
          expect(json.error).toBe("Song nicht gefunden");
        }),
        { numRuns: 20 }
      );
    });

    it("POST /api/songs/[id]/strophen/[stropheId]/zeilen returns 404 when strophe not found", () => {
      return fc.assert(
        fc.asyncProperty(idArb, idArb, userIdArb, textArb, async (songId, stropheId, userId, text) => {
          mockAuth.mockResolvedValue({ user: { id: userId } });
          mockCreateZeile.mockRejectedValue(new Error("Strophe nicht gefunden"));

          const res = await zeilenPOST(
            makeRequest("POST", `/api/songs/${songId}/strophen/${stropheId}/zeilen`, { text }),
            makeParams({ id: songId, stropheId })
          );

          expect(res.status).toBe(404);
          const json = await res.json();
          expect(json.error).toBe("Strophe nicht gefunden");
        }),
        { numRuns: 20 }
      );
    });

    it("PUT /api/songs/[id]/strophen/[stropheId]/zeilen/[zeileId] returns 404 when song not found", () => {
      return fc.assert(
        fc.asyncProperty(
          idArb, idArb, idArb, userIdArb, textArb,
          async (songId, stropheId, zeileId, userId, text) => {
            mockAuth.mockResolvedValue({ user: { id: userId } });
            mockUpdateZeile.mockRejectedValue(new Error("Song nicht gefunden"));

            const res = await zeileIdPUT(
              makeRequest("PUT", `/api/songs/${songId}/strophen/${stropheId}/zeilen/${zeileId}`, { text }),
              makeParams({ id: songId, stropheId, zeileId })
            );

            expect(res.status).toBe(404);
            const json = await res.json();
            expect(json.error).toBe("Song nicht gefunden");
          }
        ),
        { numRuns: 20 }
      );
    });

    it("PUT /api/songs/[id]/strophen/[stropheId]/zeilen/[zeileId] returns 404 when strophe not found", () => {
      return fc.assert(
        fc.asyncProperty(
          idArb, idArb, idArb, userIdArb, textArb,
          async (songId, stropheId, zeileId, userId, text) => {
            mockAuth.mockResolvedValue({ user: { id: userId } });
            mockUpdateZeile.mockRejectedValue(new Error("Strophe nicht gefunden"));

            const res = await zeileIdPUT(
              makeRequest("PUT", `/api/songs/${songId}/strophen/${stropheId}/zeilen/${zeileId}`, { text }),
              makeParams({ id: songId, stropheId, zeileId })
            );

            expect(res.status).toBe(404);
            const json = await res.json();
            expect(json.error).toBe("Strophe nicht gefunden");
          }
        ),
        { numRuns: 20 }
      );
    });

    it("PUT /api/songs/[id]/strophen/[stropheId]/zeilen/[zeileId] returns 404 when zeile not found", () => {
      return fc.assert(
        fc.asyncProperty(
          idArb, idArb, idArb, userIdArb, textArb,
          async (songId, stropheId, zeileId, userId, text) => {
            mockAuth.mockResolvedValue({ user: { id: userId } });
            mockUpdateZeile.mockRejectedValue(new Error("Zeile nicht gefunden"));

            const res = await zeileIdPUT(
              makeRequest("PUT", `/api/songs/${songId}/strophen/${stropheId}/zeilen/${zeileId}`, { text }),
              makeParams({ id: songId, stropheId, zeileId })
            );

            expect(res.status).toBe(404);
            const json = await res.json();
            expect(json.error).toBe("Zeile nicht gefunden");
          }
        ),
        { numRuns: 20 }
      );
    });

    it("DELETE /api/songs/[id]/strophen/[stropheId]/zeilen/[zeileId] returns 404 when song not found", () => {
      return fc.assert(
        fc.asyncProperty(idArb, idArb, idArb, userIdArb, async (songId, stropheId, zeileId, userId) => {
          mockAuth.mockResolvedValue({ user: { id: userId } });
          mockDeleteZeile.mockRejectedValue(new Error("Song nicht gefunden"));

          const res = await zeileIdDELETE(
            makeRequest("DELETE", `/api/songs/${songId}/strophen/${stropheId}/zeilen/${zeileId}`),
            makeParams({ id: songId, stropheId, zeileId })
          );

          expect(res.status).toBe(404);
          const json = await res.json();
          expect(json.error).toBe("Song nicht gefunden");
        }),
        { numRuns: 20 }
      );
    });

    it("DELETE /api/songs/[id]/strophen/[stropheId]/zeilen/[zeileId] returns 404 when strophe not found", () => {
      return fc.assert(
        fc.asyncProperty(idArb, idArb, idArb, userIdArb, async (songId, stropheId, zeileId, userId) => {
          mockAuth.mockResolvedValue({ user: { id: userId } });
          mockDeleteZeile.mockRejectedValue(new Error("Strophe nicht gefunden"));

          const res = await zeileIdDELETE(
            makeRequest("DELETE", `/api/songs/${songId}/strophen/${stropheId}/zeilen/${zeileId}`),
            makeParams({ id: songId, stropheId, zeileId })
          );

          expect(res.status).toBe(404);
          const json = await res.json();
          expect(json.error).toBe("Strophe nicht gefunden");
        }),
        { numRuns: 20 }
      );
    });

    it("DELETE /api/songs/[id]/strophen/[stropheId]/zeilen/[zeileId] returns 404 when zeile not found", () => {
      return fc.assert(
        fc.asyncProperty(idArb, idArb, idArb, userIdArb, async (songId, stropheId, zeileId, userId) => {
          mockAuth.mockResolvedValue({ user: { id: userId } });
          mockDeleteZeile.mockRejectedValue(new Error("Zeile nicht gefunden"));

          const res = await zeileIdDELETE(
            makeRequest("DELETE", `/api/songs/${songId}/strophen/${stropheId}/zeilen/${zeileId}`),
            makeParams({ id: songId, stropheId, zeileId })
          );

          expect(res.status).toBe(404);
          const json = await res.json();
          expect(json.error).toBe("Zeile nicht gefunden");
        }),
        { numRuns: 20 }
      );
    });

    it("PUT /api/songs/[id]/strophen/[stropheId]/zeilen/reorder returns 404 when song not found", () => {
      return fc.assert(
        fc.asyncProperty(idArb, idArb, userIdArb, async (songId, stropheId, userId) => {
          mockAuth.mockResolvedValue({ user: { id: userId } });
          mockReorderZeilen.mockRejectedValue(new Error("Song nicht gefunden"));

          const res = await reorderPUT(
            makeRequest("PUT", `/api/songs/${songId}/strophen/${stropheId}/zeilen/reorder`, {
              order: [{ id: "z1", orderIndex: 0 }],
            }),
            makeParams({ id: songId, stropheId })
          );

          expect(res.status).toBe(404);
          const json = await res.json();
          expect(json.error).toBe("Song nicht gefunden");
        }),
        { numRuns: 20 }
      );
    });

    it("PUT /api/songs/[id]/strophen/[stropheId]/zeilen/reorder returns 404 when strophe not found", () => {
      return fc.assert(
        fc.asyncProperty(idArb, idArb, userIdArb, async (songId, stropheId, userId) => {
          mockAuth.mockResolvedValue({ user: { id: userId } });
          mockReorderZeilen.mockRejectedValue(new Error("Strophe nicht gefunden"));

          const res = await reorderPUT(
            makeRequest("PUT", `/api/songs/${songId}/strophen/${stropheId}/zeilen/reorder`, {
              order: [{ id: "z1", orderIndex: 0 }],
            }),
            makeParams({ id: songId, stropheId })
          );

          expect(res.status).toBe(404);
          const json = await res.json();
          expect(json.error).toBe("Strophe nicht gefunden");
        }),
        { numRuns: 20 }
      );
    });

    it("PUT /api/songs/[id]/strophen/[stropheId]/zeilen/reorder returns 404 when zeile not found", () => {
      return fc.assert(
        fc.asyncProperty(idArb, idArb, userIdArb, async (songId, stropheId, userId) => {
          mockAuth.mockResolvedValue({ user: { id: userId } });
          mockReorderZeilen.mockRejectedValue(new Error("Zeile nicht gefunden"));

          const res = await reorderPUT(
            makeRequest("PUT", `/api/songs/${songId}/strophen/${stropheId}/zeilen/reorder`, {
              order: [{ id: "z1", orderIndex: 0 }],
            }),
            makeParams({ id: songId, stropheId })
          );

          expect(res.status).toBe(404);
          const json = await res.json();
          expect(json.error).toBe("Zeile nicht gefunden");
        }),
        { numRuns: 20 }
      );
    });
  });

  describe("400 — invalid input", () => {
    it("POST /api/songs/[id]/strophen/[stropheId]/zeilen returns 400 when text is empty", () => {
      return fc.assert(
        fc.asyncProperty(idArb, idArb, userIdArb, async (songId, stropheId, userId) => {
          mockAuth.mockResolvedValue({ user: { id: userId } });
          mockCreateZeile.mockRejectedValue(new Error("Text ist erforderlich"));

          const res = await zeilenPOST(
            makeRequest("POST", `/api/songs/${songId}/strophen/${stropheId}/zeilen`, { text: "" }),
            makeParams({ id: songId, stropheId })
          );

          expect(res.status).toBe(400);
          const json = await res.json();
          expect(json.error).toBe("Text ist erforderlich");
          expect(json.field).toBe("text");
        }),
        { numRuns: 20 }
      );
    });

    it("PUT /api/songs/[id]/strophen/[stropheId]/zeilen/[zeileId] returns 400 when text is empty", () => {
      return fc.assert(
        fc.asyncProperty(idArb, idArb, idArb, userIdArb, async (songId, stropheId, zeileId, userId) => {
          mockAuth.mockResolvedValue({ user: { id: userId } });
          mockUpdateZeile.mockRejectedValue(new Error("Text ist erforderlich"));

          const res = await zeileIdPUT(
            makeRequest("PUT", `/api/songs/${songId}/strophen/${stropheId}/zeilen/${zeileId}`, { text: "" }),
            makeParams({ id: songId, stropheId, zeileId })
          );

          expect(res.status).toBe(400);
          const json = await res.json();
          expect(json.error).toBe("Text ist erforderlich");
          expect(json.field).toBe("text");
        }),
        { numRuns: 20 }
      );
    });

    it("PUT /api/songs/[id]/strophen/[stropheId]/zeilen/reorder returns 400 when order is empty", () => {
      return fc.assert(
        fc.asyncProperty(idArb, idArb, userIdArb, async (songId, stropheId, userId) => {
          mockAuth.mockResolvedValue({ user: { id: userId } });
          mockReorderZeilen.mockRejectedValue(new Error("Reihenfolge ist erforderlich"));

          const res = await reorderPUT(
            makeRequest("PUT", `/api/songs/${songId}/strophen/${stropheId}/zeilen/reorder`, { order: [] }),
            makeParams({ id: songId, stropheId })
          );

          expect(res.status).toBe(400);
          const json = await res.json();
          expect(json.error).toBe("Reihenfolge ist erforderlich");
        }),
        { numRuns: 20 }
      );
    });

    it("PUT /api/songs/[id]/strophen/[stropheId]/zeilen/reorder returns 400 when order item is invalid", () => {
      return fc.assert(
        fc.asyncProperty(idArb, idArb, userIdArb, async (songId, stropheId, userId) => {
          mockAuth.mockResolvedValue({ user: { id: userId } });
          mockReorderZeilen.mockRejectedValue(new Error("Ungültiges Reihenfolge-Element"));

          const res = await reorderPUT(
            makeRequest("PUT", `/api/songs/${songId}/strophen/${stropheId}/zeilen/reorder`, {
              order: [{ id: null, orderIndex: "bad" }],
            }),
            makeParams({ id: songId, stropheId })
          );

          expect(res.status).toBe(400);
          const json = await res.json();
          expect(json.error).toBe("Ungültiges Reihenfolge-Element");
        }),
        { numRuns: 20 }
      );
    });
  });
});
