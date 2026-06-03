import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

/**
 * Property-Based Tests für den UnlinkHandler
 * DELETE /api/auth/sso/unlink
 *
 * Property 8: Unlink entfernt alle SsoAccounts des Users
 *
 * For any userId with one or more `SsoAccount` entries, calling the unlink
 * handler SHALL result in zero `SsoAccount` entries for that userId in the
 * database. The accounts of other users SHALL remain unaffected.
 *
 * **Validates: Requirements 3.1**
 */

// ---------------------------------------------------------------------------
// Mocks — müssen vor allen Importen stehen
// ---------------------------------------------------------------------------

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

const mockCount = vi.fn();
const mockFindMany = vi.fn();
const mockDeleteMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ssoAccount: {
      count: (...args: unknown[]) => mockCount(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
      deleteMany: (...args: unknown[]) => mockDeleteMany(...args),
    },
  },
}));

const mockLogAudit = vi.fn();
vi.mock("@/lib/services/log-service", () => ({
  logAudit: (...args: unknown[]) => mockLogAudit(...args),
  SSO_UNLINK_SUCCESS: "SSO_UNLINK_SUCCESS",
}));

import { DELETE } from "@/app/api/auth/sso/unlink/route";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Builds a session fixture for a given userId. */
function makeSession(userId: string) {
  return { user: { id: userId } };
}

/** Builds a list of SsoAccount fixtures for a given userId and providers. */
function makeSsoAccounts(userId: string, providers: string[]) {
  return providers.map((provider, idx) => ({
    id: `account-${userId}-${idx}`,
    userId,
    provider,
    providerAccountId: `sub-${userId}-${idx}`,
    createdAt: new Date(),
  }));
}

const PBT_CONFIG = { numRuns: 100 };

// ---------------------------------------------------------------------------
// Property 8: Unlink entfernt alle SsoAccounts des Users
// ---------------------------------------------------------------------------
describe("Property 8: Unlink entfernt alle SsoAccounts des Users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 8a: For any authenticated userId with 1+ SsoAccount entries,
   * deleteMany MUST be called exactly once with `where: { userId }`.
   */
  it("8a: deleteMany wird genau einmal mit where: { userId } aufgerufen", async () => {
    await fc.assert(
      fc.asyncProperty(
        // userId: non-empty string
        fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length > 0),
        // accountCount: 1..5
        fc.integer({ min: 1, max: 5 }),
        async (userId, accountCount) => {
          vi.clearAllMocks();

          const providers = Array.from(
            { length: accountCount },
            (_, i) => `provider-${i}`
          );

          mockAuth.mockResolvedValue(makeSession(userId));
          mockCount.mockResolvedValue(accountCount);
          mockFindMany.mockResolvedValue(makeSsoAccounts(userId, providers));
          mockDeleteMany.mockResolvedValue({ count: accountCount });
          mockLogAudit.mockResolvedValue(undefined);

          await DELETE();

          // deleteMany must have been called exactly once
          expect(mockDeleteMany).toHaveBeenCalledTimes(1);

          // It must be called with where: { userId } — scoped to this user only
          expect(mockDeleteMany).toHaveBeenCalledWith({ where: { userId } });
        }
      ),
      PBT_CONFIG
    );
  });

  /**
   * 8b: The response for a successful unlink is 200 with { unlinked: true }.
   */
  it("8b: Antwort ist 200 mit { unlinked: true } nach erfolgreichem Unlink", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length > 0),
        fc.integer({ min: 1, max: 5 }),
        async (userId, accountCount) => {
          vi.clearAllMocks();

          const providers = Array.from(
            { length: accountCount },
            (_, i) => `provider-${i}`
          );

          mockAuth.mockResolvedValue(makeSession(userId));
          mockCount.mockResolvedValue(accountCount);
          mockFindMany.mockResolvedValue(makeSsoAccounts(userId, providers));
          mockDeleteMany.mockResolvedValue({ count: accountCount });
          mockLogAudit.mockResolvedValue(undefined);

          const response = await DELETE();

          expect(response.status).toBe(200);
          const body = await response.json();
          expect(body).toEqual({ unlinked: true });
        }
      ),
      PBT_CONFIG
    );
  });

  /**
   * 8c: deleteMany is only called with the requesting user's userId —
   * other users' accounts are never touched (scope isolation).
   *
   * Verifies that the where-clause in deleteMany never contains a different userId.
   */
  it("8c: deleteMany enthält ausschließlich die userId des anfragenden Users — andere User werden nicht berührt", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Two distinct userIds
        fc
          .tuple(
            fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length > 0),
            fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length > 0)
          )
          .filter(([a, b]) => a !== b),
        fc.integer({ min: 1, max: 5 }),
        async ([userId, otherUserId], accountCount) => {
          vi.clearAllMocks();

          const providers = Array.from(
            { length: accountCount },
            (_, i) => `provider-${i}`
          );

          // Only userId A is authenticated and triggers the unlink
          mockAuth.mockResolvedValue(makeSession(userId));
          mockCount.mockResolvedValue(accountCount);
          mockFindMany.mockResolvedValue(makeSsoAccounts(userId, providers));
          mockDeleteMany.mockResolvedValue({ count: accountCount });
          mockLogAudit.mockResolvedValue(undefined);

          await DELETE();

          // Verify every deleteMany call uses the correct userId
          for (const call of mockDeleteMany.mock.calls) {
            const whereClause = call[0]?.where;
            // The where-clause must reference the requesting user's userId
            expect(whereClause?.userId).toBe(userId);
            // And must NOT reference the other user's id
            expect(whereClause?.userId).not.toBe(otherUserId);
          }
        }
      ),
      PBT_CONFIG
    );
  });

  /**
   * 8d: When a user has no SsoAccount entries (count = 0),
   * the handler returns 404 and deleteMany is NOT called.
   */
  it("8d: Bei count=0 wird 404 zurückgegeben und deleteMany nicht aufgerufen", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length > 0),
        async (userId) => {
          vi.clearAllMocks();

          mockAuth.mockResolvedValue(makeSession(userId));
          mockCount.mockResolvedValue(0);

          const response = await DELETE();

          expect(response.status).toBe(404);
          expect(mockDeleteMany).not.toHaveBeenCalled();
        }
      ),
      PBT_CONFIG
    );
  });

  /**
   * 8e: When the user is not authenticated (no session), the handler returns
   * 401 and deleteMany is NOT called.
   */
  it("8e: Ohne Authentifizierung wird 401 zurückgegeben und deleteMany nicht aufgerufen", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.option(
          fc.record({ user: fc.record({ id: fc.constant(undefined as unknown as string) }) }),
          { nil: null }
        ),
        async (session) => {
          vi.clearAllMocks();

          // Either null session or session with no user id
          mockAuth.mockResolvedValue(session);

          const response = await DELETE();

          expect(response.status).toBe(401);
          expect(mockDeleteMany).not.toHaveBeenCalled();
        }
      ),
      PBT_CONFIG
    );
  });
});
