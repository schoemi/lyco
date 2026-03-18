/**
 * Property 2: Nur ADMIN-Rolle kann Tag-Definitionen mutieren
 *
 * For any HTTP request to a mutation endpoint (POST, PUT, DELETE on
 * `/api/tag-definitions`) with a user role other than ADMIN, the API
 * shall return HTTP 403 and the database state shall remain unchanged.
 *
 * **Validates: Requirements 1.4**
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
      update: vi.fn(),
      delete: vi.fn(),
    },
    zeile: {
      findMany: vi.fn(),
    },
  },
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/tag-definitions/route";
import { PUT, DELETE } from "@/app/api/tag-definitions/[id]/route";
import { prisma } from "@/lib/prisma";

const mockPrisma = vi.mocked(prisma);

// Generator for non-ADMIN roles
const nonAdminRoleArb = fc.constantFrom("USER", "MODERATOR", "VIEWER", "EDITOR", "GUEST");

// Generator for user IDs
const userIdArb = fc.stringMatching(/^user-[a-z0-9]{1,8}$/);

// Generator for email addresses
const emailArb = fc.stringMatching(/^[a-z]{1,8}@test\.com$/);

// Generator for user names
const nameArb = fc.stringMatching(/^[A-Z][a-z]{1,9}$/);

// Generator for valid tag shortcodes
const tagArb = fc.stringMatching(/^[a-z][a-z0-9]{0,11}$/);

// Generator for non-empty label strings
const labelArb = fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,19}$/);

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

// Generator for cuid-like IDs
const idArb = fc.stringMatching(/^[a-z0-9]{8,16}$/);

// Generator for a non-admin session
const nonAdminSessionArb = fc.record({
  role: nonAdminRoleArb,
  userId: userIdArb,
  email: emailArb,
  name: nameArb,
}).map(({ role, userId, email, name }) => ({
  user: { id: userId, email, name, role },
}));

// Generator for a valid tag definition body
const tagBodyArb = fc.record({
  tag: tagArb,
  label: labelArb,
  icon: iconArb,
  color: colorArb,
  indexNr: indexNrArb,
});

function makePostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/tag-definitions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makePutRequest(id: string, body: Record<string, unknown>): NextRequest {
  return new NextRequest(`http://localhost/api/tag-definitions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(id: string): NextRequest {
  return new NextRequest(`http://localhost/api/tag-definitions/${id}`, {
    method: "DELETE",
  });
}

describe("Property 2: Nur ADMIN-Rolle kann Tag-Definitionen mutieren", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * **Validates: Requirements 1.4**
   *
   * For any non-ADMIN role and valid POST body: HTTP 403 is returned
   * and no database write occurs.
   */
  it("POST mit nicht-ADMIN-Rolle liefert HTTP 403", () => {
    return fc.assert(
      fc.asyncProperty(
        nonAdminSessionArb,
        tagBodyArb,
        async (session, body) => {
          vi.clearAllMocks();
          mockAuth.mockResolvedValue(session);

          const req = makePostRequest(body);
          const res = await POST(req);

          expect(res.status).toBe(403);
          const json = await res.json();
          expect(json.error).toBe("Keine Berechtigung");

          // Database must not be touched
          expect(mockPrisma.tagDefinition.create).not.toHaveBeenCalled();
          expect(mockPrisma.tagDefinition.findUnique).not.toHaveBeenCalled();
        }
      ),
      PBT_CONFIG
    );
  });

  /**
   * **Validates: Requirements 1.4**
   *
   * For any non-ADMIN role and valid PUT body: HTTP 403 is returned
   * and no database write occurs.
   */
  it("PUT mit nicht-ADMIN-Rolle liefert HTTP 403", () => {
    return fc.assert(
      fc.asyncProperty(
        nonAdminSessionArb,
        idArb,
        tagBodyArb,
        async (session, id, body) => {
          vi.clearAllMocks();
          mockAuth.mockResolvedValue(session);

          const req = makePutRequest(id, body);
          const params = Promise.resolve({ id });
          const res = await PUT(req, { params });

          expect(res.status).toBe(403);
          const json = await res.json();
          expect(json.error).toBe("Keine Berechtigung");

          // Database must not be touched
          expect(mockPrisma.tagDefinition.update).not.toHaveBeenCalled();
        }
      ),
      PBT_CONFIG
    );
  });

  /**
   * **Validates: Requirements 1.4**
   *
   * For any non-ADMIN role and any tag ID: DELETE returns HTTP 403
   * and no database write occurs.
   */
  it("DELETE mit nicht-ADMIN-Rolle liefert HTTP 403", () => {
    return fc.assert(
      fc.asyncProperty(
        nonAdminSessionArb,
        idArb,
        async (session, id) => {
          vi.clearAllMocks();
          mockAuth.mockResolvedValue(session);

          const req = makeDeleteRequest(id);
          const params = Promise.resolve({ id });
          const res = await DELETE(req, { params });

          expect(res.status).toBe(403);
          const json = await res.json();
          expect(json.error).toBe("Keine Berechtigung");

          // Database must not be touched
          expect(mockPrisma.tagDefinition.delete).not.toHaveBeenCalled();
        }
      ),
      PBT_CONFIG
    );
  });
});
