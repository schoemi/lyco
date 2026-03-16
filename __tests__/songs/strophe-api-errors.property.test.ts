/**
 * Property 3: Strophe API auth and error responses
 *
 * Verify that the Strophe API route handlers return correct HTTP status codes:
 * - 401 when no session (unauthenticated)
 * - 403 when userId doesn't match song owner
 * - 404 when song or strophe doesn't exist
 * - 400 when input validation fails (e.g., empty name)
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

// --- Mock strophe service ---
const { mockCreateStrophe, mockUpdateStrophe, mockDeleteStrophe, mockReorderStrophen } =
  vi.hoisted(() => ({
    mockCreateStrophe: vi.fn(),
    mockUpdateStrophe: vi.fn(),
    mockDeleteStrophe: vi.fn(),
    mockReorderStrophen: vi.fn(),
  }));

vi.mock("@/lib/services/strophe-service", () => ({
  createStrophe: mockCreateStrophe,
  updateStrophe: mockUpdateStrophe,
  deleteStrophe: mockDeleteStrophe,
  reorderStrophen: mockReorderStrophen,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

// --- Import route handlers ---
import { POST as strophenPOST } from "@/app/api/songs/[id]/strophen/route";
import {
  PUT as stropheIdPUT,
  DELETE as stropheIdDELETE,
} from "@/app/api/songs/[id]/strophen/[stropheId]/route";
import { PUT as reorderPUT } from "@/app/api/songs/[id]/strophen/reorder/route";

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
const nameArb = fc
  .stringMatching(/^[A-Za-z0-9 ]{1,20}$/)
  .filter((s) => s.trim().length > 0);

// --- Test suites ---
describe("Property 3: Strophe API auth and error responses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("401 — unauthenticated requests", () => {
    it("POST /api/songs/[id]/strophen returns 401 without session", () => {
      return fc.assert(
        fc.asyncProperty(idArb, nameArb, async (songId, name) => {
          mockAuth.mockResolvedValue(null);

          const res = await strophenPOST(
            makeRequest("POST", `/api/songs/${songId}/strophen`, { name }),
            makeParams({ id: songId })
          );

          expect(res.status).toBe(401);
          const json = await res.json();
          expect(json.error).toBe("Nicht authentifiziert");
        }),
        { numRuns: 20 }
      );
    });

    it("PUT /api/songs/[id]/strophen/[stropheId] returns 401 without session", () => {
      return fc.assert(
        fc.asyncProperty(idArb, idArb, nameArb, async (songId, stropheId, name) => {
          mockAuth.mockResolvedValue(null);

          const res = await stropheIdPUT(
            makeRequest("PUT", `/api/songs/${songId}/strophen/${stropheId}`, { name }),
            makeParams({ id: songId, stropheId })
          );

          expect(res.status).toBe(401);
          const json = await res.json();
          expect(json.error).toBe("Nicht authentifiziert");
        }),
        { numRuns: 20 }
      );
    });

    it("DELETE /api/songs/[id]/strophen/[stropheId] returns 401 without session", () => {
      return fc.assert(
        fc.asyncProperty(idArb, idArb, async (songId, stropheId) => {
          mockAuth.mockResolvedValue(null);

          const res = await stropheIdDELETE(
            makeRequest("DELETE", `/api/songs/${songId}/strophen/${stropheId}`),
            makeParams({ id: songId, stropheId })
          );

          expect(res.status).toBe(401);
          const json = await res.json();
          expect(json.error).toBe("Nicht authentifiziert");
        }),
        { numRuns: 20 }
      );
    });

    it("PUT /api/songs/[id]/strophen/reorder returns 401 without session", () => {
      return fc.assert(
        fc.asyncProperty(idArb, async (songId) => {
          mockAuth.mockResolvedValue(null);

          const res = await reorderPUT(
            makeRequest("PUT", `/api/songs/${songId}/strophen/reorder`, {
              order: [{ id: "s1", orderIndex: 0 }],
            }),
            makeParams({ id: songId })
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
    it("POST /api/songs/[id]/strophen returns 403 when service throws Zugriff verweigert", () => {
      return fc.assert(
        fc.asyncProperty(idArb, userIdArb, nameArb, async (songId, userId, name) => {
          mockAuth.mockResolvedValue({ user: { id: userId } });
          mockCreateStrophe.mockRejectedValue(new Error("Zugriff verweigert"));

          const res = await strophenPOST(
            makeRequest("POST", `/api/songs/${songId}/strophen`, { name }),
            makeParams({ id: songId })
          );

          expect(res.status).toBe(403);
          const json = await res.json();
          expect(json.error).toBe("Zugriff verweigert");
        }),
        { numRuns: 20 }
      );
    });

    it("PUT /api/songs/[id]/strophen/[stropheId] returns 403 when service throws Zugriff verweigert", () => {
      return fc.assert(
        fc.asyncProperty(
          idArb,
          idArb,
          userIdArb,
          nameArb,
          async (songId, stropheId, userId, name) => {
            mockAuth.mockResolvedValue({ user: { id: userId } });
            mockUpdateStrophe.mockRejectedValue(new Error("Zugriff verweigert"));

            const res = await stropheIdPUT(
              makeRequest("PUT", `/api/songs/${songId}/strophen/${stropheId}`, { name }),
              makeParams({ id: songId, stropheId })
            );

            expect(res.status).toBe(403);
            const json = await res.json();
            expect(json.error).toBe("Zugriff verweigert");
          }
        ),
        { numRuns: 20 }
      );
    });

    it("DELETE /api/songs/[id]/strophen/[stropheId] returns 403 when service throws Zugriff verweigert", () => {
      return fc.assert(
        fc.asyncProperty(idArb, idArb, userIdArb, async (songId, stropheId, userId) => {
          mockAuth.mockResolvedValue({ user: { id: userId } });
          mockDeleteStrophe.mockRejectedValue(new Error("Zugriff verweigert"));

          const res = await stropheIdDELETE(
            makeRequest("DELETE", `/api/songs/${songId}/strophen/${stropheId}`),
            makeParams({ id: songId, stropheId })
          );

          expect(res.status).toBe(403);
          const json = await res.json();
          expect(json.error).toBe("Zugriff verweigert");
        }),
        { numRuns: 20 }
      );
    });

    it("PUT /api/songs/[id]/strophen/reorder returns 403 when service throws Zugriff verweigert", () => {
      return fc.assert(
        fc.asyncProperty(idArb, userIdArb, async (songId, userId) => {
          mockAuth.mockResolvedValue({ user: { id: userId } });
          mockReorderStrophen.mockRejectedValue(new Error("Zugriff verweigert"));

          const res = await reorderPUT(
            makeRequest("PUT", `/api/songs/${songId}/strophen/reorder`, {
              order: [{ id: "s1", orderIndex: 0 }],
            }),
            makeParams({ id: songId })
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
    it("POST /api/songs/[id]/strophen returns 404 when song not found", () => {
      return fc.assert(
        fc.asyncProperty(idArb, userIdArb, nameArb, async (songId, userId, name) => {
          mockAuth.mockResolvedValue({ user: { id: userId } });
          mockCreateStrophe.mockRejectedValue(new Error("Song nicht gefunden"));

          const res = await strophenPOST(
            makeRequest("POST", `/api/songs/${songId}/strophen`, { name }),
            makeParams({ id: songId })
          );

          expect(res.status).toBe(404);
          const json = await res.json();
          expect(json.error).toBe("Song nicht gefunden");
        }),
        { numRuns: 20 }
      );
    });

    it("PUT /api/songs/[id]/strophen/[stropheId] returns 404 when song not found", () => {
      return fc.assert(
        fc.asyncProperty(
          idArb,
          idArb,
          userIdArb,
          nameArb,
          async (songId, stropheId, userId, name) => {
            mockAuth.mockResolvedValue({ user: { id: userId } });
            mockUpdateStrophe.mockRejectedValue(new Error("Song nicht gefunden"));

            const res = await stropheIdPUT(
              makeRequest("PUT", `/api/songs/${songId}/strophen/${stropheId}`, { name }),
              makeParams({ id: songId, stropheId })
            );

            expect(res.status).toBe(404);
            const json = await res.json();
            expect(json.error).toBe("Song nicht gefunden");
          }
        ),
        { numRuns: 20 }
      );
    });

    it("PUT /api/songs/[id]/strophen/[stropheId] returns 404 when strophe not found", () => {
      return fc.assert(
        fc.asyncProperty(
          idArb,
          idArb,
          userIdArb,
          nameArb,
          async (songId, stropheId, userId, name) => {
            mockAuth.mockResolvedValue({ user: { id: userId } });
            mockUpdateStrophe.mockRejectedValue(new Error("Strophe nicht gefunden"));

            const res = await stropheIdPUT(
              makeRequest("PUT", `/api/songs/${songId}/strophen/${stropheId}`, { name }),
              makeParams({ id: songId, stropheId })
            );

            expect(res.status).toBe(404);
            const json = await res.json();
            expect(json.error).toBe("Strophe nicht gefunden");
          }
        ),
        { numRuns: 20 }
      );
    });

    it("DELETE /api/songs/[id]/strophen/[stropheId] returns 404 when song not found", () => {
      return fc.assert(
        fc.asyncProperty(idArb, idArb, userIdArb, async (songId, stropheId, userId) => {
          mockAuth.mockResolvedValue({ user: { id: userId } });
          mockDeleteStrophe.mockRejectedValue(new Error("Song nicht gefunden"));

          const res = await stropheIdDELETE(
            makeRequest("DELETE", `/api/songs/${songId}/strophen/${stropheId}`),
            makeParams({ id: songId, stropheId })
          );

          expect(res.status).toBe(404);
          const json = await res.json();
          expect(json.error).toBe("Song nicht gefunden");
        }),
        { numRuns: 20 }
      );
    });

    it("DELETE /api/songs/[id]/strophen/[stropheId] returns 404 when strophe not found", () => {
      return fc.assert(
        fc.asyncProperty(idArb, idArb, userIdArb, async (songId, stropheId, userId) => {
          mockAuth.mockResolvedValue({ user: { id: userId } });
          mockDeleteStrophe.mockRejectedValue(new Error("Strophe nicht gefunden"));

          const res = await stropheIdDELETE(
            makeRequest("DELETE", `/api/songs/${songId}/strophen/${stropheId}`),
            makeParams({ id: songId, stropheId })
          );

          expect(res.status).toBe(404);
          const json = await res.json();
          expect(json.error).toBe("Strophe nicht gefunden");
        }),
        { numRuns: 20 }
      );
    });

    it("PUT /api/songs/[id]/strophen/reorder returns 404 when song not found", () => {
      return fc.assert(
        fc.asyncProperty(idArb, userIdArb, async (songId, userId) => {
          mockAuth.mockResolvedValue({ user: { id: userId } });
          mockReorderStrophen.mockRejectedValue(new Error("Song nicht gefunden"));

          const res = await reorderPUT(
            makeRequest("PUT", `/api/songs/${songId}/strophen/reorder`, {
              order: [{ id: "s1", orderIndex: 0 }],
            }),
            makeParams({ id: songId })
          );

          expect(res.status).toBe(404);
          const json = await res.json();
          expect(json.error).toBe("Song nicht gefunden");
        }),
        { numRuns: 20 }
      );
    });

    it("PUT /api/songs/[id]/strophen/reorder returns 404 when strophe not found", () => {
      return fc.assert(
        fc.asyncProperty(idArb, userIdArb, async (songId, userId) => {
          mockAuth.mockResolvedValue({ user: { id: userId } });
          mockReorderStrophen.mockRejectedValue(new Error("Strophe nicht gefunden"));

          const res = await reorderPUT(
            makeRequest("PUT", `/api/songs/${songId}/strophen/reorder`, {
              order: [{ id: "s1", orderIndex: 0 }],
            }),
            makeParams({ id: songId })
          );

          expect(res.status).toBe(404);
          const json = await res.json();
          expect(json.error).toBe("Strophe nicht gefunden");
        }),
        { numRuns: 20 }
      );
    });
  });

  describe("400 — invalid input", () => {
    it("POST /api/songs/[id]/strophen returns 400 when name is empty", () => {
      return fc.assert(
        fc.asyncProperty(idArb, userIdArb, async (songId, userId) => {
          mockAuth.mockResolvedValue({ user: { id: userId } });
          mockCreateStrophe.mockRejectedValue(new Error("Name ist erforderlich"));

          const res = await strophenPOST(
            makeRequest("POST", `/api/songs/${songId}/strophen`, { name: "" }),
            makeParams({ id: songId })
          );

          expect(res.status).toBe(400);
          const json = await res.json();
          expect(json.error).toBe("Name ist erforderlich");
          expect(json.field).toBe("name");
        }),
        { numRuns: 20 }
      );
    });

    it("PUT /api/songs/[id]/strophen/[stropheId] returns 400 when name is empty", () => {
      return fc.assert(
        fc.asyncProperty(idArb, idArb, userIdArb, async (songId, stropheId, userId) => {
          mockAuth.mockResolvedValue({ user: { id: userId } });
          mockUpdateStrophe.mockRejectedValue(new Error("Name ist erforderlich"));

          const res = await stropheIdPUT(
            makeRequest("PUT", `/api/songs/${songId}/strophen/${stropheId}`, { name: "" }),
            makeParams({ id: songId, stropheId })
          );

          expect(res.status).toBe(400);
          const json = await res.json();
          expect(json.error).toBe("Name ist erforderlich");
          expect(json.field).toBe("name");
        }),
        { numRuns: 20 }
      );
    });

    it("PUT /api/songs/[id]/strophen/reorder returns 400 when order is empty", () => {
      return fc.assert(
        fc.asyncProperty(idArb, userIdArb, async (songId, userId) => {
          mockAuth.mockResolvedValue({ user: { id: userId } });
          mockReorderStrophen.mockRejectedValue(
            new Error("Reihenfolge ist erforderlich")
          );

          const res = await reorderPUT(
            makeRequest("PUT", `/api/songs/${songId}/strophen/reorder`, { order: [] }),
            makeParams({ id: songId })
          );

          expect(res.status).toBe(400);
          const json = await res.json();
          expect(json.error).toBe("Reihenfolge ist erforderlich");
        }),
        { numRuns: 20 }
      );
    });

    it("PUT /api/songs/[id]/strophen/reorder returns 400 when order item is invalid", () => {
      return fc.assert(
        fc.asyncProperty(idArb, userIdArb, async (songId, userId) => {
          mockAuth.mockResolvedValue({ user: { id: userId } });
          mockReorderStrophen.mockRejectedValue(
            new Error("Ungültiges Reihenfolge-Element")
          );

          const res = await reorderPUT(
            makeRequest("PUT", `/api/songs/${songId}/strophen/reorder`, {
              order: [{ id: null, orderIndex: "bad" }],
            }),
            makeParams({ id: songId })
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
