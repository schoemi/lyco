/**
 * Property 5: Generische Fehlermeldung bei fehlgeschlagenem Login
 *
 * Für jede ungültige Credential-Kombination (falsche E-Mail, falsches Passwort,
 * oder beides) muss die zurückgegebene Fehlermeldung identisch sein und darf
 * nicht preisgeben, ob die E-Mail oder das Passwort falsch war.
 *
 * **Validates: Requirements 2.2**
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

vi.mock("@/lib/services/rate-limiter", () => ({
  checkRateLimit: vi.fn(),
  recordFailedAttempt: vi.fn(),
  resetAttempts: vi.fn(),
}));

import { authorize } from "@/lib/services/auth-service";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, recordFailedAttempt } from "@/lib/services/rate-limiter";

const mockPrisma = prisma as unknown as {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
  };
};

const mockCheckRateLimit = checkRateLimit as ReturnType<typeof vi.fn>;
const mockRecordFailedAttempt = recordFailedAttempt as ReturnType<typeof vi.fn>;

describe("Property 5: Generische Fehlermeldung bei fehlgeschlagenem Login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Rate limiting always allows (not testing rate limiting here)
    mockCheckRateLimit.mockResolvedValue({ allowed: true });
    mockRecordFailedAttempt.mockResolvedValue(undefined);
  });

  it("authorize gibt null zurück für alle Fehlerszenarien – kein Unterschied ob E-Mail oder Passwort falsch", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 8, maxLength: 30 }),
        fc.constantFrom("user_not_found", "wrong_password", "both_wrong"),
        async (email, password, scenario) => {
          vi.clearAllMocks();
          mockCheckRateLimit.mockResolvedValue({ allowed: true });
          mockRecordFailedAttempt.mockResolvedValue(undefined);

          if (scenario === "user_not_found") {
            // E-Mail existiert nicht in der DB
            mockPrisma.user.findUnique.mockResolvedValue(null);
          } else if (scenario === "wrong_password") {
            // User existiert, aber Passwort ist falsch
            // bcrypt.compare will return false for mismatched password/hash
            mockPrisma.user.findUnique.mockResolvedValue({
              id: "user-1",
              email,
              name: "Test User",
              role: "USER",
              passwordHash: "$2b$12$invalidhashthatshouldnotmatch000000000000000000",
            });
          } else {
            // Beide falsch: E-Mail existiert nicht
            mockPrisma.user.findUnique.mockResolvedValue(null);
          }

          const resultForScenario = await authorize(email, password);

          // In ALL failure scenarios, authorize must return null
          // No different error types, no information leakage
          expect(resultForScenario).toBeNull();
        }
      ),
      { numRuns: 20 }
    );
  });

  it("alle drei Fehlerszenarien liefern exakt denselben Rückgabewert (null)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 8, maxLength: 30 }),
        async (email, password) => {
          // Scenario 1: User not found
          vi.clearAllMocks();
          mockCheckRateLimit.mockResolvedValue({ allowed: true });
          mockRecordFailedAttempt.mockResolvedValue(undefined);
          mockPrisma.user.findUnique.mockResolvedValue(null);
          const resultNoUser = await authorize(email, password);

          // Scenario 2: Wrong password
          vi.clearAllMocks();
          mockCheckRateLimit.mockResolvedValue({ allowed: true });
          mockRecordFailedAttempt.mockResolvedValue(undefined);
          mockPrisma.user.findUnique.mockResolvedValue({
            id: "user-1",
            email,
            name: "Test User",
            role: "USER",
            passwordHash: "$2b$12$invalidhashthatshouldnotmatch000000000000000000",
          });
          const resultWrongPw = await authorize(email, password);

          // Scenario 3: Both wrong (different email, wrong password)
          vi.clearAllMocks();
          mockCheckRateLimit.mockResolvedValue({ allowed: true });
          mockRecordFailedAttempt.mockResolvedValue(undefined);
          mockPrisma.user.findUnique.mockResolvedValue(null);
          const resultBothWrong = await authorize("nonexistent@example.com", password);

          // All three must return the exact same value: null
          expect(resultNoUser).toBeNull();
          expect(resultWrongPw).toBeNull();
          expect(resultBothWrong).toBeNull();

          // Verify they are strictly equal (same type, same value)
          expect(resultNoUser).toStrictEqual(resultWrongPw);
          expect(resultWrongPw).toStrictEqual(resultBothWrong);
        }
      ),
      { numRuns: 20 }
    );
  });
});
