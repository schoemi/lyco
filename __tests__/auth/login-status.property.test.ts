/**
 * Feature: user-account-control
 * Property 6: Login-Ergebnis abhängig vom Kontostatus
 *
 * Für jeden Benutzer mit gültigen Credentials gilt: authorize() gibt genau dann
 * ein User-Objekt zurück, wenn accountStatus == ACTIVE. Bei SUSPENDED oder PENDING
 * wird die Anmeldung abgelehnt mit einer statusspezifischen Fehlermeldung.
 *
 * **Validates: Requirements 3.1, 3.2, 3.3**
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    loginAttempt: {
      count: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn(async (pw: string) => `hashed_${pw}`),
    compare: vi.fn(async () => true),
  },
}));

vi.mock("@/lib/services/rate-limiter", () => ({
  checkRateLimit: vi.fn(),
  recordFailedAttempt: vi.fn(),
  resetAttempts: vi.fn(),
}));

import { authorize } from "@/lib/services/auth-service";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  resetAttempts,
} from "@/lib/services/rate-limiter";

const mockPrisma = prisma as unknown as {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
  };
};

const mockCheckRateLimit = checkRateLimit as ReturnType<typeof vi.fn>;
const mockResetAttempts = resetAttempts as ReturnType<typeof vi.fn>;

const PBT_CONFIG = { numRuns: 100 };

describe("Property 6: Login-Ergebnis abhängig vom Kontostatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true });
    mockResetAttempts.mockResolvedValue(undefined);
  });

  it("authorize() returns User object only when accountStatus is ACTIVE", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 30 }),
          email: fc
            .stringMatching(/^[a-z][a-z0-9]{2,10}@[a-z]{3,8}\.[a-z]{2,4}$/)
            .map((e) => e.toLowerCase()),
          name: fc.option(fc.string({ minLength: 1, maxLength: 30 }), {
            nil: null,
          }),
          password: fc.string({ minLength: 8, maxLength: 50 }),
          role: fc.constantFrom("ADMIN" as const, "USER" as const),
        }),
        async (input) => {
          vi.clearAllMocks();
          mockCheckRateLimit.mockResolvedValue({ allowed: true });
          mockResetAttempts.mockResolvedValue(undefined);

          const now = new Date();

          mockPrisma.user.findUnique.mockResolvedValueOnce({
            id: input.id,
            email: input.email,
            name: input.name,
            passwordHash: `hashed_${input.password}`,
            role: input.role,
            accountStatus: "ACTIVE",
            createdAt: now,
            updatedAt: now,
          });

          const result = await authorize(input.email, input.password);

          expect(result).not.toBeNull();
          expect(result!.id).toBe(input.id);
          expect(result!.email).toBe(input.email);
          expect(result!.accountStatus).toBe("ACTIVE");
        }
      ),
      PBT_CONFIG
    );
  });

  it("authorize() throws error with specific message for SUSPENDED accounts", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 30 }),
          email: fc
            .stringMatching(/^[a-z][a-z0-9]{2,10}@[a-z]{3,8}\.[a-z]{2,4}$/)
            .map((e) => e.toLowerCase()),
          name: fc.option(fc.string({ minLength: 1, maxLength: 30 }), {
            nil: null,
          }),
          password: fc.string({ minLength: 8, maxLength: 50 }),
          role: fc.constantFrom("ADMIN" as const, "USER" as const),
        }),
        async (input) => {
          vi.clearAllMocks();
          mockCheckRateLimit.mockResolvedValue({ allowed: true });

          const now = new Date();

          mockPrisma.user.findUnique.mockResolvedValueOnce({
            id: input.id,
            email: input.email,
            name: input.name,
            passwordHash: `hashed_${input.password}`,
            role: input.role,
            accountStatus: "SUSPENDED",
            createdAt: now,
            updatedAt: now,
          });

          await expect(
            authorize(input.email, input.password)
          ).rejects.toThrow(
            "Ihr Konto wurde gesperrt. Bitte wenden Sie sich an den Administrator."
          );
        }
      ),
      PBT_CONFIG
    );
  });

  it("authorize() throws error with specific message for PENDING accounts", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 30 }),
          email: fc
            .stringMatching(/^[a-z][a-z0-9]{2,10}@[a-z]{3,8}\.[a-z]{2,4}$/)
            .map((e) => e.toLowerCase()),
          name: fc.option(fc.string({ minLength: 1, maxLength: 30 }), {
            nil: null,
          }),
          password: fc.string({ minLength: 8, maxLength: 50 }),
          role: fc.constantFrom("ADMIN" as const, "USER" as const),
        }),
        async (input) => {
          vi.clearAllMocks();
          mockCheckRateLimit.mockResolvedValue({ allowed: true });

          const now = new Date();

          mockPrisma.user.findUnique.mockResolvedValueOnce({
            id: input.id,
            email: input.email,
            name: input.name,
            passwordHash: `hashed_${input.password}`,
            role: input.role,
            accountStatus: "PENDING",
            createdAt: now,
            updatedAt: now,
          });

          await expect(
            authorize(input.email, input.password)
          ).rejects.toThrow(
            "Ihr Konto wartet auf Freigabe durch einen Administrator."
          );
        }
      ),
      PBT_CONFIG
    );
  });

  it("non-ACTIVE statuses always reject login, ACTIVE always succeeds (combined property)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 30 }),
          email: fc
            .stringMatching(/^[a-z][a-z0-9]{2,10}@[a-z]{3,8}\.[a-z]{2,4}$/)
            .map((e) => e.toLowerCase()),
          name: fc.option(fc.string({ minLength: 1, maxLength: 30 }), {
            nil: null,
          }),
          password: fc.string({ minLength: 8, maxLength: 50 }),
          role: fc.constantFrom("ADMIN" as const, "USER" as const),
          accountStatus: fc.constantFrom(
            "ACTIVE" as const,
            "SUSPENDED" as const,
            "PENDING" as const
          ),
        }),
        async (input) => {
          vi.clearAllMocks();
          mockCheckRateLimit.mockResolvedValue({ allowed: true });
          mockResetAttempts.mockResolvedValue(undefined);

          const now = new Date();

          mockPrisma.user.findUnique.mockResolvedValueOnce({
            id: input.id,
            email: input.email,
            name: input.name,
            passwordHash: `hashed_${input.password}`,
            role: input.role,
            accountStatus: input.accountStatus,
            createdAt: now,
            updatedAt: now,
          });

          if (input.accountStatus === "ACTIVE") {
            const result = await authorize(input.email, input.password);
            expect(result).not.toBeNull();
            expect(result!.accountStatus).toBe("ACTIVE");
          } else if (input.accountStatus === "SUSPENDED") {
            await expect(
              authorize(input.email, input.password)
            ).rejects.toThrow(
              "Ihr Konto wurde gesperrt. Bitte wenden Sie sich an den Administrator."
            );
          } else {
            await expect(
              authorize(input.email, input.password)
            ).rejects.toThrow(
              "Ihr Konto wartet auf Freigabe durch einen Administrator."
            );
          }
        }
      ),
      PBT_CONFIG
    );
  });
});
