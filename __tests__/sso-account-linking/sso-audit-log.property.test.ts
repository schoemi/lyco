import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

/**
 * Property-Based Tests für Audit-Log-Vollständigkeit
 *
 * Property 9: Audit-Log-Vollständigkeit
 *
 * For any completed linking or unlinking operation (Erfolg oder definierter
 * Fehlerfall), there SHALL exist exactly one corresponding AuditLog entry with
 * the correct `action` constant, the correct `actorId` (userId), and non-null
 * `details` including provider and result/reason. The AuditLog entry SHALL be
 * written before the redirect/response is returned.
 *
 * **Validates: Requirements 2.10, 3.3, 5.6, 5.7**
 */

// ---------------------------------------------------------------------------
// Mocks — müssen vor allen Importen stehen
// ---------------------------------------------------------------------------

const mockLogAudit = vi.fn();

vi.mock("@/lib/services/log-service", () => ({
  logAudit: (...args: unknown[]) => mockLogAudit(...args),
  SSO_LINK_DENIED: "SSO_LINK_DENIED",
  SSO_LINK_FAILED: "SSO_LINK_FAILED",
  SSO_LINK_CONFLICT: "SSO_LINK_CONFLICT",
  SSO_LINK_SUCCESS: "SSO_LINK_SUCCESS",
  SSO_LINK_STATE_REPLAY: "SSO_LINK_STATE_REPLAY",
  SSO_UNLINK_SUCCESS: "SSO_UNLINK_SUCCESS",
}));

const mockFindFirst = vi.fn();
const mockFindUnique = vi.fn();
const mockUpsert = vi.fn();
const mockDeleteMany = vi.fn();
const mockDelete = vi.fn();
const mockCount = vi.fn();
const mockFindMany = vi.fn();

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
      count: (...args: unknown[]) => mockCount(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
      deleteMany: (...args: unknown[]) => mockDeleteMany(...args),
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
  exchangeCodeForToken: (...args: unknown[]) => mockExchangeCodeForToken(...args),
  verifyIdToken: (...args: unknown[]) => mockVerifyIdToken(...args),
}));

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

// Import routes after mocks
import { GET } from "@/app/api/auth/sso/link/callback/route";
import { DELETE } from "@/app/api/auth/sso/unlink/route";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const VALID_SSO_CONFIG = {
  clientId: "my-client-id",
  clientSecret: "my-client-secret",
  issuerUrl: "https://auth.example.com",
};

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

function makeCallbackRequest(
  state: string,
  params: { code?: string; error?: string } = {}
): Request {
  const url = new URL("https://app.example.com/api/auth/sso/link/callback");
  url.searchParams.set("state", state);
  if (params.error) {
    url.searchParams.set("error", params.error);
  } else {
    url.searchParams.set("code", params.code ?? "valid-auth-code");
  }
  return new Request(url.toString());
}

const PBT_CONFIG = { numRuns: 100 };

