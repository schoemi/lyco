import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

/**
 * Bug Condition Exploration Test
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2
 *
 * This test explores the bug where POST /api/tag-definitions returns HTTP 500
 * instead of the expected status code. The PrismaPg adapter can throw non-Error
 * objects that bypass the `error instanceof Error` check in the route handler.
 *
 * EXPECTED: These tests FAIL on unfixed code, confirming the bug exists.
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

const adminSession = {
  user: { id: "admin-1", email: "admin@test.com", name: "Admin", role: "ADMIN" },
};

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
const labelArb = fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0);

/** Generates a FontAwesome icon class with a space (e.g. "fa-solid fa-star") */
const iconArb = fc.tuple(
  fc.constantFrom("fa-solid", "fa-regular", "fa-brands"),
  fc.constantFrom("fa-star", "fa-microphone", "fa-music", "fa-wave-square", "fa-volume-high", "fa-guitar"),
).map(([prefix, icon]) => `${prefix} ${icon}`);

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

// --- Tests ---

describe("Bug Condition Exploration: POST /api/tag-definitions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(adminSession);
  });

  it(
    "Property 1a (Happy Path): POST with valid tag data returns HTTP 201 when create succeeds",
    async () => {
      await fc.assert(
        fc.asyncProperty(validTagInputArb, async (input) => {
          // Mock: no duplicate exists, create succeeds
          mockPrisma.tagDefinition.findUnique.mockResolvedValue(null);
          mockPrisma.tagDefinition.create.mockResolvedValue({
            id: "generated-id",
            tag: input.tag,
            label: input.label,
            icon: input.icon,
            color: input.color,
            indexNr: input.indexNr,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          const req = makePostRequest(input);
          const res = await POST(req);
          const json = await res.json();

          // Should return 201 with the created definition
          expect(res.status).toBe(201);
          expect(json.definition).toBeDefined();
          expect(json.definition.id).toBe("generated-id");
          expect(json.definition.tag).toBe(input.tag);
          expect(json.definition.label).toBe(input.label);
          expect(json.definition.icon).toBe(input.icon);
          expect(json.definition.color).toBe(input.color);
          expect(json.definition.indexNr).toBe(input.indexNr);
        }),
        { numRuns: 100 },
      );
    },
  );

  it(
    "Property 1b (Bug Condition): POST returns HTTP 409 when create throws non-Error duplicate object",
    async () => {
      /**
       * **Validates: Requirements 1.2, 1.3**
       *
       * The PrismaPg adapter can throw plain objects (not Error instances).
       * When the thrown object has a message matching the duplicate error,
       * the handler should return 409, not 500.
       *
       * On UNFIXED code, `error instanceof Error` returns false for plain objects,
       * so the duplicate check is skipped and the handler returns 500.
       */
      await fc.assert(
        fc.asyncProperty(validTagInputArb, async (input) => {
          // Mock: findUnique returns null (no pre-check duplicate),
          // but create throws a non-Error object simulating PrismaPg adapter behavior
          mockPrisma.tagDefinition.findUnique.mockResolvedValue(null);
          // eslint-disable-next-line prefer-promise-reject-errors
          mockPrisma.tagDefinition.create.mockRejectedValue({
            message: "Ein Tag mit diesem Kürzel existiert bereits",
          });

          const req = makePostRequest(input);
          const res = await POST(req);

          // Expected: 409 (duplicate detected via error message)
          // Actual on unfixed code: 500 (because instanceof Error fails)
          expect(res.status).toBe(409);
        }),
        { numRuns: 100 },
      );
    },
  );
});
