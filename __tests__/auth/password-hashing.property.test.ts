/**
 * Property 4: Passwort-Hashing-Integrität
 *
 * Für jedes generierte Passwort: `hashPassword` erzeugt gültigen bcrypt-Hash,
 * `verifyPassword(original, hash)` gibt `true` zurück.
 *
 * **Validates: Requirements 1.4**
 */
import { describe, it, expect, vi } from "vitest";
import fc from "fast-check";

// Mock Prisma and rate-limiter to avoid DB connections
vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));
vi.mock("@/lib/services/rate-limiter", () => ({
  checkRateLimit: vi.fn(),
  recordFailedAttempt: vi.fn(),
  resetAttempts: vi.fn(),
}));

import { hashPassword, verifyPassword } from "@/lib/services/auth-service";

describe("Property 4: Passwort-Hashing-Integrität", () => {
  it("hashPassword erzeugt gültigen bcrypt-Hash und verifyPassword bestätigt das Original", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 72 }),
        async (password) => {
          const hash = await hashPassword(password);

          // Hash must be a valid bcrypt hash (starts with $2b$ or $2a$)
          expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/);

          // Verifying the original password against the hash must return true
          const isValid = await verifyPassword(password, hash);
          expect(isValid).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  });

  it("verifyPassword gibt false zurück für ein anderes Passwort", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 72 }),
        fc.string({ minLength: 1, maxLength: 72 }),
        async (password, otherPassword) => {
          // Only test when passwords are actually different
          fc.pre(password !== otherPassword);

          const hash = await hashPassword(password);

          // A different password must not verify against the hash
          const isValid = await verifyPassword(otherPassword, hash);
          expect(isValid).toBe(false);
        }
      ),
      { numRuns: 20 }
    );
  });
});
