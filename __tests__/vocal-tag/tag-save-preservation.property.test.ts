import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

/**
 * Preservation Property Tests
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4
 *
 * These tests capture the EXISTING correct behavior of the POST /api/tag-definitions
 * endpoint that must be preserved after the bugfix. They verify auth checks,
 * validation, and duplicate detection work correctly on the UNFIXED code.
 *
 * ALL tests here MUST PASS on unfixed code.
 */

// --- Mocks (must be before imports) ---

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tagDefinition: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { POST } from "@/app/api/tag-definitions/route";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

const mockPrisma = vi.mocked(prisma);

// --- Helpers ---

function makePostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/tag-definitions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// --- Generators ---

/** Generates a lowercase alphanumeric tag string (1-20 chars) */
const tagArb = fc.stringMatching(/^[a-z0-9]{1,20}$/);

/** Generates a non-empty label string */
const labelArb = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => s.trim().length > 0);

/** Generates a FontAwesome icon class with a space */
const iconArb = fc
  .tuple(
    fc.constantFrom("fa-solid", "fa-regular", "fa-brands"),
    fc.constantFrom(
      "fa-star",
      "fa-microphone",
      "fa-music",
      "fa-wave-square",
      "fa-volume-high",
      "fa-guitar"
    )
  )
  .map(([prefix, icon]) => `${prefix} ${icon}`);

/** Generates a hex color string like "#ab12ef" */
const colorArb = fc.stringMatching(/^#[0-9a-f]{6}$/);

/** Generates a non-negative integer for indexNr */
const indexNrArb = fc.nat({ max: 999 });

/** Generates a complete valid CreateTagDefinitionInput */
const validTagInputArb = fc.record({
  tag: tagArb,
  label: labelArb,
  icon: iconArb,
  color: colorArb,
  indexNr: indexNrArb,
});

/** Generates a random non-ADMIN role */
const nonAdminRoleArb = fc.constantFrom("USER");

/** Generates a random user session with a given role */
const userSessionArb = (role: string) =>
  fc.record({
    user: fc.record({
      id: fc.constant("user-1"),
      email: fc.constant("user@test.com"),
      name: fc.constant("User"),
      role: fc.constant(role),
    }),
  });

// --- Tests ---

describe("Preservation: POST /api/tag-definitions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it(
    "Property 2a: For all non-authenticated sessions, POST returns 401",
    async () => {
      /**
       * **Validates: Requirements 3.1**
       *
       * Unauthenticated requests (auth returns null) must always get HTTP 401.
       */
      await fc.assert(
        fc.asyncProperty(validTagInputArb, async (input) => {
          mockAuth.mockResolvedValue(null);

          const req = makePostRequest(input);
          const res = await POST(req);
          const json = await res.json();

          expect(res.status).toBe(401);
          expect(json.error).toBe("Nicht authentifiziert");

          // Verify no DB writes occurred
          expect(mockPrisma.tagDefinition.findUnique).not.toHaveBeenCalled();
          expect(mockPrisma.tagDefinition.create).not.toHaveBeenCalled();
        }),
        { numRuns: 100 }
      );
    }
  );

  it(
    "Property 2b: For all non-ADMIN roles with valid body, POST returns 403 with no DB writes",
    async () => {
      /**
       * **Validates: Requirements 3.2**
       *
       * Users with non-ADMIN roles must always get HTTP 403.
       */
      await fc.assert(
        fc.asyncProperty(
          validTagInputArb,
          nonAdminRoleArb,
          async (input, role) => {
            mockAuth.mockResolvedValue({
              user: {
                id: "user-1",
                email: "user@test.com",
                name: "User",
                role,
              },
            });

            const req = makePostRequest(input);
            const res = await POST(req);
            const json = await res.json();

            expect(res.status).toBe(403);
            expect(json.error).toBe("Keine Berechtigung");

            // Verify no DB writes occurred
            expect(mockPrisma.tagDefinition.findUnique).not.toHaveBeenCalled();
            expect(mockPrisma.tagDefinition.create).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    "Property 2c: For all bodies missing at least one required field, POST returns 400",
    async () => {
      /**
       * **Validates: Requirements 3.3**
       *
       * When any required field (tag, label, icon, color, indexNr) is missing
       * or empty, the handler must return HTTP 400 with a field-specific error.
       */
      const requiredFields = ["tag", "label", "icon", "color", "indexNr"] as const;

      const adminSession = {
        user: {
          id: "admin-1",
          email: "admin@test.com",
          name: "Admin",
          role: "ADMIN",
        },
      };

      // Generator: pick a random subset of fields to remove (at least one)
      const missingFieldArb = fc
        .subarray([...requiredFields], { minLength: 1 })
        .chain((fieldsToRemove) =>
          validTagInputArb.map((input) => {
            const body: Record<string, unknown> = { ...input };
            for (const field of fieldsToRemove) {
              // Randomly either delete the field or set it to empty string/null
              delete body[field];
            }
            // Return the first removed field (the handler checks in order)
            return { body, firstMissing: fieldsToRemove[0] };
          })
        );

      await fc.assert(
        fc.asyncProperty(missingFieldArb, async ({ body, firstMissing }) => {
          mockAuth.mockResolvedValue(adminSession);

          const req = makePostRequest(body);
          const res = await POST(req);
          const json = await res.json();

          expect(res.status).toBe(400);
          // The handler checks fields in order: tag, label, icon, color, indexNr
          // The first missing field in that order determines the error message
          const orderedFields = [...requiredFields];
          const firstMissingInOrder = orderedFields.find(
            (f) =>
              body[f] === undefined || body[f] === null || body[f] === ""
          );
          expect(json.error).toBe(
            `Feld '${firstMissingInOrder}' ist erforderlich`
          );

          // Verify no DB writes occurred
          expect(mockPrisma.tagDefinition.create).not.toHaveBeenCalled();
        }),
        { numRuns: 100 }
      );
    }
  );

  it(
    "Property 2d: For all duplicate tags (service throws standard Error), POST returns 409",
    async () => {
      /**
       * **Validates: Requirements 3.4**
       *
       * When the service throws a standard Error with the duplicate message,
       * the handler must return HTTP 409. This tests the EXISTING behavior
       * where `error instanceof Error` is true (standard Error objects).
       */
      const adminSession = {
        user: {
          id: "admin-1",
          email: "admin@test.com",
          name: "Admin",
          role: "ADMIN",
        },
      };

      await fc.assert(
        fc.asyncProperty(validTagInputArb, async (input) => {
          mockAuth.mockResolvedValue(adminSession);

          // Mock: findUnique returns an existing record (duplicate detected by service)
          mockPrisma.tagDefinition.findUnique.mockResolvedValue({
            id: "existing-id",
            tag: input.tag,
            label: "Existing",
            icon: "fa-solid fa-star",
            color: "#000000",
            indexNr: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          const req = makePostRequest(input);
          const res = await POST(req);
          const json = await res.json();

          expect(res.status).toBe(409);
          expect(json.error).toBe(
            "Ein Tag mit diesem Kürzel existiert bereits"
          );

          // Verify create was never called (duplicate detected before create)
          expect(mockPrisma.tagDefinition.create).not.toHaveBeenCalled();
        }),
        { numRuns: 100 }
      );
    }
  );
});
