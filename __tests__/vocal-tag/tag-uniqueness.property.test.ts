/**
 * Property 1: Tag-Kürzel-Eindeutigkeit
 *
 * For any two attempts to create TagDefinitions with the same `tag`-Wert,
 * the second creation shall fail with HTTP 409, and the database shall
 * contain exactly one TagDefinition with that `tag`-Wert.
 *
 * **Validates: Requirements 1.2, 2.5**
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

const PBT_CONFIG = { numRuns: 100 };

// --- Mocks ---

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

import { NextRequest } from "next/server";
import { POST } from "@/app/api/tag-definitions/route";
import { prisma } from "@/lib/prisma";

const mockPrisma = vi.mocked(prisma);

const adminSession = {
  user: { id: "admin-1", email: "admin@test.com", name: "Admin", role: "ADMIN" },
};

// Generator for valid tag shortcodes: lowercase alpha start, then alphanumeric, 1-12 chars
const tagArb = fc.stringMatching(/^[a-z][a-z0-9]{0,11}$/);

// Generator for non-empty label strings
const labelArb = fc.stringMatching(/^[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß0-9 ]{0,19}$/);

// Generator for FontAwesome icon class
const iconArb = fc.constantFrom(
  "fa-microphone",
  "fa-music",
  "fa-volume-up",
  "fa-headphones",
  "fa-guitar"
);

// Generator for hex color
const colorArb = fc
  .tuple(
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 })
  )
  .map(
    ([r, g, b]) =>
      `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
  );

// Generator for indexNr
const indexNrArb = fc.integer({ min: 0, max: 999 });

function makePostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/tag-definitions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Property 1: Tag-Kürzel-Eindeutigkeit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(adminSession);
  });

  /**
   * **Validates: Requirements 1.2, 2.5**
   *
   * For any tag shortcode: first creation succeeds (201), second creation
   * with the same tag value returns HTTP 409.
   */
  it("zweite Erstellung mit gleichem tag-Wert liefert HTTP 409", () => {
    return fc.assert(
      fc.asyncProperty(
        tagArb,
        labelArb,
        iconArb,
        colorArb,
        indexNrArb,
        async (tag, label, icon, color, indexNr) => {
          vi.clearAllMocks();
          mockAuth.mockResolvedValue(adminSession);

          const createdTag = {
            id: "generated-id",
            tag,
            label,
            icon,
            color,
            indexNr,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          // First creation: tag does not exist yet
          mockPrisma.tagDefinition.findUnique.mockResolvedValueOnce(null);
          mockPrisma.tagDefinition.create.mockResolvedValueOnce(createdTag as any);

          const body = { tag, label, icon, color, indexNr };
          const firstReq = makePostRequest(body);
          const firstRes = await POST(firstReq);

          expect(firstRes.status).toBe(201);

          // Second creation: tag now exists
          mockPrisma.tagDefinition.findUnique.mockResolvedValueOnce(createdTag as any);

          const secondReq = makePostRequest(body);
          const secondRes = await POST(secondReq);

          expect(secondRes.status).toBe(409);
          const json = await secondRes.json();
          expect(json.error).toBe(
            "Ein Tag mit diesem Kürzel existiert bereits"
          );
        }
      ),
      PBT_CONFIG
    );
  });
});