// ---------------------------------------------------------------------------
// Property 9a: Linking-Erfolg → genau ein SSO_LINK_SUCCESS-Eintrag
// ---------------------------------------------------------------------------
describe("Property 9a: Linking-Erfolg schreibt genau einen SSO_LINK_SUCCESS-Eintrag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_URL = "https://app.example.com";
    mockDelete.mockResolvedValue({});
    mockDeleteMany.mockResolvedValue({ count: 1 });
  });

  it("9a: Nach erfolgreichem Callback → logAudit genau einmal mit SSO_LINK_SUCCESS, actorId=userId und details.provider", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 64 }).filter((s) => s.trim().length > 0),
        async (userId, sub) => {
          vi.clearAllMocks();
          mockDelete.mockResolvedValue({});
          mockDeleteMany.mockResolvedValue({ count: 1 });
          mockLogAudit.mockResolvedValue(undefined);

          const state = `state-${userId}`;

          mockFindFirst.mockResolvedValue(makeLinkingSession(userId, state));
          mockGetSsoConfig.mockReturnValue(VALID_SSO_CONFIG);
          mockExchangeCodeForToken.mockResolvedValue({ idToken: "valid.id.token" });
          mockVerifyIdToken.mockResolvedValue({ sub });
          mockFindUnique.mockResolvedValue(null); // no conflict
          mockUpsert.mockResolvedValue({ id: "acc-1", userId, provider: "authentik", providerAccountId: sub });

          const request = makeCallbackRequest(state, { code: "auth-code" });
          const response = await GET(request);

          // Must redirect to success
          expect(response.status).toBe(307);
          const location = response.headers.get("location");
          expect(location).toContain("success=sso-linked");

          // logAudit called exactly once
          expect(mockLogAudit).toHaveBeenCalledTimes(1);

          const auditCall = mockLogAudit.mock.calls[0][0];

          // Correct action constant
          expect(auditCall.action).toBe("SSO_LINK_SUCCESS");

          // Correct actorId
          expect(auditCall.actorId).toBe(userId);

          // details must be non-null and contain provider
          expect(auditCall.details).not.toBeNull();
          expect(auditCall.details).toBeDefined();
          expect(auditCall.details.provider).toBeTruthy();
        }
      ),
      PBT_CONFIG
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9b: Provider-Fehler im Callback → genau ein SSO_LINK_DENIED-Eintrag
// ---------------------------------------------------------------------------
describe("Property 9b: Provider-Fehler schreibt genau einen SSO_LINK_DENIED-Eintrag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_URL = "https://app.example.com";
    mockDeleteMany.mockResolvedValue({ count: 0 });
    mockDelete.mockResolvedValue({});
    mockLogAudit.mockResolvedValue(undefined);
  });

  it("9b: Wenn Provider error-Parameter sendet → logAudit genau einmal mit SSO_LINK_DENIED und details.provider", async () => {
    await fc.assert(
      fc.asyncProperty(
        // state may be null (no state) or a non-empty string
        fc.oneof(
          fc.constant("some-state-value"),
          fc.string({ minLength: 1, maxLength: 40 })
        ),
        // provider error values (e.g. "access_denied", "server_error")
        fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length > 0),
        async (state, providerError) => {
          vi.clearAllMocks();
          mockDeleteMany.mockResolvedValue({ count: 0 });
          mockDelete.mockResolvedValue({});
          mockLogAudit.mockResolvedValue(undefined);

          const request = makeCallbackRequest(state, { error: providerError });
          const response = await GET(request);

          // Must redirect to sso-link-denied
          expect(response.status).toBe(307);
          const location = response.headers.get("location");
          expect(location).toContain("error=sso-link-denied");

          // logAudit called exactly once
          expect(mockLogAudit).toHaveBeenCalledTimes(1);

          const auditCall = mockLogAudit.mock.calls[0][0];

          // Correct action constant
          expect(auditCall.action).toBe("SSO_LINK_DENIED");

          // details must be non-null and contain provider
          expect(auditCall.details).not.toBeNull();
          expect(auditCall.details).toBeDefined();
          expect(auditCall.details.provider).toBeTruthy();
        }
      ),
      PBT_CONFIG
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9c: Token-Exchange-Fehler → genau ein SSO_LINK_FAILED-Eintrag
// ---------------------------------------------------------------------------
describe("Property 9c: Token-Exchange-Fehler schreibt genau einen SSO_LINK_FAILED-Eintrag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_URL = "https://app.example.com";
    mockDelete.mockResolvedValue({});
    mockDeleteMany.mockResolvedValue({ count: 1 });
    mockLogAudit.mockResolvedValue(undefined);
  });

  it("9c: Wenn Token-Exchange fehlschlägt → logAudit genau einmal mit SSO_LINK_FAILED, actorId=userId und details.provider", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length > 0),
        async (userId, errorMessage) => {
          vi.clearAllMocks();
          mockDelete.mockResolvedValue({});
          mockDeleteMany.mockResolvedValue({ count: 1 });
          mockLogAudit.mockResolvedValue(undefined);

          const state = `state-${userId}`;

          mockFindFirst.mockResolvedValue(makeLinkingSession(userId, state));
          mockGetSsoConfig.mockReturnValue(VALID_SSO_CONFIG);

          // Token exchange fails
          mockExchangeCodeForToken.mockResolvedValue({ error: errorMessage });

          const request = makeCallbackRequest(state, { code: "auth-code" });
          const response = await GET(request);

          // Must redirect to sso-link-failed
          expect(response.status).toBe(307);
          const location = response.headers.get("location");
          expect(location).toContain("error=sso-link-failed");

          // logAudit called exactly once
          expect(mockLogAudit).toHaveBeenCalledTimes(1);

          const auditCall = mockLogAudit.mock.calls[0][0];

          // Correct action constant
          expect(auditCall.action).toBe("SSO_LINK_FAILED");

          // Correct actorId — from the linking session
          expect(auditCall.actorId).toBe(userId);

          // details must be non-null and contain provider
          expect(auditCall.details).not.toBeNull();
          expect(auditCall.details).toBeDefined();
          expect(auditCall.details.provider).toBeTruthy();
        }
      ),
      PBT_CONFIG
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9d: Sub-Konflikt → genau ein SSO_LINK_CONFLICT-Eintrag
// ---------------------------------------------------------------------------
describe("Property 9d: Sub-Konflikt schreibt genau einen SSO_LINK_CONFLICT-Eintrag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_URL = "https://app.example.com";
    mockDelete.mockResolvedValue({});
    mockDeleteMany.mockResolvedValue({ count: 1 });
    mockLogAudit.mockResolvedValue(undefined);
  });

  it("9d: Wenn sub bereits einem anderen User gehört → logAudit genau einmal mit SSO_LINK_CONFLICT, actorId=userId und details.provider", async () => {
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
          mockDelete.mockResolvedValue({});
          mockDeleteMany.mockResolvedValue({ count: 1 });
          mockLogAudit.mockResolvedValue(undefined);

          const state = `state-${userIdA}`;

          mockFindFirst.mockResolvedValue(makeLinkingSession(userIdA, state));
          mockGetSsoConfig.mockReturnValue(VALID_SSO_CONFIG);
          mockExchangeCodeForToken.mockResolvedValue({ idToken: "valid.id.token" });
          mockVerifyIdToken.mockResolvedValue({ sub });

          // Conflict: sub already linked to userIdB
          mockFindUnique.mockResolvedValue({
            id: "acc-b",
            userId: userIdB,
            provider: "authentik",
            providerAccountId: sub,
            createdAt: new Date(),
          });

          const request = makeCallbackRequest(state, { code: "auth-code" });
          const response = await GET(request);

          // Must redirect to sso-already-linked
          expect(response.status).toBe(307);
          const location = response.headers.get("location");
          expect(location).toContain("error=sso-already-linked");

          // logAudit called exactly once
          expect(mockLogAudit).toHaveBeenCalledTimes(1);

          const auditCall = mockLogAudit.mock.calls[0][0];

          // Correct action constant
          expect(auditCall.action).toBe("SSO_LINK_CONFLICT");

          // Correct actorId — the user who initiated the link attempt
          expect(auditCall.actorId).toBe(userIdA);

          // details must be non-null and contain provider
          expect(auditCall.details).not.toBeNull();
          expect(auditCall.details).toBeDefined();
          expect(auditCall.details.provider).toBeTruthy();
        }
      ),
      PBT_CONFIG
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9e: Unlink-Erfolg → genau ein SSO_UNLINK_SUCCESS-Eintrag
// ---------------------------------------------------------------------------
describe("Property 9e: Unlink-Erfolg schreibt genau einen SSO_UNLINK_SUCCESS-Eintrag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogAudit.mockResolvedValue(undefined);
  });

  it("9e: Nach erfolgreichem Unlink → logAudit genau einmal mit SSO_UNLINK_SUCCESS, actorId=userId und details.providers", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length > 0),
        // One or more provider names
        fc.array(
          fc.constantFrom("authentik", "google", "github"),
          { minLength: 1, maxLength: 3 }
        ),
        async (userId, providers) => {
          vi.clearAllMocks();
          mockLogAudit.mockResolvedValue(undefined);

          // Auth session returns the userId
          mockAuth.mockResolvedValue({ user: { id: userId } });

          // SsoAccounts exist (count > 0)
          mockCount.mockResolvedValue(providers.length);

          // findMany returns the providers for the audit log
          mockFindMany.mockResolvedValue(
            providers.map((p, i) => ({
              id: `acc-${i}`,
              userId,
              provider: p,
              providerAccountId: `sub-${i}`,
              createdAt: new Date(),
            }))
          );

          // deleteMany succeeds
          mockDeleteMany.mockResolvedValue({ count: providers.length });

          const response = await DELETE();

          // Must return 200 with { unlinked: true }
          expect(response.status).toBe(200);
          const body = await response.json();
          expect(body.unlinked).toBe(true);

          // logAudit called exactly once
          expect(mockLogAudit).toHaveBeenCalledTimes(1);

          const auditCall = mockLogAudit.mock.calls[0][0];

          // Correct action constant
          expect(auditCall.action).toBe("SSO_UNLINK_SUCCESS");

          // Correct actorId
          expect(auditCall.actorId).toBe(userId);

          // details must be non-null and contain providers array
          expect(auditCall.details).not.toBeNull();
          expect(auditCall.details).toBeDefined();
          expect(Array.isArray(auditCall.details.providers)).toBe(true);
          expect(auditCall.details.providers).toEqual(providers);
        }
      ),
      PBT_CONFIG
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9f: Kein Audit-Log bei 401/404/500-Fehlerpfaden (kein actorId bekannt)
// ---------------------------------------------------------------------------
describe("Property 9f: Kein Audit-Log wenn kein vollständiger Linking-Kontext vorhanden", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogAudit.mockResolvedValue(undefined);
  });

  it("9f-unlink-401: Kein Audit-Log wenn Unlink-Request nicht authentifiziert ist", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          vi.clearAllMocks();
          mockLogAudit.mockResolvedValue(undefined);

          // No session — unauthenticated
          mockAuth.mockResolvedValue(null);

          const response = await DELETE();

          expect(response.status).toBe(401);

          // No audit log for unauthenticated requests
          expect(mockLogAudit).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 10 } // fewer runs needed — purely structural
    );
  });

  it("9f-unlink-404: Kein Audit-Log wenn keine SsoAccounts vorhanden (404)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length > 0),
        async (userId) => {
          vi.clearAllMocks();
          mockLogAudit.mockResolvedValue(undefined);

          mockAuth.mockResolvedValue({ user: { id: userId } });
          mockCount.mockResolvedValue(0); // No SsoAccounts

          const response = await DELETE();

          expect(response.status).toBe(404);

          // No audit log when no accounts exist
          expect(mockLogAudit).not.toHaveBeenCalled();
        }
      ),
      PBT_CONFIG
    );
  });

  it("9f-callback-no-state: Kein Audit-Log wenn state-Parameter fehlt", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          vi.clearAllMocks();
          mockLogAudit.mockResolvedValue(undefined);

          // Request without state parameter
          const url = new URL("https://app.example.com/api/auth/sso/link/callback");
          url.searchParams.set("code", "some-code");
          const request = new Request(url.toString());

          const response = await GET(request);

          expect(response.status).toBe(307);
          const location = response.headers.get("location");
          expect(location).toContain("error=sso-link-invalid-state");

          // No audit log — no actor known
          expect(mockLogAudit).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 10 }
    );
  });
});
