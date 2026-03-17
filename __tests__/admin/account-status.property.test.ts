import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

/**
 * Feature: user-account-control
 * Property 1: Admin-Erstellung setzt Status ACTIVE
 * Property 3: Sperren setzt Status SUSPENDED
 * Property 4: Entsperren/Bestätigen setzt Status ACTIVE
 * Property 5: Selbstsperrung ist verboten
 * Property 10: Ablehnung entfernt Benutzer
 *
 * Validates: Requirements 1.2, 2.1, 2.2, 2.3, 2.5, 5.2, 5.3
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
import {
  createUser,
  suspendUser,
  activateUser,
  approveUser,
  rejectUser,
} from "@/lib/services/user-service";

const mockPrisma = vi.mocked(prisma);

const PBT_CONFIG = { numRuns: 100 };

/**
 * Property 1: Admin-Erstellung setzt Status ACTIVE
 *
 * Für alle gültigen CreateUserInput-Daten, die über die Admin-API erstellt werden,
 * muss der resultierende Benutzer den accountStatus ACTIVE haben.
 *
 * **Validates: Requirements 1.2**
 */
describe("Property 1: Admin-Erstellung setzt Status ACTIVE", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("admin-created user always has accountStatus ACTIVE", async () => {
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

          // Prisma create returns user with ACTIVE status (default behavior)
          mockPrisma.user.create.mockResolvedValueOnce({
            id: fakeId,
            email: input.email,
            name: input.name ?? null,
            role: input.role,
            accountStatus: "ACTIVE",
            createdAt: now,
            updatedAt: now,
          } as any);

          const result = await createUser(input);

          // The create call should NOT set accountStatus (relies on DB default ACTIVE)
          const createCall = mockPrisma.user.create.mock.calls[0][0];
          expect((createCall.data as any).accountStatus).toBeUndefined();

          // The returned user has ACTIVE status
          expect((result as any).accountStatus).toBe("ACTIVE");
        }
      ),
      PBT_CONFIG
    );
  });
});


/**
 * Property 3: Sperren setzt Status SUSPENDED
 *
 * Für jeden Benutzer mit accountStatus ACTIVE, der von einem anderen Admin gesperrt wird,
 * muss der accountStatus danach SUSPENDED sein.
 *
 * **Validates: Requirements 2.1**
 */
describe("Property 3: Sperren setzt Status SUSPENDED", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("suspending an active user always sets status to SUSPENDED", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        async (userId, adminId) => {
          // Ensure different IDs so self-suspension guard doesn't trigger
          fc.pre(userId !== adminId);

          vi.clearAllMocks();

          const now = new Date();

          // User exists with ACTIVE status
          mockPrisma.user.findUnique.mockResolvedValueOnce({
            id: userId,
            email: "user@example.com",
            name: "Test User",
            passwordHash: "hashed_pw",
            role: "USER",
            accountStatus: "ACTIVE",
            createdAt: now,
            updatedAt: now,
          } as any);

          // Update returns user with SUSPENDED status
          mockPrisma.user.update.mockResolvedValueOnce({
            id: userId,
            email: "user@example.com",
            name: "Test User",
            role: "USER",
            accountStatus: "SUSPENDED",
            createdAt: now,
            updatedAt: now,
          } as any);

          const result = await suspendUser(userId, adminId);

          // Verify the update was called with SUSPENDED
          expect(mockPrisma.user.update).toHaveBeenCalledWith({
            where: { id: userId },
            data: { accountStatus: "SUSPENDED" },
            select: expect.objectContaining({ id: true }),
          });

          expect((result as any).accountStatus).toBe("SUSPENDED");
        }
      ),
      PBT_CONFIG
    );
  });
});

/**
 * Property 4: Entsperren/Bestätigen setzt Status ACTIVE
 *
 * Für jeden Benutzer mit accountStatus SUSPENDED oder PENDING, der von einem Admin
 * entsperrt bzw. bestätigt wird, muss der accountStatus danach ACTIVE sein.
 *
 * **Validates: Requirements 2.2, 2.5, 5.2**
 */
