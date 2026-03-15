/**
 * Property 3: E-Mail-Uniqueness
 *
 * Für jede bereits existierende E-Mail: Erstellung eines weiteren Benutzers
 * mit derselben E-Mail wird abgelehnt.
 *
 * **Validates: Requirements 1.2, 5.6**
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

// Mock Prisma client
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock auth-service for hashPassword
vi.mock("@/lib/services/auth-service", () => ({
  hashPassword: vi.fn().mockResolvedValue("$2b$12$mockedhashvalue"),
}));

import { prisma } from "@/lib/prisma";
import { createUser } from "@/lib/services/user-service";

const mockedFindUnique = vi.mocked(prisma.user.findUnique);

// Generator for valid email addresses
const emailArb = fc
  .tuple(
    fc.stringMatching(/^[a-z][a-z0-9]{0,9}$/),
    fc.stringMatching(/^[a-z][a-z0-9]{0,5}$/),
    fc.constantFrom("com", "de", "org", "net")
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

describe("Property 3: E-Mail-Uniqueness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Erstellung eines Benutzers mit bereits existierender E-Mail wird abgelehnt", () => {
    return fc.assert(
      fc.asyncProperty(emailArb, async (email) => {
        // Simulate that the email already exists in the database
        mockedFindUnique.mockResolvedValueOnce({
          id: "existing-user-id",
          email,
          name: "Existing User",
          passwordHash: "$2b$12$existinghash",
          role: "USER",
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Attempt to create a user with the same email must throw
        await expect(
          createUser({
            email,
            name: "New User",
            password: "securepassword123",
            role: "USER",
          })
        ).rejects.toThrow("E-Mail bereits vergeben");
      }),
      { numRuns: 20 }
    );
  });
});
