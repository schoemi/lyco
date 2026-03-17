import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

/**
 * Feature: user-account-control
 * Property 9: Ausstehend-Zähler entspricht tatsächlicher Anzahl
 *
 * Validates: Requirements 5.1
 */

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock("@/lib/services/auth-service", () => ({
  hashPassword: vi.fn(async (pw: string) => `hashed_${pw}`),
}));

import { prisma } from "@/lib/prisma";
import { getPendingCount } from "@/lib/services/user-service";

const mockPrisma = vi.mocked(prisma);

const PBT_CONFIG = { numRuns: 100 };

/**
 * Property 9: Ausstehend-Zähler entspricht tatsächlicher Anzahl
 *
 * Für jede Menge von Benutzern mit verschiedenen accountStatus-Werten
 * muss getPendingCount() genau die Anzahl der Benutzer mit
 * accountStatus == PENDING zurückgeben.
 *
 * **Validates: Requirements 5.1**
 */
describe("Property 9: Ausstehend-Zähler entspricht tatsächlicher Anzahl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getPendingCount() returns exactly the number of users with accountStatus PENDING", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.constantFrom("ACTIVE" as const, "SUSPENDED" as const, "PENDING" as const),
          { minLength: 0, maxLength: 50 }
        ),
        async (statuses) => {
          vi.clearAllMocks();

          const expectedPendingCount = statuses.filter(
            (s) => s === "PENDING"
          ).length;

          // Mock prisma.user.count to simulate the DB counting PENDING users
          mockPrisma.user.count.mockResolvedValueOnce(expectedPendingCount);

          const result = await getPendingCount();

          // Verify the service called prisma with the correct where clause
          expect(mockPrisma.user.count).toHaveBeenCalledWith({
            where: { accountStatus: "PENDING" },
          });

          // The result must match the actual number of PENDING users
          expect(result).toBe(expectedPendingCount);
        }
      ),
      PBT_CONFIG
    );
  });
});