describe("Property 4: Entsperren/Bestätigen setzt Status ACTIVE", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("activating a SUSPENDED user sets status to ACTIVE", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        async (userId) => {
          vi.clearAllMocks();

          const now = new Date();

          mockPrisma.user.findUnique.mockResolvedValueOnce({
            id: userId,
            email: "user@example.com",
            name: "Test User",
            passwordHash: "hashed_pw",
            role: "USER",
            accountStatus: "SUSPENDED",
            createdAt: now,
            updatedAt: now,
          } as any);

          mockPrisma.user.update.mockResolvedValueOnce({
            id: userId,
            email: "user@example.com",
            name: "Test User",
            role: "USER",
            accountStatus: "ACTIVE",
            createdAt: now,
            updatedAt: now,
          } as any);

          const result = await activateUser(userId);

          expect(mockPrisma.user.update).toHaveBeenCalledWith({
            where: { id: userId },
            data: { accountStatus: "ACTIVE" },
            select: expect.objectContaining({ id: true }),
          });

          expect((result as any).accountStatus).toBe("ACTIVE");
        }
      ),
      PBT_CONFIG
    );
  });

  it("approving a PENDING user sets status to ACTIVE", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        async (userId) => {
          vi.clearAllMocks();

          const now = new Date();

          mockPrisma.user.findUnique.mockResolvedValueOnce({
            id: userId,
            email: "user@example.com",
            name: "Pending User",
            passwordHash: "hashed_pw",
            role: "USER",
            accountStatus: "PENDING",
            createdAt: now,
            updatedAt: now,
          } as any);

          mockPrisma.user.update.mockResolvedValueOnce({
            id: userId,
            email: "user@example.com",
            name: "Pending User",
            role: "USER",
            accountStatus: "ACTIVE",
            createdAt: now,
            updatedAt: now,
          } as any);

          const result = await approveUser(userId);

          expect(mockPrisma.user.update).toHaveBeenCalledWith({
            where: { id: userId },
            data: { accountStatus: "ACTIVE" },
            select: expect.objectContaining({ id: true }),
          });

          expect((result as any).accountStatus).toBe("ACTIVE");
        }
      ),
      PBT_CONFIG
    );
  });
});


/**
 * Property 5: Selbstsperrung ist verboten
 *
 * Für jeden Admin-Benutzer muss der Versuch, den eigenen Account zu sperren,
 * abgelehnt werden, und der accountStatus muss unverändert ACTIVE bleiben.
 *
 * **Validates: Requirements 2.3**
 */
describe("Property 5: Selbstsperrung ist verboten", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("self-suspension is always rejected for any admin user ID", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        async (adminId) => {
          vi.clearAllMocks();

          // Attempt to suspend own account (same ID for both params)
          await expect(suspendUser(adminId, adminId)).rejects.toThrow(
            "Eigenes Konto kann nicht gesperrt werden"
          );

          // prisma.user.update must NOT have been called
          expect(mockPrisma.user.update).not.toHaveBeenCalled();
          // prisma.user.findUnique must NOT have been called (guard is checked first)
          expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
        }
      ),
      PBT_CONFIG
    );
  });
});

/**
 * Property 10: Ablehnung entfernt Benutzer
 *
 * Für jeden Benutzer mit accountStatus PENDING, der von einem Admin abgelehnt wird,
 * muss der Benutzer danach nicht mehr in der Datenbank existieren.
 *
 * **Validates: Requirements 5.3**
 */
describe("Property 10: Ablehnung entfernt Benutzer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejecting a PENDING user calls delete with the correct user ID", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        async (userId) => {
          vi.clearAllMocks();

          const now = new Date();

          mockPrisma.user.findUnique.mockResolvedValueOnce({
            id: userId,
            email: "pending@example.com",
            name: "Pending User",
            passwordHash: "hashed_pw",
            role: "USER",
            accountStatus: "PENDING",
            createdAt: now,
            updatedAt: now,
          } as any);

          mockPrisma.user.delete.mockResolvedValueOnce({
            id: userId,
          } as any);

          await rejectUser(userId);

          // Verify delete was called with the correct user ID
          expect(mockPrisma.user.delete).toHaveBeenCalledWith({
            where: { id: userId },
          });
        }
      ),
      PBT_CONFIG
    );
  });

  it("rejecting a non-PENDING user is always rejected", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.constantFrom("ACTIVE" as const, "SUSPENDED" as const),
        async (userId, status) => {
          vi.clearAllMocks();

          const now = new Date();

          mockPrisma.user.findUnique.mockResolvedValueOnce({
            id: userId,
            email: "user@example.com",
            name: "User",
            passwordHash: "hashed_pw",
            role: "USER",
            accountStatus: status,
            createdAt: now,
            updatedAt: now,
          } as any);

          await expect(rejectUser(userId)).rejects.toThrow(
            "Nur ausstehende Benutzer können abgelehnt werden"
          );

          // Delete must NOT have been called
          expect(mockPrisma.user.delete).not.toHaveBeenCalled();
        }
      ),
      PBT_CONFIG
    );
  });
});
