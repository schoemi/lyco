import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import { NextRequest } from "next/server";

/**
 * Property 14: Setup-Endpunkt-Verfügbarkeit
 *
 * Für jeden Datenbankzustand gilt: Der Setup-Endpunkt muss genau dann verfügbar sein (HTTP 200),
 * wenn kein Benutzer mit der Rolle "ADMIN" in der Datenbank existiert. Existiert mindestens ein Admin,
 * muss der Setup-Endpunkt den Zugriff verweigern (Redirect auf Login).
 *
 * **Validates: Requirements 8.1, 8.3**
 */

// Mock setup-service before imports
vi.mock("@/lib/services/setup-service", () => ({
  isSetupRequired: vi.fn(),
  createInitialAdmin: vi.fn(),
}));

import { isSetupRequired, createInitialAdmin } from "@/lib/services/setup-service";
import { GET } from "@/app/api/setup/status/route";
import { POST } from "@/app/api/setup/route";

const mockIsSetupRequired = vi.mocked(isSetupRequired);
const mockCreateInitialAdmin = vi.mocked(createInitialAdmin);

function createPostRequest(body: Record<string, unknown>, url = "http://localhost:3000/api/setup") {
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validSetupBody = {
  email: "admin@example.com",
  name: "Admin User",
  password: "securepassword123",
};

const createdAdmin = {
  id: "cuid-admin",
  email: "admin@example.com",
  name: "Admin User",
  role: "ADMIN" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("Property 14: Setup-Endpunkt-Verfügbarkeit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/setup/status returns { required: true } when no admin exists (adminCount === 0)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(0),
        async (_adminCount) => {
          // No admin exists → setup is required
          mockIsSetupRequired.mockResolvedValue(true);

          const response = await GET();
          const data = await response.json();

          expect(response.status).toBe(200);
          expect(data).toEqual({ required: true });
        }
      ),
      { numRuns: 20 }
    );
  });

  it("GET /api/setup/status returns { required: false } when admin exists (adminCount >= 1)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 100 }),
        async (_adminCount) => {
          // At least one admin exists → setup is not required
          mockIsSetupRequired.mockResolvedValue(false);

          const response = await GET();
          const data = await response.json();

          expect(response.status).toBe(200);
          expect(data).toEqual({ required: false });
        }
      ),
      { numRuns: 20 }
    );
  });

  it("POST /api/setup accepts request when no admin exists (adminCount === 0)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(0),
        async (_adminCount) => {
          // No admin → setup required, POST should succeed
          mockIsSetupRequired.mockResolvedValue(true);
          mockCreateInitialAdmin.mockResolvedValue(createdAdmin);

          const request = createPostRequest(validSetupBody);
          const response = await POST(request);

          // Should NOT redirect — should accept the request (201 Created)
          expect(response.status).toBe(201);
          expect(response.headers.get("location")).toBeNull();
        }
      ),
      { numRuns: 20 }
    );
  });

  it("POST /api/setup redirects to /login when admin exists (adminCount >= 1)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 100 }),
        async (_adminCount) => {
          // Admin exists → setup not required, POST should redirect
          mockIsSetupRequired.mockResolvedValue(false);

          const request = createPostRequest(validSetupBody);
          const response = await POST(request);

          expect(response.status).toBe(302);
          expect(response.headers.get("location")).toContain("/login");
        }
      ),
      { numRuns: 20 }
    );
  });
});
