/**
 * Property-based tests for SSO Admin Settings Access Control
 *
 * Tests that only users with ADMIN role can read or modify the
 * "auto-create accounts on SSO" setting. All other roles are denied.
 *
 * Feature: login-enhancements
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock system-setting-service
const mockGetSsoAutoCreateAccounts = vi.fn();
const mockSetSsoAutoCreateAccounts = vi.fn();
vi.mock("@/lib/services/system-setting-service", () => ({
  getSsoAutoCreateAccounts: (...args: unknown[]) => mockGetSsoAutoCreateAccounts(...args),
  setSsoAutoCreateAccounts: (...args: unknown[]) => mockSetSsoAutoCreateAccounts(...args),
}));

// Mock log-service (fire-and-forget)
vi.mock("@/lib/services/log-service", () => ({
  logAudit: vi.fn(),
  SETTING_CHANGED: "SETTING_CHANGED",
}));

import { GET, PUT } from "@/app/api/settings/sso/route";

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const userIdArb = fc.uuid();
const emailArb = fc.emailAddress();
const nameArb = fc.string({ minLength: 1, maxLength: 50 });

/** Non-ADMIN roles that should be denied access */
const nonAdminRoleArb = fc.constantFrom("USER", "MODERATOR", "VIEWER", "EDITOR");

/** Any boolean value for the auto-create setting */
const booleanArb = fc.boolean();

/**
 * Generate a session object for a user with a specific role.
 */
function makeSession(role: string, userId: string, email: string, name: string) {
  return {
    user: { id: userId, email, name, role },
  };
}

/**
 * Create a PUT request with a JSON body.
 */
function makePutRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/settings/sso", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Feature: login-enhancements, Property 19: Admin-only access to SSO auto-create setting
// ---------------------------------------------------------------------------
describe("Property 19: Admin-only access to SSO auto-create setting", () => {
  // Feature: login-enhancements, Property 19: For any user attempting to read or modify the
  // "auto-create accounts on SSO" setting, the operation succeeds only if the user has ADMIN role;
  // all other roles are denied.

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSsoAutoCreateAccounts.mockResolvedValue(false);
    mockSetSsoAutoCreateAccounts.mockResolvedValue(undefined);
  });

  describe("GET - Read access", () => {
    it("ADMIN role can always read the SSO auto-create setting", async () => {
      // **Validates: Requirements 5.1**
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          emailArb,
          nameArb,
          booleanArb,
          async (userId, email, name, currentValue) => {
            vi.clearAllMocks();
            mockGetSsoAutoCreateAccounts.mockResolvedValue(currentValue);
            mockAuth.mockResolvedValue(makeSession("ADMIN", userId, email, name));

            const res = await GET();
            expect(res.status).toBe(200);

            const json = await res.json();
            expect(json.autoCreateAccounts).toBe(currentValue);
          }
        ),
        { numRuns: 20 }
      );
    });

    it("non-ADMIN roles are always denied read access (403)", async () => {
      // **Validates: Requirements 5.1**
      await fc.assert(
        fc.asyncProperty(
          nonAdminRoleArb,
          userIdArb,
          emailArb,
          nameArb,
          async (role, userId, email, name) => {
            vi.clearAllMocks();
            mockAuth.mockResolvedValue(makeSession(role, userId, email, name));

            const res = await GET();
            expect(res.status).toBe(403);
          }
        ),
        { numRuns: 20 }
      );
    });

    it("unauthenticated users are denied read access (401)", async () => {
      // **Validates: Requirements 5.1**
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null),
          async () => {
            vi.clearAllMocks();
            mockAuth.mockResolvedValue(null);

            const res = await GET();
            expect(res.status).toBe(401);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe("PUT - Write access", () => {
    it("ADMIN role can always modify the SSO auto-create setting", async () => {
      // **Validates: Requirements 5.1**
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          emailArb,
          nameArb,
          booleanArb,
          async (userId, email, name, newValue) => {
            vi.clearAllMocks();
            mockSetSsoAutoCreateAccounts.mockResolvedValue(undefined);
            mockAuth.mockResolvedValue(makeSession("ADMIN", userId, email, name));

            const req = makePutRequest({ autoCreateAccounts: newValue });
            const res = await PUT(req);
            expect(res.status).toBe(200);

            const json = await res.json();
            expect(json.autoCreateAccounts).toBe(newValue);
            expect(mockSetSsoAutoCreateAccounts).toHaveBeenCalledWith(newValue);
          }
        ),
        { numRuns: 20 }
      );
    });

    it("non-ADMIN roles are always denied write access (403)", async () => {
      // **Validates: Requirements 5.1**
      await fc.assert(
        fc.asyncProperty(
          nonAdminRoleArb,
          userIdArb,
          emailArb,
          nameArb,
          booleanArb,
          async (role, userId, email, name, newValue) => {
            vi.clearAllMocks();
            mockAuth.mockResolvedValue(makeSession(role, userId, email, name));

            const req = makePutRequest({ autoCreateAccounts: newValue });
            const res = await PUT(req);
            expect(res.status).toBe(403);

            // The setting should NOT have been modified
            expect(mockSetSsoAutoCreateAccounts).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 20 }
      );
    });

    it("unauthenticated users are denied write access (401)", async () => {
      // **Validates: Requirements 5.1**
      await fc.assert(
        fc.asyncProperty(
          booleanArb,
          async (newValue) => {
            vi.clearAllMocks();
            mockAuth.mockResolvedValue(null);

            const req = makePutRequest({ autoCreateAccounts: newValue });
            const res = await PUT(req);
            expect(res.status).toBe(401);

            // The setting should NOT have been modified
            expect(mockSetSsoAutoCreateAccounts).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe("Access control invariant", () => {
    it("for any user with any role, only ADMIN succeeds on both GET and PUT", async () => {
      // **Validates: Requirements 5.1**
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom("ADMIN", "USER", "MODERATOR", "VIEWER", "EDITOR"),
          userIdArb,
          emailArb,
          nameArb,
          booleanArb,
          async (role, userId, email, name, value) => {
            vi.clearAllMocks();
            mockGetSsoAutoCreateAccounts.mockResolvedValue(value);
            mockSetSsoAutoCreateAccounts.mockResolvedValue(undefined);
            mockAuth.mockResolvedValue(makeSession(role, userId, email, name));

            const getRes = await GET();
            const putReq = makePutRequest({ autoCreateAccounts: value });
            const putRes = await PUT(putReq);

            if (role === "ADMIN") {
              expect(getRes.status).toBe(200);
              expect(putRes.status).toBe(200);
            } else {
              expect(getRes.status).toBe(403);
              expect(putRes.status).toBe(403);
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
