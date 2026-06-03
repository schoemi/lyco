import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Unit-Tests für den LinkCallbackHandler — Fehlerpfade
 * GET /api/auth/sso/link/callback
 *
 * Requirements: 2.3, 2.5, 2.9
 */

// --- Mocks (müssen vor den Importen stehen) ---

const mockFindFirst = vi.fn();
const mockFindUnique = vi.fn();
const mockDeleteMany = vi.fn();
const mockDelete = vi.fn();
const mockSsoAccountFindUnique = vi.fn();
const mockSsoAccountUpsert = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ssoLinkingSession: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      deleteMany: (...args: unknown[]) => mockDeleteMany(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
    ssoAccount: {
      findUnique: (...args: unknown[]) => mockSsoAccountFindUnique(...args),
      upsert: (...args: unknown[]) => mockSsoAccountUpsert(...args),
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

// --- Fixtures ---

const validSsoConfig = {
  clientId: "my-client-id",
  clientSecret: "my-client-secret",
  issuerUrl: "https://auth.example.com",
};

const validLinkingSession = {
  id: "session-id-123",
  userId: "user-abc",
  state: "valid-state-token",
  codeVerifier: "code-verifier-value",
  expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 Minuten in der Zukunft
  createdAt: new Date(),
};

function makeRequest(params: Record<string, string>): Request {
  const url = new URL("https://app.example.com/api/auth/sso/link/callback");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new Request(url.toString());
}

describe("LinkCallbackHandler — GET /api/auth/sso/link/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_URL = "https://app.example.com";
  });

  // -------------------------------------------------------------------------
  // Requirement 2.3: Provider sendet error-Parameter → redirect zu sso-link-denied
  // -------------------------------------------------------------------------
  describe("Redirect zu ?error=sso-link-denied — Provider sendet error-Parameter (Requirement 2.3)", () => {
    it("leitet zu /profile?error=sso-link-denied weiter wenn Provider access_denied sendet", async () => {
      process.env.NEXTAUTH_URL = "https://app.example.com";
      mockDeleteMany.mockResolvedValue({ count: 0 });

      const req = makeRequest({
        error: "access_denied",
        state: "some-state-token",
      });

      const res = await GET(req);

      expect(res.status).toBe(307);
      const location = res.headers.get("location");
      expect(location).toBe(
        "https://app.example.com/profile?error=sso-link-denied"
      );
    });

    it("leitet zu /profile?error=sso-link-denied weiter wenn Provider login_required sendet", async () => {
      process.env.NEXTAUTH_URL = "https://app.example.com";
      mockDeleteMany.mockResolvedValue({ count: 0 });

      const req = makeRequest({
        error: "login_required",
        state: "some-state-token",
      });

      const res = await GET(req);

      expect(res.status).toBe(307);
      const location = res.headers.get("location");
      expect(location).toBe(
        "https://app.example.com/profile?error=sso-link-denied"
      );
    });

    it("löst KEINEN Token-Exchange aus wenn Provider error sendet", async () => {
      process.env.NEXTAUTH_URL = "https://app.example.com";
      mockDeleteMany.mockResolvedValue({ count: 0 });

      const req = makeRequest({
        error: "access_denied",
        state: "some-state-token",
      });

      await GET(req);

      expect(mockExchangeCodeForToken).not.toHaveBeenCalled();
    });

    it("löscht die Session per state wenn Provider error sendet", async () => {
      process.env.NEXTAUTH_URL = "https://app.example.com";
      mockDeleteMany.mockResolvedValue({ count: 1 });

      const req = makeRequest({
        error: "access_denied",
        state: "some-state-token",
      });

      await GET(req);

      expect(mockDeleteMany).toHaveBeenCalledWith({
        where: { state: "some-state-token" },
      });
    });

    it("verarbeitet auch error ohne state-Parameter", async () => {
      process.env.NEXTAUTH_URL = "https://app.example.com";
      mockDeleteMany.mockResolvedValue({ count: 0 });

      const req = makeRequest({ error: "access_denied" });

      const res = await GET(req);

      expect(res.status).toBe(307);
      const location = res.headers.get("location");
      expect(location).toBe(
        "https://app.example.com/profile?error=sso-link-denied"
      );
    });
  });

  // -------------------------------------------------------------------------
  // Requirement 2.9: Token-Exchange Timeout → redirect zu sso-link-failed
  // -------------------------------------------------------------------------
  describe("Redirect zu ?error=sso-link-failed — Token-Exchange Timeout (Requirement 2.9)", () => {
    it("leitet zu /profile?error=sso-link-failed weiter wenn Token-Exchange Timeout auftritt", async () => {
      process.env.NEXTAUTH_URL = "https://app.example.com";
      mockFindFirst.mockResolvedValue(validLinkingSession);
      mockGetSsoConfig.mockReturnValue(validSsoConfig);
      mockDelete.mockResolvedValue({});
      mockExchangeCodeForToken.mockResolvedValue({
        error: "Token-Exchange-Timeout (10s überschritten)",
      });

      const req = makeRequest({
        state: "valid-state-token",
        code: "auth-code-123",
      });

      const res = await GET(req);

      expect(res.status).toBe(307);
      const location = res.headers.get("location");
      expect(location).toBe(
        "https://app.example.com/profile?error=sso-link-failed"
      );
    });

    it("leitet zu /profile?error=sso-link-failed weiter bei generellem Token-Exchange-Fehler", async () => {
      process.env.NEXTAUTH_URL = "https://app.example.com";
      mockFindFirst.mockResolvedValue(validLinkingSession);
      mockGetSsoConfig.mockReturnValue(validSsoConfig);
      mockDelete.mockResolvedValue({});
      mockExchangeCodeForToken.mockResolvedValue({
        error: "Token-Exchange fehlgeschlagen: HTTP 400 – invalid_grant",
      });

      const req = makeRequest({
        state: "valid-state-token",
        code: "auth-code-123",
      });

      const res = await GET(req);

      expect(res.status).toBe(307);
      const location = res.headers.get("location");
      expect(location).toBe(
        "https://app.example.com/profile?error=sso-link-failed"
      );
    });

    it("löscht die LinkingSession wenn Token-Exchange Timeout auftritt", async () => {
      process.env.NEXTAUTH_URL = "https://app.example.com";
      mockFindFirst.mockResolvedValue(validLinkingSession);
      mockGetSsoConfig.mockReturnValue(validSsoConfig);
      mockDelete.mockResolvedValue({});
      mockExchangeCodeForToken.mockResolvedValue({
        error: "Token-Exchange-Timeout (10s überschritten)",
      });

      const req = makeRequest({
        state: "valid-state-token",
        code: "auth-code-123",
      });

      await GET(req);

      expect(mockDelete).toHaveBeenCalledWith({
        where: { id: validLinkingSession.id },
      });
    });

    it("löst KEINEN Upsert aus wenn Token-Exchange fehlschlägt", async () => {
      process.env.NEXTAUTH_URL = "https://app.example.com";
      mockFindFirst.mockResolvedValue(validLinkingSession);
      mockGetSsoConfig.mockReturnValue(validSsoConfig);
      mockDelete.mockResolvedValue({});
      mockExchangeCodeForToken.mockResolvedValue({
        error: "Token-Exchange-Timeout (10s überschritten)",
      });

      const req = makeRequest({
        state: "valid-state-token",
        code: "auth-code-123",
      });

      await GET(req);

      expect(mockSsoAccountUpsert).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Requirement 2.5: sub-Claim fehlt → redirect zu sso-link-failed
  // -------------------------------------------------------------------------
  describe("Redirect zu ?error=sso-link-failed — sub-Claim fehlt (Requirement 2.5)", () => {
    it("leitet zu /profile?error=sso-link-failed weiter wenn verifyIdToken null zurückgibt", async () => {
      process.env.NEXTAUTH_URL = "https://app.example.com";
      mockFindFirst.mockResolvedValue(validLinkingSession);
      mockGetSsoConfig.mockReturnValue(validSsoConfig);
      mockDelete.mockResolvedValue({});
      mockExchangeCodeForToken.mockResolvedValue({ idToken: "mock-id-token" });
      mockVerifyIdToken.mockResolvedValue(null);

      const req = makeRequest({
        state: "valid-state-token",
        code: "auth-code-123",
      });

      const res = await GET(req);

      expect(res.status).toBe(307);
      const location = res.headers.get("location");
      expect(location).toBe(
        "https://app.example.com/profile?error=sso-link-failed"
      );
    });

    it("leitet zu /profile?error=sso-link-failed weiter wenn Claims kein sub enthalten", async () => {
      process.env.NEXTAUTH_URL = "https://app.example.com";
      mockFindFirst.mockResolvedValue(validLinkingSession);
      mockGetSsoConfig.mockReturnValue(validSsoConfig);
      mockDelete.mockResolvedValue({});
      mockExchangeCodeForToken.mockResolvedValue({ idToken: "mock-id-token" });
      // Claims ohne sub-Feld
      mockVerifyIdToken.mockResolvedValue({
        iss: "https://auth.example.com",
        aud: "my-client-id",
      });

      const req = makeRequest({
        state: "valid-state-token",
        code: "auth-code-123",
      });

      const res = await GET(req);

      expect(res.status).toBe(307);
      const location = res.headers.get("location");
      expect(location).toBe(
        "https://app.example.com/profile?error=sso-link-failed"
      );
    });

    it("leitet zu /profile?error=sso-link-failed weiter wenn sub leer ist", async () => {
      process.env.NEXTAUTH_URL = "https://app.example.com";
      mockFindFirst.mockResolvedValue(validLinkingSession);
      mockGetSsoConfig.mockReturnValue(validSsoConfig);
      mockDelete.mockResolvedValue({});
      mockExchangeCodeForToken.mockResolvedValue({ idToken: "mock-id-token" });
      // Claims mit leerem sub
      mockVerifyIdToken.mockResolvedValue({
        iss: "https://auth.example.com",
        sub: "",
      });

      const req = makeRequest({
        state: "valid-state-token",
        code: "auth-code-123",
      });

      const res = await GET(req);

      expect(res.status).toBe(307);
      const location = res.headers.get("location");
      expect(location).toBe(
        "https://app.example.com/profile?error=sso-link-failed"
      );
    });

    it("löscht die LinkingSession wenn sub-Claim fehlt", async () => {
      process.env.NEXTAUTH_URL = "https://app.example.com";
      mockFindFirst.mockResolvedValue(validLinkingSession);
      mockGetSsoConfig.mockReturnValue(validSsoConfig);
      mockDelete.mockResolvedValue({});
      mockExchangeCodeForToken.mockResolvedValue({ idToken: "mock-id-token" });
      mockVerifyIdToken.mockResolvedValue(null);

      const req = makeRequest({
        state: "valid-state-token",
        code: "auth-code-123",
      });

      await GET(req);

      expect(mockDelete).toHaveBeenCalledWith({
        where: { id: validLinkingSession.id },
      });
    });

    it("löst KEINEN Upsert aus wenn sub-Claim fehlt", async () => {
      process.env.NEXTAUTH_URL = "https://app.example.com";
      mockFindFirst.mockResolvedValue(validLinkingSession);
      mockGetSsoConfig.mockReturnValue(validSsoConfig);
      mockDelete.mockResolvedValue({});
      mockExchangeCodeForToken.mockResolvedValue({ idToken: "mock-id-token" });
      mockVerifyIdToken.mockResolvedValue(null);

      const req = makeRequest({
        state: "valid-state-token",
        code: "auth-code-123",
      });

      await GET(req);

      expect(mockSsoAccountUpsert).not.toHaveBeenCalled();
    });
  });
});
