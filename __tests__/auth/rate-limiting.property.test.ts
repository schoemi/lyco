/**
 * Property 6: Rate-Limiting bei Login-Versuchen
 *
 * Für jede E-Mail-Adresse gilt: Wenn innerhalb von 15 Minuten 5 oder mehr
 * fehlgeschlagene Login-Versuche aufgezeichnet wurden, muss jeder weitere
 * Login-Versuch blockiert werden.
 *
 * **Validates: Requirements 2.4**
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    loginAttempt: {
      count: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

import { checkRateLimit } from "@/lib/services/rate-limiter";
import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  loginAttempt: {
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
  };
};

describe("Property 6: Rate-Limiting bei Login-Versuchen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("nach 5+ fehlgeschlagenen Versuchen wird blockiert, unter 5 wird erlaubt", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 10 }),
        fc.emailAddress(),
        async (attemptCount, email) => {
          mockPrisma.loginAttempt.count.mockResolvedValue(attemptCount);
          mockPrisma.loginAttempt.findFirst.mockResolvedValue({
            createdAt: new Date(),
          });

          const result = await checkRateLimit(email);

          if (attemptCount < 5) {
            expect(result.allowed).toBe(true);
          } else {
            expect(result.allowed).toBe(false);
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});
