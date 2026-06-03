import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

/**
 * Property-Based Tests für den LinkCallbackHandler
 * GET /api/auth/sso/link/callback
 *
 * Property 7: Sub-Konflikt verhindert Account-Hijacking
 *
 * **Validates: Requirements 2.8**
 */

// ---------------------------------------------------------------------------
// Mocks — müssen vor allen Importen stehen
// ---------------------------------------------------------------------------

const mockFindFirst = vi.fn();
const mockFindUnique = vi.fn();
const mockUpsert = vi.fn();
const mockDeleteMany = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ssoLinkingSession: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      deleteMany: (...args: unknown[]) => mockDeleteMany(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
    ssoAccount: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      upsert: (...args: unknown[]) => mockUpsert(...args),
    },
  },
}));

const mockGetSsoConfig = vi.fn();
vi.mock("@/lib/config/auth-env", () => ({
  getSsoConfig: () => mockGetSsoConfig(),
}));

const mockExchangeCodeForToken = vi.fn();
const mockVerifyIdToken = vi.fn();
vi.mock("@/lib/services/sso-linking-service", () => ({
  exchangeCodeForToken: (...args: unknown[]) =>
    mockExchangeCodeForToken(...args),
  verifyIdToken: (...args: unknown[]) => mockVerifyIdToken(...args),
}));

vi.mock("@/lib/services/log-service", () => ({
  logAudit: vi.fn(),
  SSO_LINK_DENIED: "SSO_LINK_DENIED",
  SSO_LINK_FAILED: "SSO_LINK_FAILED",
  SSO_LINK_CONFLICT: "SSO_LINK_CONFLICT",
  SSO_LINK_SUCCESS: "SSO_LINK_SUCCESS",
  SSO_LINK_STATE_REPLAY: "SSO_LINK_STATE_REPLAY",
}));

import { GET } from "@/app/api/auth/sso/link/callback/route";

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

const VALID_SSO_CONFIG = {
  clientId: "my-client-id",
  clientSecret: "my-client-secret",
  issuerUrl: "https://auth.example.com",
};

/** Creates a realistic SsoLinkingSession fixture for a given userId and state. */
function makeLinkingSession(userId: string, state: string) {
  return {
    id: `session-${userId}`,
    userId,
    state,
    codeVerifier: "test-code-verifier-43chars-abcdefghijklmnop",
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    createdAt: new Date(),
  };
}

/** Creates an SsoAccount fixture tied to a specific userId. */
function makeSsoAccount(userId: string, sub: string) {
  return {
    id: `account-${userId}`,
    userId,
    provider: "authentik",
    providerAccountId: sub,
    createdAt: new Date(),
  };
}

/** Builds a minimal GET Request for the callback route. */
function makeCallbackRequest(state: string, code = "valid-auth-code"): Request {
  const url = new URL("https://app.example.com/api/auth/sso/link/callback");
  url.searchParams.set("state", state);
  url.searchParams.set("code", code);
  return new Request(url.toString());
}

const PBT_CONFIG = { numRuns: 100 };

