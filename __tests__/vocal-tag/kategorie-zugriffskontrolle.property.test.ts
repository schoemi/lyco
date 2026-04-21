/**
 * Eigenschaft 5: Zugriffskontrolle
 *
 * Für alle Benutzer mit einer Rolle ungleich ADMIN gilt:
 * Mutations-Anfragen (POST, PUT, DELETE) an die Kategorie-API müssen
 * mit HTTP-Status 403 abgelehnt werden, und der Datenbestand darf sich
 * nicht verändern.
 *
 * **Validates: Requirements 2.6**
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

const PBT_CONFIG = { numRuns: 100 };

// --- Mocks ---

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tagKategorie: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/tag-categories/route";
import { PUT, DELETE } from "@/app/api/tag-categories/[id]/route";
import { prisma } from "@/lib/prisma";

const mockPrisma = vi.mocked(prisma);

// Generator for non-ADMIN roles
const nonAdminRoleArb = fc.constantFrom("USER", "VIEWER", "EDITOR", "MODERATOR");

// Generator for valid slug strings
const slugArb = fc
  .stringMatching(/^[a-z][a-z0-9-]{0,19}$/)
  .filter((s) => !s.endsWith("-"));

// Generator for non-empty title strings
const titleArb = fc.stringMatching(
  /^[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß0-9 ]{0,29}$/
);

// Generator for orderIndex
const orderIndexArb = fc.integer({ min: 0, max: 999 });

// Generator for category IDs
const categoryIdArb = fc.stringMatching(/^kat-[a-z0-9]{4,12}$/);

function makePostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/tag-categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makePutRequest(
  id: string,
  body: Record<string, unknown>
): NextRequest {
  return new NextRequest(`http://localhost/api/tag-categories/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(id: string): NextRequest {
  return new NextRequest(`http://localhost/api/tag-categories/${id}`, {
    method: "DELETE",
  });
}

describe("Eigenschaft 5: Zugriffskontrolle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * **Validates: Requirements 2.6**
   *
   * For any non-ADMIN role: POST to /api/tag-categories must return 403
   * and no Prisma mutation methods (create, update, delete) are called.
   */
  it("POST mit nicht-ADMIN-Rolle liefert HTTP 403 und keine Mutation", () => {
    return fc.assert(
      fc.asyncProperty(
        nonAdminRoleArb,
        slugArb,
        titleArb,
        orderIndexArb,
        async (role, slug, title, orderIndex) => {
          vi.clearAllMocks();

          const session = {
            user: {
              id: "user-1",
              email: "user@test.com",
              name: "User",
              role,
            },
          };
          mockAuth.mockResolvedValue(session);

          const req = makePostRequest({ title, slug, orderIndex });
          const res = await POST(req);

          expect(res.status).toBe(403);
          const json = await res.json();
          expect(json.error).toBe("Keine Berechtigung");

          // Verify no Prisma mutation methods were called
          expect(mockPrisma.tagKategorie.create).not.toHaveBeenCalled();
          expect(mockPrisma.tagKategorie.update).not.toHaveBeenCalled();
          expect(mockPrisma.tagKategorie.delete).not.toHaveBeenCalled();
        }
      ),
      PBT_CONFIG
    );
  });

  /**
   * **Validates: Requirements 2.6**
   *
   * For any non-ADMIN role: PUT to /api/tag-categories/[id] must return 403
   * and no Prisma mutation methods (create, update, delete) are called.
   */
  it("PUT mit nicht-ADMIN-Rolle liefert HTTP 403 und keine Mutation", () => {
    return fc.assert(
      fc.asyncProperty(
        nonAdminRoleArb,
        categoryIdArb,
        slugArb,
        titleArb,
        orderIndexArb,
        async (role, categoryId, slug, title, orderIndex) => {
          vi.clearAllMocks();

          const session = {
            user: {
              id: "user-1",
              email: "user@test.com",
              name: "User",
              role,
            },
          };
          mockAuth.mockResolvedValue(session);

          const req = makePutRequest(categoryId, { title, slug, orderIndex });
          const res = await PUT(req, {
            params: Promise.resolve({ id: categoryId }),
          });

          expect(res.status).toBe(403);
          const json = await res.json();
          expect(json.error).toBe("Keine Berechtigung");

          // Verify no Prisma mutation methods were called
          expect(mockPrisma.tagKategorie.create).not.toHaveBeenCalled();
          expect(mockPrisma.tagKategorie.update).not.toHaveBeenCalled();
          expect(mockPrisma.tagKategorie.delete).not.toHaveBeenCalled();
        }
      ),
      PBT_CONFIG
    );
  });

  /**
   * **Validates: Requirements 2.6**
   *
   * For any non-ADMIN role: DELETE to /api/tag-categories/[id] must return 403
   * and no Prisma mutation methods (create, update, delete) are called.
   */
  it("DELETE mit nicht-ADMIN-Rolle liefert HTTP 403 und keine Mutation", () => {
    return fc.assert(
      fc.asyncProperty(
        nonAdminRoleArb,
        categoryIdArb,
        async (role, categoryId) => {
          vi.clearAllMocks();

          const session = {
            user: {
              id: "user-1",
              email: "user@test.com",
              name: "User",
              role,
            },
          };
          mockAuth.mockResolvedValue(session);

          const req = makeDeleteRequest(categoryId);
          const res = await DELETE(req, {
            params: Promise.resolve({ id: categoryId }),
          });

          expect(res.status).toBe(403);
          const json = await res.json();
          expect(json.error).toBe("Keine Berechtigung");

          // Verify no Prisma mutation methods were called
          expect(mockPrisma.tagKategorie.create).not.toHaveBeenCalled();
          expect(mockPrisma.tagKategorie.update).not.toHaveBeenCalled();
          expect(mockPrisma.tagKategorie.delete).not.toHaveBeenCalled();
        }
      ),
      PBT_CONFIG
    );
  });
});
