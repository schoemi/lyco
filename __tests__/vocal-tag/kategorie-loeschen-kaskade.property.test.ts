/**
 * Eigenschaft 3: Kaskadierendes Nullsetzen beim Löschen
 *
 * Für jede Tag_Kategorie mit N zugeordneten Tag_Definitionen (N ≥ 0) gilt:
 * Nach dem Löschen der Kategorie müssen alle N Tag_Definitionen weiterhin
 * existieren und deren categoryId muss null sein.
 *
 * **Validates: Requirements 1.5, 2.3**
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
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { NextRequest } from "next/server";
import { DELETE } from "@/app/api/tag-categories/[id]/route";
import { prisma } from "@/lib/prisma";

const mockPrisma = vi.mocked(prisma);

const adminSession = {
  user: { id: "admin-1", email: "admin@test.com", name: "Admin", role: "ADMIN" },
};

// Generator for number of tag definitions (0-10)
const tagCountArb = fc.integer({ min: 0, max: 10 });

// Generator for a category id
const categoryIdArb = fc.stringMatching(/^[a-z][a-z0-9]{4,19}$/);

// Generator for a category title
const titleArb = fc.stringMatching(/^[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß0-9 ]{0,29}$/);

// Generator for a slug
const slugArb = fc.stringMatching(/^[a-z][a-z0-9-]{0,14}$/).filter((s) => !s.endsWith("-"));

// Generator for orderIndex
const orderIndexArb = fc.integer({ min: 0, max: 999 });

function makeDeleteRequest(id: string): NextRequest {
  return new NextRequest(`http://localhost/api/tag-categories/${id}`, {
    method: "DELETE",
  });
}

describe("Eigenschaft 3: Kaskadierendes Nullsetzen beim Löschen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(adminSession);
  });

  /**
   * **Validates: Requirements 1.5, 2.3**
   *
   * For any category with N (0-10) assigned tag definitions:
   * After deletion, the service returns the correct affectedTags count,
   * and prisma.tagKategorie.delete was called (Prisma onDelete: SetNull
   * handles the cascade automatically).
   */
  it("nach dem Löschen gibt die API die korrekte Anzahl betroffener Tags zurück und delete wird aufgerufen", () => {
    return fc.assert(
      fc.asyncProperty(
        categoryIdArb,
        titleArb,
        slugArb,
        orderIndexArb,
        tagCountArb,
        async (categoryId, title, slug, orderIndex, numTags) => {
          vi.clearAllMocks();
          mockAuth.mockResolvedValue(adminSession);

          const existingKategorie = {
            id: categoryId,
            title,
            slug,
            orderIndex,
            createdAt: new Date(),
            updatedAt: new Date(),
            _count: { tagDefinitions: numTags },
          };

          // findUnique returns the existing category with its tag count
          mockPrisma.tagKategorie.findUnique.mockResolvedValueOnce(
            existingKategorie as any
          );

          // delete succeeds (Prisma onDelete: SetNull handles cascade)
          mockPrisma.tagKategorie.delete.mockResolvedValueOnce(
            existingKategorie as any
          );

          const request = makeDeleteRequest(categoryId);
          const response = await DELETE(request, {
            params: Promise.resolve({ id: categoryId }),
          });

          expect(response.status).toBe(200);

          const json = await response.json();

          // The API must report deleted: true
          expect(json.deleted).toBe(true);

          // The API must report the correct number of affected tags
          expect(json.affectedTags).toBe(numTags);

          // prisma.tagKategorie.delete must have been called with the correct id
          expect(mockPrisma.tagKategorie.delete).toHaveBeenCalledTimes(1);
          expect(mockPrisma.tagKategorie.delete).toHaveBeenCalledWith({
            where: { id: categoryId },
          });
        }
      ),
      PBT_CONFIG
    );
  });
});
