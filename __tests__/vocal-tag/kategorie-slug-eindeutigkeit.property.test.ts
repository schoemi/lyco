/**
 * Eigenschaft 1: Slug-Eindeutigkeit
 *
 * Für alle gültigen Slug-Werte gilt: Wenn eine Tag_Kategorie mit einem
 * bestimmten Slug existiert, dann muss der Versuch, eine zweite Tag_Kategorie
 * mit demselben Slug zu erstellen, mit HTTP-Status 409 abgelehnt werden,
 * und die Gesamtanzahl der Kategorien darf sich nicht erhöhen.
 *
 * **Validates: Requirements 1.2, 2.4**
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
      count: vi.fn(),
    },
  },
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/tag-categories/route";
import { prisma } from "@/lib/prisma";

const mockPrisma = vi.mocked(prisma);

const adminSession = {
  user: { id: "admin-1", email: "admin@test.com", name: "Admin", role: "ADMIN" },
};

// Generator for valid slug strings: lowercase alpha start, then alphanumeric/hyphens, 1-20 chars
const slugArb = fc.stringMatching(/^[a-z][a-z0-9-]{0,19}$/).filter((s) => !s.endsWith("-"));

// Generator for non-empty title strings
const titleArb = fc.stringMatching(/^[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß0-9 ]{0,29}$/);

// Generator for orderIndex
const orderIndexArb = fc.integer({ min: 0, max: 999 });

function makePostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/tag-categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Eigenschaft 1: Slug-Eindeutigkeit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(adminSession);
  });

  /**
   * **Validates: Requirements 1.2, 2.4**
   *
   * For any valid slug: first creation succeeds (201), second creation
   * with the same slug returns HTTP 409 and the total count does not increase.
   */
  it("zweite Erstellung mit gleichem Slug liefert HTTP 409 und Anzahl bleibt gleich", () => {
    return fc.assert(
      fc.asyncProperty(
        slugArb,
        titleArb,
        orderIndexArb,
        async (slug, title, orderIndex) => {
          vi.clearAllMocks();
          mockAuth.mockResolvedValue(adminSession);

          const createdKategorie = {
            id: "generated-id",
            title,
            slug,
            orderIndex,
            createdAt: new Date(),
            updatedAt: new Date(),
            _count: { tagDefinitions: 0 },
          };

          // First creation: slug does not exist yet
          mockPrisma.tagKategorie.findUnique.mockResolvedValueOnce(null);
          mockPrisma.tagKategorie.create.mockResolvedValueOnce(createdKategorie as any);

          const body = { title, slug, orderIndex };
          const firstReq = makePostRequest(body);
          const firstRes = await POST(firstReq);

          expect(firstRes.status).toBe(201);

          // Track count before second attempt: 1 category exists
          const countBefore = 1;

          // Second creation: slug now exists
          mockPrisma.tagKategorie.findUnique.mockResolvedValueOnce(createdKategorie as any);

          const secondReq = makePostRequest(body);
          const secondRes = await POST(secondReq);

          expect(secondRes.status).toBe(409);
          const json = await secondRes.json();
          expect(json.error).toBe(
            "Eine Kategorie mit diesem Slug existiert bereits"
          );

          // Verify create was NOT called a second time (count stays the same)
          expect(mockPrisma.tagKategorie.create).toHaveBeenCalledTimes(1);

          // The total count must not have increased
          const countAfter = countBefore; // create was not called again
          expect(countAfter).toBe(countBefore);
        }
      ),
      PBT_CONFIG
    );
  });
});
