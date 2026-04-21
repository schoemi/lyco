/**
 * Eigenschaft 4: Kategorie-CRUD-Persistenz (Round-Trip)
 *
 * Für alle gültigen Kombinationen von title, slug und orderIndex gilt:
 * Eine über die API erstellte Tag_Kategorie muss beim anschließenden Abrufen
 * exakt dieselben Werte für title, slug und orderIndex zurückgeben.
 * Ebenso muss eine Aktualisierung dieser Felder beim erneuten Abrufen
 * die aktualisierten Werte widerspiegeln.
 *
 * **Validates: Requirements 2.1, 2.2**
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
      count: vi.fn(),
    },
  },
}));

import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/tag-categories/route";
import { PUT } from "@/app/api/tag-categories/[id]/route";
import { prisma } from "@/lib/prisma";

const mockPrisma = vi.mocked(prisma);

const adminSession = {
  user: {
    id: "admin-1",
    email: "admin@test.com",
    name: "Admin",
    role: "ADMIN",
  },
};

// Generator for valid slug strings: lowercase alpha start, then alphanumeric/hyphens, 1-20 chars
const slugArb = fc
  .stringMatching(/^[a-z][a-z0-9-]{0,19}$/)
  .filter((s) => !s.endsWith("-"));

// Generator for non-empty title strings
const titleArb = fc.stringMatching(
  /^[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß0-9 ]{0,29}$/
);

// Generator for orderIndex
const orderIndexArb = fc.integer({ min: 0, max: 999 });

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

describe("Eigenschaft 4: Kategorie-CRUD-Persistenz (Round-Trip)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(adminSession);
  });

  /**
   * **Validates: Requirements 2.1**
   *
   * Create → GET round-trip: For any valid title, slug, orderIndex,
   * creating a category and then retrieving all categories must return
   * the exact same values for title, slug, and orderIndex.
   */
  it("Create → GET: erstellte Werte stimmen beim Abrufen exakt überein", () => {
    return fc.assert(
      fc.asyncProperty(
        slugArb,
        titleArb,
        orderIndexArb,
        async (slug, title, orderIndex) => {
          vi.clearAllMocks();
          mockAuth.mockResolvedValue(adminSession);

          const generatedId = `kat-${slug}`;
          const now = new Date();

          const createdRecord = {
            id: generatedId,
            title,
            slug,
            orderIndex,
            createdAt: now,
            updatedAt: now,
            _count: { tagDefinitions: 0 },
          };

          // Mock: slug does not exist yet → creation succeeds
          mockPrisma.tagKategorie.findUnique.mockResolvedValueOnce(null);
          mockPrisma.tagKategorie.create.mockResolvedValueOnce(
            createdRecord as any
          );

          // Step 1: Create the category via POST
          const postReq = makePostRequest({ title, slug, orderIndex });
          const postRes = await POST(postReq);

          expect(postRes.status).toBe(201);
          const postJson = await postRes.json();
          const created = postJson.category;

          // Verify POST response matches input
          expect(created.title).toBe(title);
          expect(created.slug).toBe(slug);
          expect(created.orderIndex).toBe(orderIndex);

          // Step 2: Retrieve all categories via GET
          mockPrisma.tagKategorie.findMany.mockResolvedValueOnce([
            createdRecord as any,
          ]);

          const getRes = await GET();
          expect(getRes.status).toBe(200);

          const getJson = await getRes.json();
          const categories = getJson.categories;

          expect(categories).toHaveLength(1);

          const retrieved = categories[0];

          // Round-trip assertion: retrieved values must exactly match created values
          expect(retrieved.title).toBe(title);
          expect(retrieved.slug).toBe(slug);
          expect(retrieved.orderIndex).toBe(orderIndex);
        }
      ),
      PBT_CONFIG
    );
  });

  /**
   * **Validates: Requirements 2.2**
   *
   * Update → GET round-trip: For any valid initial and updated values,
   * updating a category and then retrieving it must return the updated values.
   */
  it("Update → GET: aktualisierte Werte stimmen beim Abrufen exakt überein", () => {
    return fc.assert(
      fc.asyncProperty(
        slugArb,
        titleArb,
        orderIndexArb,
        slugArb,
        titleArb,
        orderIndexArb,
        async (
          initialSlug,
          initialTitle,
          initialOrderIndex,
          updatedSlug,
          updatedTitle,
          updatedOrderIndex
        ) => {
          vi.clearAllMocks();
          mockAuth.mockResolvedValue(adminSession);

          const kategorieId = `kat-${initialSlug}`;
          const now = new Date();

          const existingRecord = {
            id: kategorieId,
            title: initialTitle,
            slug: initialSlug,
            orderIndex: initialOrderIndex,
            createdAt: now,
            updatedAt: now,
            _count: { tagDefinitions: 0 },
          };

          const updatedRecord = {
            id: kategorieId,
            title: updatedTitle,
            slug: updatedSlug,
            orderIndex: updatedOrderIndex,
            createdAt: now,
            updatedAt: new Date(),
            _count: { tagDefinitions: 0 },
          };

          // Mock: category exists for update
          mockPrisma.tagKategorie.findUnique.mockResolvedValueOnce(
            existingRecord as any
          );

          // Mock: if slug changed, check no conflict (no other category with that slug)
          if (updatedSlug !== initialSlug) {
            mockPrisma.tagKategorie.findUnique.mockResolvedValueOnce(null);
          }

          // Mock: update succeeds
          mockPrisma.tagKategorie.update.mockResolvedValueOnce(
            updatedRecord as any
          );

          // Step 1: Update the category via PUT
          const putReq = makePutRequest(kategorieId, {
            title: updatedTitle,
            slug: updatedSlug,
            orderIndex: updatedOrderIndex,
          });
          const putRes = await PUT(putReq, {
            params: Promise.resolve({ id: kategorieId }),
          });

          expect(putRes.status).toBe(200);
          const putJson = await putRes.json();
          const updated = putJson.category;

          // Verify PUT response matches updated input
          expect(updated.title).toBe(updatedTitle);
          expect(updated.slug).toBe(updatedSlug);
          expect(updated.orderIndex).toBe(updatedOrderIndex);

          // Step 2: Retrieve all categories via GET
          mockPrisma.tagKategorie.findMany.mockResolvedValueOnce([
            updatedRecord as any,
          ]);

          const getRes = await GET();
          expect(getRes.status).toBe(200);

          const getJson = await getRes.json();
          const categories = getJson.categories;

          expect(categories).toHaveLength(1);

          const retrieved = categories[0];

          // Round-trip assertion: retrieved values must exactly match updated values
          expect(retrieved.title).toBe(updatedTitle);
          expect(retrieved.slug).toBe(updatedSlug);
          expect(retrieved.orderIndex).toBe(updatedOrderIndex);
        }
      ),
      PBT_CONFIG
    );
  });
});
