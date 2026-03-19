import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import { NextRequest } from "next/server";

/**
 * Feature: song-sets
 * Property 5: Eigentümerprüfung bei Schreiboperationen
 * Property 14: Nutzer-Isolation
 * Property 15: Nicht-authentifizierter Zugriff wird abgelehnt
 *
 * Validates: Requirements 2.2, 3.3, 5.2, 10.1, 10.2, 10.3
 */

// --- Prisma mock ---
vi.mock("@/lib/prisma", () => ({
  prisma: {
    set: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    setSong: {
      create: vi.fn(),
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
      aggregate: vi.fn(),
    },
    session: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
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

import { prisma } from "@/lib/prisma";
import {
  updateSet,
  deleteSet,
  addSongToSet,
  removeSongFromSet,
  reorderSetSongs,
  listSets,
} from "@/lib/services/set-service";

// API route imports
import { GET as setsGET, POST as setsPOST } from "@/app/api/sets/route";
import {
  GET as setDetailGET,
  PUT as setDetailPUT,
  DELETE as setDetailDELETE,
} from "@/app/api/sets/[id]/route";
import { POST as songsPOST } from "@/app/api/sets/[id]/songs/route";
import { DELETE as songDELETE } from "@/app/api/sets/[id]/songs/[songId]/route";
import { PUT as reorderPUT } from "@/app/api/sets/[id]/songs/reorder/route";

const mockPrisma = vi.mocked(prisma);

// --- Generators ---
const userIdArb = fc.stringMatching(/^user-[a-z0-9]{4,12}$/);
const setIdArb = fc.stringMatching(/^set-[a-z0-9]{4,12}$/);
const songIdArb = fc.stringMatching(/^song-[a-z0-9]{4,12}$/);
const validNameArb = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0);

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

function makeFakeSet(setId: string, ownerId: string) {
  const now = new Date();
  return {
    id: setId,
    name: "Test Set",
    description: null,
    userId: ownerId,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Property 5: Eigentümerprüfung bei Schreiboperationen
 *
 * Für jedes Set und jeden Nutzer, der nicht der Eigentümer ist, sollen alle
 * Schreiboperationen (Aktualisieren, Löschen, Songs hinzufügen, Songs entfernen,
 * Reihenfolge ändern) mit einem „Zugriff verweigert"-Fehler abgelehnt werden.
 *
 * **Validates: Requirements 2.2, 3.3, 5.2, 10.3**
 */
describe("Property 5: Eigentümerprüfung bei Schreiboperationen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updateSet throws 'Zugriff verweigert' for non-owner", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        userIdArb,
        setIdArb,
        validNameArb,
        async (requestingUserId, ownerUserId, setId, newName) => {
          const actualOwner =
            requestingUserId === ownerUserId
              ? ownerUserId + "-other"
              : ownerUserId;

          vi.clearAllMocks();
          mockPrisma.set.findUnique.mockResolvedValueOnce(
            makeFakeSet(setId, actualOwner) as any
          );

          await expect(
            updateSet(requestingUserId, setId, { name: newName })
          ).rejects.toThrow("Zugriff verweigert");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("deleteSet throws 'Zugriff verweigert' for non-owner", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        userIdArb,
        setIdArb,
        async (requestingUserId, ownerUserId, setId) => {
          const actualOwner =
            requestingUserId === ownerUserId
              ? ownerUserId + "-other"
              : ownerUserId;

          vi.clearAllMocks();
          mockPrisma.set.findUnique.mockResolvedValueOnce(
            makeFakeSet(setId, actualOwner) as any
          );

          await expect(
            deleteSet(requestingUserId, setId)
          ).rejects.toThrow("Zugriff verweigert");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("addSongToSet throws 'Zugriff verweigert' for non-owner", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        userIdArb,
        setIdArb,
        songIdArb,
        async (requestingUserId, ownerUserId, setId, songId) => {
          const actualOwner =
            requestingUserId === ownerUserId
              ? ownerUserId + "-other"
              : ownerUserId;

          vi.clearAllMocks();
          mockPrisma.set.findUnique.mockResolvedValueOnce(
            makeFakeSet(setId, actualOwner) as any
          );

          await expect(
            addSongToSet(requestingUserId, setId, songId)
          ).rejects.toThrow("Zugriff verweigert");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("removeSongFromSet throws 'Zugriff verweigert' for non-owner", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        userIdArb,
        setIdArb,
        songIdArb,
        async (requestingUserId, ownerUserId, setId, songId) => {
          const actualOwner =
            requestingUserId === ownerUserId
              ? ownerUserId + "-other"
              : ownerUserId;

          vi.clearAllMocks();
          mockPrisma.set.findUnique.mockResolvedValueOnce(
            makeFakeSet(setId, actualOwner) as any
          );

          await expect(
            removeSongFromSet(requestingUserId, setId, songId)
          ).rejects.toThrow("Zugriff verweigert");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("reorderSetSongs throws 'Zugriff verweigert' for non-owner", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        userIdArb,
        setIdArb,
        async (requestingUserId, ownerUserId, setId) => {
          const actualOwner =
            requestingUserId === ownerUserId
              ? ownerUserId + "-other"
              : ownerUserId;

          vi.clearAllMocks();
          mockPrisma.set.findUnique.mockResolvedValueOnce(
            makeFakeSet(setId, actualOwner) as any
          );

          await expect(
            reorderSetSongs(requestingUserId, setId, [
              { songId: "song-1", orderIndex: 0 },
            ])
          ).rejects.toThrow("Zugriff verweigert");
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 15: Nicht-authentifizierter Zugriff wird abgelehnt
 *
 * Für jede API-Anfrage ohne gültige Authentifizierung soll der HTTP-Statuscode
 * 401 zurückgegeben werden.
 *
 * **Validates: Requirements 10.2**
 */
describe("Property 15: Nicht-authentifizierter Zugriff wird abgelehnt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(null);
  });

  it("all set API routes return 401 when no session", async () => {
    await fc.assert(
      fc.asyncProperty(
        setIdArb,
        songIdArb,
        validNameArb,
        async (setId, songId, name) => {
          mockAuth.mockResolvedValue(null);

          const routes: Array<{ name: string; call: () => Promise<Response> }> = [
            {
              name: "GET /api/sets",
              call: () =>
                setsGET() as Promise<Response>,
            },
            {
              name: "POST /api/sets",
              call: () =>
                setsPOST(
                  makeRequest("POST", "/api/sets", { name })
                ) as Promise<Response>,
            },
            {
              name: "GET /api/sets/[id]",
              call: () =>
                setDetailGET(
                  makeRequest("GET", `/api/sets/${setId}`),
                  makeParams({ id: setId })
                ) as Promise<Response>,
            },
            {
              name: "PUT /api/sets/[id]",
              call: () =>
                setDetailPUT(
                  makeRequest("PUT", `/api/sets/${setId}`, { name }),
                  makeParams({ id: setId })
                ) as Promise<Response>,
            },
            {
              name: "DELETE /api/sets/[id]",
              call: () =>
                setDetailDELETE(
                  makeRequest("DELETE", `/api/sets/${setId}`),
                  makeParams({ id: setId })
                ) as Promise<Response>,
            },
            {
              name: "POST /api/sets/[id]/songs",
              call: () =>
                songsPOST(
                  makeRequest("POST", `/api/sets/${setId}/songs`, { songId }),
                  makeParams({ id: setId })
                ) as Promise<Response>,
            },
            {
              name: "DELETE /api/sets/[id]/songs/[songId]",
              call: () =>
                songDELETE(
                  makeRequest("DELETE", `/api/sets/${setId}/songs/${songId}`),
                  makeParams({ id: setId, songId })
                ) as Promise<Response>,
            },
            {
              name: "PUT /api/sets/[id]/songs/reorder",
              call: () =>
                reorderPUT(
                  makeRequest("PUT", `/api/sets/${setId}/songs/reorder`, {
                    items: [{ songId, orderIndex: 0 }],
                  }),
                  makeParams({ id: setId })
                ) as Promise<Response>,
            },
          ];

          for (const route of routes) {
            const response = await route.call();
            expect(
              response.status,
              `${route.name} should return 401 but got ${response.status}`
            ).toBe(401);

            const json = await response.json();
            expect(json.error).toBe("Nicht authentifiziert");
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 14: Nutzer-Isolation
 *
 * Für je zwei verschiedene Nutzer soll das Auflisten der Sets für Nutzer A
 * niemals Sets zurückgeben, die Nutzer B gehören.
 *
 * **Validates: Requirements 10.1**
 */
describe("Property 14: Nutzer-Isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listSets for user A never returns sets belonging to user B", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        userIdArb,
        fc.array(setIdArb, { minLength: 0, maxLength: 5 }),
        fc.array(setIdArb, { minLength: 0, maxLength: 5 }),
        async (userA, userB, setIdsA, setIdsB) => {
          const actualUserB =
            userA === userB ? userB + "-other" : userB;

          vi.clearAllMocks();

          const now = new Date();

          // Build sets for user A
          const setsA = setIdsA.map((id) => ({
            id,
            name: `Set ${id}`,
            description: null,
            userId: userA,
            createdAt: now,
            updatedAt: now,
            _count: { songs: 0 },
            songs: [],
          }));

          // Mock: when listSets is called for userA, prisma.set.findMany
          // should only return userA's sets (filtered by where: { userId: userA })
          mockPrisma.set.findMany.mockResolvedValueOnce(setsA as any);

          // Mock session.findFirst for each set (called in listSets loop)
          for (const _ of setsA) {
            (mockPrisma.session as any).findFirst.mockResolvedValueOnce(null);
          }

          const result = await listSets(userA);

          // Every returned set must belong to userA, never to userB
          for (const set of result) {
            expect(set.id).not.toSatisfy((id: string) =>
              setIdsB.includes(id) && !setIdsA.includes(id)
            );
          }

          // Verify prisma was called with the correct userId filter
          expect(mockPrisma.set.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
              where: { userId: userA },
            })
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