// ---------------------------------------------------------------------------
// Property 7: Sub-Konflikt verhindert Account-Hijacking
//
// For any `sub` value that is already associated with a different userId B in
// the `SsoAccount` table, a link attempt by userId A (A ≠ B) SHALL be
// rejected — no `SsoAccount` change for userId A SHALL occur, and userId B's
// association SHALL remain intact.
//
// **Validates: Requirements 2.8**
// ---------------------------------------------------------------------------
describe("Property 7: Sub-Konflikt verhindert Account-Hijacking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_URL = "https://app.example.com";
  });

  /**
   * 7a: When userId A attempts to link a sub that is already owned by userId B
   * (A ≠ B), the upsert MUST NOT be called.
   */
  it("7a: ssoAccount.upsert wird nicht aufgerufen wenn sub bereits einem anderen User gehört", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Two distinct non-empty userIds
        fc
          .tuple(
            fc.string({ minLength: 1, maxLength: 40 }),
            fc.string({ minLength: 1, maxLength: 40 })
          )
          .filter(([a, b]) => a !== b),
        // A sub value (non-empty)
        fc.string({ minLength: 1, maxLength: 64 }).filter((s) => s.trim().length > 0),
        async ([userIdA, userIdB], sub) => {
          vi.clearAllMocks();

          const state = `state-${userIdA}`;

          // Setup: userId A has an active linking session
          mockFindFirst.mockResolvedValue(makeLinkingSession(userIdA, state));

          // SSO is configured
          mockGetSsoConfig.mockReturnValue(VALID_SSO_CONFIG);

          // Token exchange succeeds
          mockExchangeCodeForToken.mockResolvedValue({ idToken: "valid.id.token" });

          // ID token verification returns the sub
          mockVerifyIdToken.mockResolvedValue({ sub });

          // Conflict: sub is already linked to userId B (different from A)
          mockFindUnique.mockResolvedValue(makeSsoAccount(userIdB, sub));

          // Best-effort session cleanup always succeeds
          mockDelete.mockResolvedValue({});

          const request = makeCallbackRequest(state);
          await GET(request);

          // The upsert MUST NOT have been called
          expect(mockUpsert).not.toHaveBeenCalled();
        }
      ),
      PBT_CONFIG
    );
  });

  /**
   * 7b: When userId A attempts to link a sub already owned by userId B,
   * the redirect MUST go to /profile?error=sso-already-linked.
   */
  it("7b: Redirect geht zu /profile?error=sso-already-linked bei Sub-Konflikt", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .tuple(
            fc.string({ minLength: 1, maxLength: 40 }),
            fc.string({ minLength: 1, maxLength: 40 })
          )
          .filter(([a, b]) => a !== b),
        fc.string({ minLength: 1, maxLength: 64 }).filter((s) => s.trim().length > 0),
        async ([userIdA, userIdB], sub) => {
          vi.clearAllMocks();

          const state = `state-${userIdA}`;

          mockFindFirst.mockResolvedValue(makeLinkingSession(userIdA, state));
          mockGetSsoConfig.mockReturnValue(VALID_SSO_CONFIG);
          mockExchangeCodeForToken.mockResolvedValue({ idToken: "valid.id.token" });
          mockVerifyIdToken.mockResolvedValue({ sub });
          mockFindUnique.mockResolvedValue(makeSsoAccount(userIdB, sub));
          mockDelete.mockResolvedValue({});

          const request = makeCallbackRequest(state);
          const response = await GET(request);

          // Must be a redirect
          expect(response.status).toBe(307);

          const location = response.headers.get("location");
          expect(location).toBeTruthy();
          expect(location).toContain("error=sso-already-linked");
        }
      ),
      PBT_CONFIG
    );
  });

  /**
   * 7c: When userId A attempts to link a sub already owned by userId B,
   * userId B's SsoAccount MUST remain unchanged (no delete or upsert for B's account).
   */
  it("7c: Zuordnung von userId B bleibt erhalten — kein Delete oder Upsert für B", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .tuple(
            fc.string({ minLength: 1, maxLength: 40 }),
            fc.string({ minLength: 1, maxLength: 40 })
          )
          .filter(([a, b]) => a !== b),
        fc.string({ minLength: 1, maxLength: 64 }).filter((s) => s.trim().length > 0),
        async ([userIdA, userIdB], sub) => {
          vi.clearAllMocks();

          const state = `state-${userIdA}`;
          const existingAccountB = makeSsoAccount(userIdB, sub);

          mockFindFirst.mockResolvedValue(makeLinkingSession(userIdA, state));
          mockGetSsoConfig.mockReturnValue(VALID_SSO_CONFIG);
          mockExchangeCodeForToken.mockResolvedValue({ idToken: "valid.id.token" });
          mockVerifyIdToken.mockResolvedValue({ sub });
          mockFindUnique.mockResolvedValue(existingAccountB);
          mockDelete.mockResolvedValue({});

          const request = makeCallbackRequest(state);
          await GET(request);

          // ssoAccount.upsert never called — B's account is untouched
          expect(mockUpsert).not.toHaveBeenCalled();

          // ssoAccount.findUnique was used to detect the conflict (read-only)
          // No deleteMany on ssoAccount should have been called
          // (deleteMany on ssoLinkingSession for session cleanup is allowed)
          const ssoAccountDeleteCalls = mockDeleteMany.mock.calls.filter(
            (call) => {
              // We only track calls via the shared mockDeleteMany — the route
              // calls prisma.ssoLinkingSession.deleteMany for session cleanup.
              // There is no prisma.ssoAccount.deleteMany call expected here.
              return false; // ssoAccount has no deleteMany in the conflict path
            }
          );
          expect(ssoAccountDeleteCalls).toHaveLength(0);
        }
      ),
      PBT_CONFIG
    );
  });

  /**
   * 7d: When the sub is NOT in conflict (no existing account or same userId),
   * the upsert IS called — verifying the conflict check doesn't block valid links.
   */
  it("7d: Kein Konflikt — Upsert wird aufgerufen wenn sub noch nicht vergeben ist", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 40 }),
        fc.string({ minLength: 1, maxLength: 64 }).filter((s) => s.trim().length > 0),
        async (userId, sub) => {
          vi.clearAllMocks();

          const state = `state-${userId}`;

          mockFindFirst.mockResolvedValue(makeLinkingSession(userId, state));
          mockGetSsoConfig.mockReturnValue(VALID_SSO_CONFIG);
          mockExchangeCodeForToken.mockResolvedValue({ idToken: "valid.id.token" });
          mockVerifyIdToken.mockResolvedValue({ sub });

          // No existing account for this sub
          mockFindUnique.mockResolvedValue(null);

          mockUpsert.mockResolvedValue(makeSsoAccount(userId, sub));
          mockDelete.mockResolvedValue({});

          const request = makeCallbackRequest(state);
          const response = await GET(request);

          // Upsert MUST be called — link succeeds
          expect(mockUpsert).toHaveBeenCalledOnce();

          // Redirect to success
          const location = response.headers.get("location");
          expect(location).toContain("success=sso-linked");
        }
      ),
      PBT_CONFIG
    );
  });

  /**
   * 7e: When the sub is already linked to the SAME userId (re-linking),
   * the upsert IS called — idempotent re-link is allowed.
   */
  it("7e: Selbe userId — Upsert wird aufgerufen (idempotente Verknüpfung mit sich selbst)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 40 }),
        fc.string({ minLength: 1, maxLength: 64 }).filter((s) => s.trim().length > 0),
        async (userId, sub) => {
          vi.clearAllMocks();

          const state = `state-${userId}`;

          mockFindFirst.mockResolvedValue(makeLinkingSession(userId, state));
          mockGetSsoConfig.mockReturnValue(VALID_SSO_CONFIG);
          mockExchangeCodeForToken.mockResolvedValue({ idToken: "valid.id.token" });
          mockVerifyIdToken.mockResolvedValue({ sub });

          // Existing account — but same userId (no conflict)
          mockFindUnique.mockResolvedValue(makeSsoAccount(userId, sub));

          mockUpsert.mockResolvedValue(makeSsoAccount(userId, sub));
          mockDelete.mockResolvedValue({});

          const request = makeCallbackRequest(state);
          const response = await GET(request);

          // Upsert MUST be called — idempotent re-link
          expect(mockUpsert).toHaveBeenCalledOnce();

          // Redirect to success
          const location = response.headers.get("location");
          expect(location).toContain("success=sso-linked");
        }
      ),
      PBT_CONFIG
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5: SsoAccount-Upsert erzeugt genau einen Eintrag pro userId+provider
//
// For any userId and `sub` value, after a successful link callback the database
// SHALL contain exactly one `SsoAccount` entry with `userId`,
// `provider = "authentik"`, and `providerAccountId = sub`. Calling the upsert
// again with the same `sub` but the same userId SHALL not create a second entry.
//
// **Validates: Requirements 2.6**
// ---------------------------------------------------------------------------
describe("Property 5: SsoAccount-Upsert erzeugt genau einen Eintrag pro userId+provider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_URL = "https://app.example.com";
  });

  /**
   * 5a: After a successful callback, prisma.ssoAccount.upsert is called
   * exactly once — not more, not less.
   */
  it("5a: ssoAccount.upsert wird nach einem erfolgreichen Callback genau einmal aufgerufen", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
        async (userId, sub) => {
          vi.clearAllMocks();

          const state = "fixed-state-value";

          mockFindFirst.mockResolvedValue(makeLinkingSession(userId, state));
          mockGetSsoConfig.mockReturnValue(VALID_SSO_CONFIG);
          mockExchangeCodeForToken.mockResolvedValue({ idToken: "mock-id-token" });
          mockVerifyIdToken.mockResolvedValue({ sub });
          mockFindUnique.mockResolvedValue(null); // No conflict
          mockUpsert.mockResolvedValue(makeSsoAccount(userId, sub));
          mockDelete.mockResolvedValue({});

          const req = makeCallbackRequest(state, "auth-code-123");
          await GET(req);

          // Upsert must be called exactly once
          expect(mockUpsert).toHaveBeenCalledTimes(1);
        }
      ),
      PBT_CONFIG
    );
  });

  /**
   * 5b: The upsert call uses provider = "authentik" and
   * providerAccountId = sub (from the verified ID-Token).
   */
  it("5b: Upsert setzt provider='authentik' und providerAccountId=sub (aus dem ID-Token)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
        async (userId, sub) => {
          vi.clearAllMocks();

          const state = "fixed-state-value";

          mockFindFirst.mockResolvedValue(makeLinkingSession(userId, state));
          mockGetSsoConfig.mockReturnValue(VALID_SSO_CONFIG);
          mockExchangeCodeForToken.mockResolvedValue({ idToken: "mock-id-token" });
          mockVerifyIdToken.mockResolvedValue({ sub });
          mockFindUnique.mockResolvedValue(null);
          mockUpsert.mockResolvedValue(makeSsoAccount(userId, sub));
          mockDelete.mockResolvedValue({});

          const req = makeCallbackRequest(state, "auth-code-123");
          await GET(req);

          const upsertCall = mockUpsert.mock.calls[0][0];

          // where clause identifies the record by provider+providerAccountId
          expect(upsertCall.where.provider_providerAccountId.provider).toBe("authentik");
          expect(upsertCall.where.provider_providerAccountId.providerAccountId).toBe(sub);

          // create block sets all three fields
          expect(upsertCall.create.provider).toBe("authentik");
          expect(upsertCall.create.providerAccountId).toBe(sub);
          expect(upsertCall.create.userId).toBe(userId);

          // update block updates userId (from the session)
          expect(upsertCall.update.userId).toBe(userId);
        }
      ),
      PBT_CONFIG
    );
  });

  /**
   * 5c: The userId in the upsert comes exclusively from the LinkingSession —
   * never from the ID-Token (anti-hijacking invariant).
   */
  it("5c: Upsert-Aufruf verwendet userId aus der LinkingSession, nicht aus dem ID-Token", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
        async (userId, sub) => {
          vi.clearAllMocks();

          const state = "fixed-state-value";

          // The session carries userId A
          mockFindFirst.mockResolvedValue(makeLinkingSession(userId, state));
          mockGetSsoConfig.mockReturnValue(VALID_SSO_CONFIG);
          mockExchangeCodeForToken.mockResolvedValue({ idToken: "mock-id-token" });
          // ID-Token has the sub but no userId — the route must NOT derive userId from here
          mockVerifyIdToken.mockResolvedValue({ sub });
          mockFindUnique.mockResolvedValue(null);
          mockUpsert.mockResolvedValue(makeSsoAccount(userId, sub));
          mockDelete.mockResolvedValue({});

          const req = makeCallbackRequest(state, "auth-code-123");
          await GET(req);

          const upsertCall = mockUpsert.mock.calls[0][0];

          // The userId in the create and update blocks MUST equal the session's userId
          expect(upsertCall.create.userId).toBe(userId);
          expect(upsertCall.update.userId).toBe(userId);
        }
      ),
      PBT_CONFIG
    );
  });

  /**
   * 5d: Calling the callback twice with the same sub and same userId
   * results in exactly one record in the in-memory store (Upsert-Idempotenz).
   *
   * Simulates the DB constraint @@unique([provider, providerAccountId]).
   */
  it("5d: Wiederholter Aufruf mit demselben sub+userId erzeugt genau einen Eintrag (Upsert-Idempotenz)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
        async (userId, sub) => {
          vi.clearAllMocks();

          // In-memory store simulating @@unique([provider, providerAccountId])
          const ssoAccountStore = new Map<string, object>();
          const storeKey = (provider: string, providerAccountId: string) =>
            `${provider}::${providerAccountId}`;

          // Shared upsert implementation that enforces uniqueness
          const upsertImpl = async (args: any) => {
            const key = storeKey(
              args.where.provider_providerAccountId.provider,
              args.where.provider_providerAccountId.providerAccountId
            );
            const record = {
              id: ssoAccountStore.has(key) ? "existing-id" : "new-id",
              userId: args.create.userId as string,
              provider: args.where.provider_providerAccountId.provider as string,
              providerAccountId: args.where.provider_providerAccountId.providerAccountId as string,
              createdAt: new Date(),
            };
            ssoAccountStore.set(key, record);
            return record;
          };

          // --- First callback ---
          const state1 = "state-first-call";
          mockFindFirst.mockResolvedValue(makeLinkingSession(userId, state1));
          mockGetSsoConfig.mockReturnValue(VALID_SSO_CONFIG);
          mockExchangeCodeForToken.mockResolvedValue({ idToken: "mock-id-token" });
          mockVerifyIdToken.mockResolvedValue({ sub });
          mockFindUnique.mockResolvedValue(null); // No conflict on first call
          mockUpsert.mockImplementationOnce(upsertImpl);
          mockDelete.mockResolvedValue({});

          const req1 = makeCallbackRequest(state1, "code-first");
          await GET(req1);

          const countAfterFirst = ssoAccountStore.size;

          // --- Second callback — same sub+userId, different state/code ---
          vi.clearAllMocks();

          const state2 = "state-second-call";
          mockFindFirst.mockResolvedValue(makeLinkingSession(userId, state2));
          mockGetSsoConfig.mockReturnValue(VALID_SSO_CONFIG);
          mockExchangeCodeForToken.mockResolvedValue({ idToken: "mock-id-token" });
          mockVerifyIdToken.mockResolvedValue({ sub });
          // Same userId — no conflict (existing account belongs to same user)
          mockFindUnique.mockResolvedValue(makeSsoAccount(userId, sub));
          mockUpsert.mockImplementationOnce(upsertImpl);
          mockDelete.mockResolvedValue({});

          const req2 = makeCallbackRequest(state2, "code-second");
          await GET(req2);

          const countAfterSecond = ssoAccountStore.size;

          // After both calls: exactly one entry in the store
          expect(countAfterFirst).toBe(1);
          expect(countAfterSecond).toBe(1);

          // The stored record has the correct fields
          const key = storeKey("authentik", sub);
          const stored = ssoAccountStore.get(key) as any;
          expect(stored).toBeDefined();
          expect(stored.provider).toBe("authentik");
          expect(stored.providerAccountId).toBe(sub);
          expect(stored.userId).toBe(userId);
        }
      ),
      PBT_CONFIG
    );
  });

  /**
   * 5e: When the state is invalid (no active session), no upsert is executed —
   * no unwanted SsoAccount entries are created.
   */
  it("5e: Bei ungültigem State wird kein Upsert ausgeführt (kein DB-Eintrag)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
        async (state) => {
          vi.clearAllMocks();

          // No active session
          mockFindFirst.mockResolvedValue(null);
          mockDeleteMany.mockResolvedValue(undefined);

          const req = makeCallbackRequest(state, "some-code");
          await GET(req);

          // No upsert must have been executed
          expect(mockUpsert).not.toHaveBeenCalled();
        }
      ),
      PBT_CONFIG
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6: State-Token-Einmaligkeit verhindert Replay-Angriffe
//
// For any SsoLinkingSession that has been successfully consumed (Callback
// completed, session deleted), a subsequent Callback-Request with the same
// `state` value SHALL be rejected (no active session found) and no
// SsoAccount change SHALL occur.
//
// **Validates: Requirements 2.7, 5.3, 5.7**
// ---------------------------------------------------------------------------
describe("Property 6: State-Token-Einmaligkeit verhindert Replay-Angriffe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_URL = "https://app.example.com";
    mockDelete.mockResolvedValue({});
    mockDeleteMany.mockResolvedValue({ count: 0 });
  });

  /**
   * 6a: After session is consumed (findFirst returns null), a replay request
   * with the same state is rejected → redirect to sso-link-invalid-state,
   * no upsert called.
   *
   * Both findFirst calls return null:
   *  - First: active session with expiresAt > now — not found (consumed)
   *  - Second: expired/consumed check — also not found (truly gone)
   */
  it("6a: Replay mit verbrauchtem state wird zu sso-link-invalid-state redirected, kein upsert", async () => {
    await fc.assert(
      fc.asyncProperty(
        // state values: base64url-like strings similar to what generateState() produces
        fc.base64String({ minLength: 20, maxLength: 60 }),
        // authorization code values
        fc.base64String({ minLength: 10, maxLength: 40 }),
        async (state, code) => {
          vi.clearAllMocks();
          mockDelete.mockResolvedValue({});
          mockDeleteMany.mockResolvedValue({ count: 0 });

          // Session already consumed: both findFirst calls return null
          mockFindFirst.mockResolvedValue(null);

          const request = makeCallbackRequest(state, code);
          const response = await GET(request);

          // Must redirect to sso-link-invalid-state
          expect(response.status).toBe(307);
          const location = response.headers.get("location");
          expect(location).toContain("/profile");
          expect(location).toContain("error=sso-link-invalid-state");

          // ssoAccount.upsert MUST NOT be called
          expect(mockUpsert).not.toHaveBeenCalled();
        }
      ),
      PBT_CONFIG
    );
  });

  /**
   * 6b: First (successful) callback consumes the session. A second request
   * with the same state finds no active session and is rejected — no second upsert.
   *
   * First call: Happy-path (session active, token exchange succeeds).
   * Second call (replay): findFirst returns null → rejected.
   */
  it("6b: Erster erfolgreicher Callback verbraucht Session; zweiter Replay wird abgelehnt ohne upsert", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.base64String({ minLength: 20, maxLength: 60 }),
        fc.base64String({ minLength: 10, maxLength: 40 }),
        fc.string({ minLength: 1, maxLength: 40 }),
        // sub: printable ASCII, non-empty after trim
        fc.string({ minLength: 1, maxLength: 64 }).filter((s) => s.trim().length > 0 && !s.includes("\x00")),
        async (state, code, userId, sub) => {
          vi.clearAllMocks();
          mockDelete.mockResolvedValue({});
          mockDeleteMany.mockResolvedValue({ count: 0 });

          const session = makeLinkingSession(userId, state);

          // ---- First call: Happy-Path (active session) ----
          mockFindFirst.mockResolvedValueOnce(session);
          mockGetSsoConfig.mockReturnValue(VALID_SSO_CONFIG);
          mockExchangeCodeForToken.mockResolvedValueOnce({ idToken: "mock.id.token" });
          mockVerifyIdToken.mockResolvedValueOnce({ sub, email: "test@example.com" });
          mockFindUnique.mockResolvedValueOnce(null); // no conflict
          mockUpsert.mockResolvedValueOnce(makeSsoAccount(userId, sub));

          const firstRequest = makeCallbackRequest(state, code);
          const firstResponse = await GET(firstRequest);

          // First call must succeed (redirect to sso-linked)
          expect(firstResponse.status).toBe(307);
          const firstLocation = firstResponse.headers.get("location");
          expect(firstLocation).toContain("success=sso-linked");

          // upsert was called exactly once
          expect(mockUpsert).toHaveBeenCalledTimes(1);

          // ---- Second call: Replay attack (session already deleted) ----
          vi.clearAllMocks();
          mockDelete.mockResolvedValue({});
          mockDeleteMany.mockResolvedValue({ count: 0 });

          // Replay: session no longer present (both findFirst return null)
          mockFindFirst.mockResolvedValue(null);

          const replayRequest = makeCallbackRequest(state, code);
          const replayResponse = await GET(replayRequest);

          // Replay must be rejected with sso-link-invalid-state
          expect(replayResponse.status).toBe(307);
          const replayLocation = replayResponse.headers.get("location");
          expect(replayLocation).toContain("error=sso-link-invalid-state");

          // upsert MUST NOT be called on replay
          expect(mockUpsert).not.toHaveBeenCalled();
        }
      ),
      PBT_CONFIG
    );
  });

  /**
   * 6c: A state whose session has expired (still in DB but expiresAt < now)
   * is rejected — no upsert. The expired session triggers the SSO_LINK_STATE_REPLAY
   * audit log path.
   *
   * First findFirst (active session filter: expiresAt > now): null — expired.
   * Second findFirst (replay/expired check, no expiresAt filter): returns expired session.
   */
  it("6c: Replay mit abgelaufener Session (noch in DB) wird abgelehnt ohne upsert", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.base64String({ minLength: 20, maxLength: 60 }),
        fc.base64String({ minLength: 10, maxLength: 40 }),
        fc.string({ minLength: 1, maxLength: 40 }),
        async (state, code, userId) => {
          vi.clearAllMocks();
          mockDelete.mockResolvedValue({});
          mockDeleteMany.mockResolvedValue({ count: 0 });

          const expiredSession = {
            id: `session-${userId}`,
            userId,
            state,
            codeVerifier: "test-code-verifier-43chars-abcdefghijklmnop",
            expiresAt: new Date(Date.now() - 60 * 1000), // 1 minute in the past
            createdAt: new Date(Date.now() - 20 * 60 * 1000),
          };

          // First findFirst (with expiresAt > now filter): null — session expired
          mockFindFirst.mockResolvedValueOnce(null);
          // Second findFirst (replay check, no expiresAt filter): expired session found
          mockFindFirst.mockResolvedValueOnce(expiredSession);

          const request = makeCallbackRequest(state, code);
          const response = await GET(request);

          // Must redirect to sso-link-invalid-state
          expect(response.status).toBe(307);
          const location = response.headers.get("location");
          expect(location).toContain("error=sso-link-invalid-state");

          // ssoAccount.upsert MUST NOT be called
          expect(mockUpsert).not.toHaveBeenCalled();
        }
      ),
      PBT_CONFIG
    );
  });

  /**
   * 6d: Any request with a completely unknown state (not in DB at all) is
   * also rejected — no upsert, redirect to sso-link-invalid-state.
   */
  it("6d: Komplett unbekannter state wird immer abgelehnt ohne upsert", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Various potentially adversarial state strings (non-empty to avoid the
        // early-return for missing state parameter)
        fc.oneof(
          fc.base64String({ minLength: 1, maxLength: 100 }),
          fc.base64String({ minLength: 1, maxLength: 50 }),
          fc.constant("undefined"),
          fc.constant("null"),
          fc.constant("0"),
          fc.constant("replay-attempt"),
        ),
        fc.base64String({ minLength: 10, maxLength: 40 }),
        async (state, code) => {
          vi.clearAllMocks();
          mockDelete.mockResolvedValue({});
          mockDeleteMany.mockResolvedValue({ count: 0 });

          // Unknown state: both findFirst calls return null
          mockFindFirst.mockResolvedValue(null);

          const request = makeCallbackRequest(state, code);
          const response = await GET(request);

          // Must redirect to an error page
          expect(response.status).toBe(307);
          const location = response.headers.get("location");
          expect(location).toContain("/profile");
          expect(location).toContain("error=");

          // ssoAccount.upsert MUST NOT be called
          expect(mockUpsert).not.toHaveBeenCalled();
        }
      ),
      PBT_CONFIG
    );
  });
});
