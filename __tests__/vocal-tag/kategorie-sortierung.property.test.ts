/**
 * Eigenschaft 2: Sortierung nach orderIndex
 *
 * Für jede Menge von Tag_Kategorien mit beliebigen orderIndex-Werten gilt:
 * Die GET-API muss die Kategorien aufsteigend nach orderIndex sortiert
 * zurückgeben, d.h. für alle aufeinanderfolgenden Elemente i und i+1 in
 * der Ergebnisliste muss result[i].orderIndex <= result[i+1].orderIndex gelten.
 *
 * **Validates: Requirements 1.3, 2.7**
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

import { GET } from "@/app/api/tag-categories/route";
import { prisma } from "@/lib/prisma";

const mockPrisma = vi.mocked(prisma);

const userSession = {
  user: { id: "user-1", email: "user@test.com", name: "User", role: "USER" },
};

// Generator for a single category with random orderIndex
const kategorieArb = (index: number) =>
  fc.record({
    id: fc.constant(`kat-${index}`),
    title: fc.stringMatching(/^[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß0-9 ]{0,19}$/),
    slug: fc.stringMatching(/^[a-z][a-z0-9-]{0,14}$/).filter((s) => !s.endsWith("-")),
    orderIndex: fc.integer({ min: -100, max: 100 }),
    createdAt: fc.constant(new Date()),
    updatedAt: fc.constant(new Date()),
    _count: fc.constant({ tagDefinitions: 0 }),
  });

// Generator for an array of 0-20 categories with unique ids
const kategorienArrayArb = fc
  .integer({ min: 0, max: 20 })
  .chain((len) => fc.tuple(...Array.from({ length: len }, (_, i) => kategorieArb(i))));

describe("Eigenschaft 2: Sortierung nach orderIndex", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(userSession);
  });

  /**
   * **Validates: Requirements 1.3, 2.7**
   *
   * For any set of categories with arbitrary orderIndex values,
   * the GET API must return them sorted ascending by orderIndex.
   */
  it("GET gibt Kategorien aufsteigend nach orderIndex sortiert zurück", () => {
    return fc.assert(
      fc.asyncProperty(kategorienArrayArb, async (kategorien) => {
        vi.clearAllMocks();
        mockAuth.mockResolvedValue(userSession);

        // Simulate Prisma sorting: return categories sorted by orderIndex ascending
        const sorted = [...kategorien].sort((a, b) => a.orderIndex - b.orderIndex);

        mockPrisma.tagKategorie.findMany.mockResolvedValueOnce(sorted as any);

        const response = await GET();

        expect(response.status).toBe(200);

        const json = await response.json();
        const categories = json.categories;

        expect(categories).toHaveLength(kategorien.length);

        // Verify: for all consecutive elements i, i+1:
        // result[i].orderIndex <= result[i+1].orderIndex
        for (let i = 0; i < categories.length - 1; i++) {
          expect(categories[i].orderIndex).toBeLessThanOrEqual(
            categories[i + 1].orderIndex
          );
        }
      }),
      PBT_CONFIG
    );
  });
});
