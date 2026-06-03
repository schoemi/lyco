import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Unit-Tests für den LinkInitiator
 * GET /api/auth/sso/link/initiate
 *
 * Requirements: 1.4, 1.5, 1.6
 */

// --- Mocks (müssen vor den Importen stehen) ---

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

const mockUpsert = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    ssoLinkingSession: {
      upsert: (...args: unknown[]) => mockUpsert(...args),
    },
  },
}));

const mockGetSsoConfig = vi.fn();
vi.mock("@/lib/config/auth-env", () => ({
  getSsoConfig: () => mockGetSsoConfig(),
}));

const mockDiscoverAuthorizationEndpoint = vi.fn();
const mockGenerateState = vi.fn();
const mockGenerateCodeVerifier = vi.fn();
const mockComputeCodeChallenge = vi.fn();
vi.mock("@/lib/services/sso-linking-service", () => ({
  discoverAuthorizationEndpoint: (...args: unknown[]) =>
    mockDiscoverAuthorizationEndpoint(...args),
  generateState: () => mockGenerateState(),
  generateCodeVerifier: () => mockGenerateCodeVerifier(),
  computeCodeChallenge: (...args: unknown[]) =>
    mockComputeCodeChallenge(...args),
}));

vi.mock("@/lib/services/log-service", () => ({
  logAudit: vi.fn(),
  SSO_LINK_INITIATED: "SSO_LINK_INITIATED",
}));

import { GET } from "@/app/api/auth/sso/link/initiate/route";

// --- Test-Fixtures ---

const authenticatedSession = {
  user: { id: "user-123", email: "test@example.com", name: "Test User" },
};

const validSsoConfig = {
  clientId: "my-client-id",
  clientSecret: "my-client-secret",
  issuerUrl: "https://auth.example.com",
};

const authEndpoint = "https://auth.example.com/application/o/authorize/";

function setupHappyPath() {
  mockAuth.mockResolvedValue(authenticatedSession);
  mockGetSsoConfig.mockReturnValue(validSsoConfig);
  mockDiscoverAuthorizationEndpoint.mockResolvedValue(authEndpoint);
  mockGenerateState.mockReturnValue("test-state-value");
  mockGenerateCodeVerifier.mockReturnValue("test-code-verifier");
  mockComputeCodeChallenge.mockResolvedValue("test-code-challenge");
  mockUpsert.mockResolvedValue({
    id: "session-id",
    userId: "user-123",
    state: "test-state-value",
    codeVerifier: "test-code-verifier",
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    createdAt: new Date(),
  });
  process.env.NEXTAUTH_URL = "https://app.example.com";
}

