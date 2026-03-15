import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

/**
 * Feature: user-management-auth
 * Property 8: Admin-User-CRUD-Round-Trip (Erstellen)
 * Property 9: Admin-User-CRUD-Round-Trip (Bearbeiten)
 * Property 10: Löschen entfernt Benutzer
 * Property 11: Selbstlöschung durch Admin ist verboten
 *
 * Validates: Requirements 5.2, 5.3, 5.4, 5.5
 */

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/services/auth-service", () => ({
  hashPassword: vi.fn(async (pw: string) => `hashed_${pw}`),
}));

import { prisma } from "@/lib/prisma";
import {
  createUser,
  updateUser,
  deleteUser,
} from "@/lib/services/user-service";

const mockPrisma = vi.mocked(prisma);

/**
 * Property 8: Admin-User-CRUD-Round-Trip (Erstellen)
 *
 * Validates: Requirements 5.2
 */
describe("Property 8: Admin-User-CRUD-Round-Trip (Erstellen)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("created user is retrievable with correct data", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc
            .stringMatching(/^[a-z][a-z0-9]{2,10}@[a-z]{3,8}\.[a-z]{2,4}$/)
            .map((e) => e.toLowerCase()),
          name: fc.option(fc.string({ minLength: 1, maxLength: 30 }), {
            nil: undefined,
          }),
          password: fc.string({ minLength: 8, maxLength: 50 }),
          role: fc.constantFrom("ADMIN" as const, "USER" as const),
        }),
        async (input) => {
          vi.clearAllMocks();

          const fakeId = "user-created-id";
          const now = new Date();

          // Email not taken
          mockPrisma.user.findUnique.mockResolvedValueOnce(null);

          const expectedUser = {
            id: fakeId,
            email: input.email,
            name: input.name ?? null,
            role: input.role,
            createdAt: now,
            updatedAt: now,
          };

          mockPrisma.user.create.mockResolvedValueOnce(expectedUser as any);

          const result = await createUser(input);

          expect(result.email).toBe(input.email);
          expect(result.name).toBe(input.name ?? null);
          expect(result.role).toBe(input.role);
        }
      ),
      { numRuns: 20 }
    );
  });
});

/**
 * Property 9: Admin-User-CRUD-Round-Trip (Bearbeiten)
 *
 * Validates: Requirements 5.3
 */
describe("Property 9: Admin-User-CRUD-Round-Trip (Bearbeiten)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updated fields are saved, unchanged fields remain", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.option(
            fc
              .stringMatching(/^[a-z][a-z0-9]{2,10}@[a-z]{3,8}\.[a-z]{2,4}$/)
              .map((e) => e.toLowerCase()),
            { nil: undefined }
          ),
          name: fc.option(fc.string({ minLength: 1, maxLength: 30 }), {
            nil: undefined,
          }),
          role: fc.option(
            fc.constantFrom("ADMIN" as const, "USER" as const),
            { nil: undefined }
          ),
        }),
        async (updateInput) => {
          vi.clearAllMocks();

          const userId = "existing-user-id";
          const now = new Date();

          const existingUser = {
            id: userId,
            email: "original@example.com",
            name: "Original Name",
            passwordHash: "hashed_password",
            role: "USER" as const,
            createdAt: now,
            updatedAt: now,
          };

          // findUnique for existence check
          mockPrisma.user.findUnique.mockResolvedValueOnce(existingUser as any);

          // If email changes, isEmailTaken calls findUnique again — return null (not taken)
          if (updateInput.email !== undefined && updateInput.email !== existingUser.email) {
            mockPrisma.user.findUnique.mockResolvedValueOnce(null);
          }

          const expectedUpdated = {
            id: userId,
            email: updateInput.email ?? existingUser.email,
            name: updateInput.name !== undefined ? updateInput.name : existingUser.name,
            role: updateInput.role ?? existingUser.role,
            createdAt: now,
            updatedAt: new Date(),
          };

          mockPrisma.user.update.mockResolvedValueOnce(expectedUpdated as any);

          const result = await updateUser(userId, updateInput);

          // Changed fields should reflect new values
          if (updateInput.email !== undefined) {
            expect(result.email).toBe(updateInput.email);
          } else {
            expect(result.email).toBe(existingUser.email);
          }

          if (updateInput.name !== undefined) {
            expect(result.name).toBe(updateInput.name);
          } else {
            expect(result.name).toBe(existingUser.name);
          }

          if (updateInput.role !== undefined) {
            expect(result.role).toBe(updateInput.role);
          } else {
            expect(result.role).toBe(existingUser.role);
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});

/**
 * Property 10: Löschen entfernt Benutzer
 *
 * Validates: Requirements 5.4
 */
describe("Property 10: Löschen entfernt Benutzer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delete calls prisma.user.delete with the correct user ID", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        async (userId, requestingUserId) => {
          // Ensure different IDs so self-deletion guard doesn't trigger
          fc.pre(userId !== requestingUserId);

          vi.clearAllMocks();

          const now = new Date();
          const existingUser = {
            id: userId,
            email: "user@example.com",
            name: "Test User",
            passwordHash: "hashed_pw",
            role: "USER" as const,
            createdAt: now,
            updatedAt: now,
          };

          mockPrisma.user.findUnique.mockResolvedValueOnce(
            existingUser as any
          );
          mockPrisma.user.delete.mockResolvedValueOnce(existingUser as any);

          await deleteUser(userId, requestingUserId);

          expect(mockPrisma.user.delete).toHaveBeenCalledWith({
            where: { id: userId },
          });
        }
      ),
      { numRuns: 20 }
    );
  });
});

describe("Property 11: Selbstlöschung durch Admin ist verboten", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects self-deletion for any admin user ID and user still exists", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        async (userId) => {
          vi.clearAllMocks();

          // Attempt to delete own account (same ID for both params)
          await expect(deleteUser(userId, userId)).rejects.toThrow(
            "Eigenen Account kann nicht gelöscht werden"
          );

          // prisma.user.delete must NOT have been called
          expect(mockPrisma.user.delete).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 20 }
    );
  });
});
