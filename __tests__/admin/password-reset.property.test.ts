import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

/**
 * Feature: user-management-auth
 * Property 12: Passwort-Reset-Round-Trip
 *
 * Nach Reset: Temporäres Passwort funktioniert für Login, altes Passwort nicht mehr.
 *
 * Validates: Requirements 5.7
 */

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/services/auth-service", () => ({
  hashPassword: vi.fn(async (pw: string) => `hashed_${pw}`),
}));

import { prisma } from "@/lib/prisma";
import { resetPassword } from "@/lib/services/user-service";

const mockPrisma = vi.mocked(prisma);

describe("Property 12: Passwort-Reset-Round-Trip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reset returns a non-empty temporary password and updates the hash to a new value", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        async (userId) => {
          vi.clearAllMocks();

          const oldHash = "hashed_oldPassword123";
          const now = new Date();

          const existingUser = {
            id: userId,
            email: "user@example.com",
            name: "Test User",
            passwordHash: oldHash,
            role: "USER" as const,
            createdAt: now,
            updatedAt: now,
          };

          mockPrisma.user.findUnique.mockResolvedValueOnce(existingUser as any);
          mockPrisma.user.update.mockResolvedValueOnce({ ...existingUser, passwordHash: "will_be_replaced" } as any);

          const temporaryPassword = await resetPassword(userId);

          // 1. Returned temporary password is a non-empty string
          expect(typeof temporaryPassword).toBe("string");
          expect(temporaryPassword.length).toBeGreaterThan(0);

          // 2. prisma.user.update was called with a new passwordHash
          expect(mockPrisma.user.update).toHaveBeenCalledOnce();
          const updateCall = mockPrisma.user.update.mock.calls[0][0];
          const newHash = updateCall.data.passwordHash;
          expect(typeof newHash).toBe("string");
          expect((newHash as string).length).toBeGreaterThan(0);

          // 3. The new hash is different from the old hash
          expect(newHash).not.toBe(oldHash);

          // 4. Since hashPassword is mocked as `hashed_${pw}`, verify the hash
          //    corresponds to the returned temporary password
          expect(newHash).toBe(`hashed_${temporaryPassword}`);
        }
      ),
      { numRuns: 20 }
    );
  });
});