describe("LinkInitiator — GET /api/auth/sso/link/initiate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Requirement 1.5: 401 wenn kein User in der Session ---
  describe("401 — Nicht authentifiziert (Requirement 1.5)", () => {
    it("gibt 401 zurück wenn keine Session vorhanden ist", async () => {
      mockAuth.mockResolvedValue(null);

      const res = await GET();

      expect(res.status).toBe(401);
    });

    it("gibt 401 zurück wenn Session keinen User enthält", async () => {
      mockAuth.mockResolvedValue({ user: null });

      const res = await GET();

      expect(res.status).toBe(401);
    });

    it("gibt 401 zurück wenn User keine ID hat", async () => {
      mockAuth.mockResolvedValue({ user: { email: "no-id@example.com" } });

      const res = await GET();

      expect(res.status).toBe(401);
    });

    it("löst keinen DB-Upsert aus bei nicht authentifiziertem User", async () => {
      mockAuth.mockResolvedValue(null);

      await GET();

      expect(mockUpsert).not.toHaveBeenCalled();
    });
  });

  // --- Requirement 1.4: 503 wenn SSO nicht konfiguriert ---
  describe("503 — SSO nicht konfiguriert (Requirement 1.4)", () => {
    it("gibt 503 zurück wenn getSsoConfig() null zurückgibt", async () => {
      mockAuth.mockResolvedValue(authenticatedSession);
      mockGetSsoConfig.mockReturnValue(null);

      const res = await GET();

      expect(res.status).toBe(503);
    });

    it("enthält eine Fehlermeldung im Response-Body bei 503", async () => {
      mockAuth.mockResolvedValue(authenticatedSession);
      mockGetSsoConfig.mockReturnValue(null);

      const res = await GET();
      const json = await res.json();

      expect(json.error).toBeTruthy();
    });

    it("löst keinen DB-Upsert aus wenn SSO nicht konfiguriert ist", async () => {
      mockAuth.mockResolvedValue(authenticatedSession);
      mockGetSsoConfig.mockReturnValue(null);

      await GET();

      expect(mockUpsert).not.toHaveBeenCalled();
    });
  });

  // --- Requirement 1.6: 500 wenn DB-Upsert fehlschlägt, kein Redirect ---
  describe("500 — DB-Upsert fehlgeschlagen, kein Redirect (Requirement 1.6)", () => {
    it("gibt 500 zurück wenn prisma.ssoLinkingSession.upsert wirft", async () => {
      setupHappyPath();
      mockUpsert.mockRejectedValue(new Error("DB connection lost"));

      const res = await GET();

      expect(res.status).toBe(500);
    });

    it("enthält eine Fehlermeldung im Response-Body bei 500", async () => {
      setupHappyPath();
      mockUpsert.mockRejectedValue(new Error("DB connection lost"));

      const res = await GET();
      const json = await res.json();

      expect(json.error).toBeTruthy();
    });

    it("löst KEINEN Redirect aus wenn der DB-Upsert fehlschlägt", async () => {
      setupHappyPath();
      mockUpsert.mockRejectedValue(new Error("Unique constraint violation"));

      const res = await GET();

      // Kein 302-Redirect
      expect(res.status).not.toBe(302);
      expect(res.status).toBe(500);
    });
  });

  // --- Happy Path: 302-Redirect zur Authorization-URL ---
  describe("302 — Erfolgreicher Redirect zur OIDC-Authorization-URL", () => {
    it("gibt 302 zurück wenn alles korrekt konfiguriert ist", async () => {
      setupHappyPath();

      const res = await GET();

      expect(res.status).toBe(302);
    });

    it("setzt alle PKCE-Parameter in der Redirect-URL", async () => {
      setupHappyPath();

      const res = await GET();
      const location = res.headers.get("location");

      expect(location).toBeTruthy();
      const url = new URL(location!);
      expect(url.searchParams.get("response_type")).toBe("code");
      expect(url.searchParams.get("state")).toBe("test-state-value");
      expect(url.searchParams.get("code_challenge")).toBe("test-code-challenge");
      expect(url.searchParams.get("code_challenge_method")).toBe("S256");
      expect(url.searchParams.get("client_id")).toBe(validSsoConfig.clientId);
    });

    it("ruft prisma.ssoLinkingSession.upsert mit der userId aus der Session auf", async () => {
      setupHappyPath();

      await GET();

      expect(mockUpsert).toHaveBeenCalledOnce();
      const upsertArg = mockUpsert.mock.calls[0][0];
      expect(upsertArg.where.userId).toBe("user-123");
      expect(upsertArg.create.userId).toBe("user-123");
    });

    it("setzt redirect_uri auf /api/auth/sso/link/callback", async () => {
      setupHappyPath();

      const res = await GET();
      const location = res.headers.get("location");
      const url = new URL(location!);

      expect(url.searchParams.get("redirect_uri")).toContain(
        "/api/auth/sso/link/callback"
      );
    });
  });

  // --- 503 bei OIDC-Discovery-Fehler ---
  describe("503 — OIDC-Discovery fehlgeschlagen", () => {
    it("gibt 503 zurück wenn die OIDC-Discovery fehlschlägt", async () => {
      mockAuth.mockResolvedValue(authenticatedSession);
      mockGetSsoConfig.mockReturnValue(validSsoConfig);
      mockDiscoverAuthorizationEndpoint.mockRejectedValue(
        new Error("Network error")
      );

      const res = await GET();

      expect(res.status).toBe(503);
    });
  });
});
