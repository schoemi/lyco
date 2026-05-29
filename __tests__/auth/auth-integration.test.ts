/**
 * Integration tests for end-to-end authentication flows
 *
 * Tests the full flows with mocked external dependencies (WebAuthn browser API,
 * Authentik OIDC provider, Prisma database).
 *
 * Feature: login-enhancements
 * Validates: Requirements 1.2, 2.3, 3.3, 4.6
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/services/passkey-service", () => ({
  generateRegistrationOptions: vi.fn(),
  verifyRegistration: vi.fn(),
  generateAuthenticationOptions: vi.fn(),
  verifyAuthentication: vi.fn(),
  listPasskeys: vi.fn(),
}));

vi.mock("@/lib/services/passkey-rate-limiter", () => ({
  checkPasskeyRegistrationRateLimit: vi.fn(),
}));

vi.mock("@/lib/services/passkey-auth-rate-limiter", () => ({
  checkPasskeyAuthRateLimit: vi.fn(),
  recordFailedPasskeyAuth: vi.fn(),
}));

vi.mock("@/lib/utils/request-ip", () => ({
  getClientIp: vi.fn().mockReturnValue("10.0.0.1"),
}));

vi.mock("@/lib/services/log-service", () => ({
  logAudit: vi.fn(),
  PASSKEY_AUTH_SUCCESS: "PASSKEY_AUTH_SUCCESS",
  PASSKEY_AUTH_FAILED: "PASSKEY_AUTH_FAILED",
  SSO_AUTH_SUCCESS: "SSO_AUTH_SUCCESS",
  SSO_AUTH_FAILED: "SSO_AUTH_FAILED",
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGIN_FAILED: "LOGIN_FAILED",
}));

vi.mock("@/lib/utils/session-cookie", () => ({
  getSessionCookieName: vi.fn().mockReturnValue("authjs.session-token"),
}));

vi.mock("next-auth/jwt", () => ({
  encode: vi.fn().mockResolvedValue("mock-jwt-token-encoded"),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    ssoAccount: {
      upsert: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/services/system-setting-service", () => ({
  getSsoAutoCreateAccounts: vi.fn(),
}));

vi.mock("@/lib/config/auth-env", () => ({
  getSsoConfig: vi.fn(),
  getWebAuthnConfig: () => ({
    rpId: "localhost",
    rpName: "Lyco",
    origin: "http://localhost:3000",
  }),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({
    get: (name: string) => {
      if (name === "x-forwarded-for") return "10.0.0.1";
      return null;
    },
  })),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { auth } from "@/lib/auth";
import {
  generateRegistrationOptions,
  verifyRegistration,
  generateAuthenticationOptions,
  verifyAuthentication,
  listPasskeys,
} from "@/lib/services/passkey-service";
import { checkPasskeyRegistrationRateLimit } from "@/lib/services/passkey-rate-limiter";
import {
  checkPasskeyAuthRateLimit,
  recordFailedPasskeyAuth,
} from "@/lib/services/passkey-auth-rate-limiter";
import { logAudit } from "@/lib/services/log-service";
import { encode } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { getSsoAutoCreateAccounts } from "@/lib/services/system-setting-service";
import { getSsoConfig } from "@/lib/config/auth-env";

// Auth config (for remember-me tests)
import { authConfig, SESSION_MAX_AGE_DEFAULT, SESSION_MAX_AGE_REMEMBER_ME } from "@/lib/auth.config";

// Route handlers
import { POST as registerOptions } from "@/app/api/auth/passkey/register/options/route";
import { POST as registerVerify } from "@/app/api/auth/passkey/register/verify/route";
import { GET as getCredentials } from "@/app/api/auth/passkey/credentials/route";
import { POST as authenticateOptions } from "@/app/api/auth/passkey/authenticate/options/route";
import { POST as authenticateVerify } from "@/app/api/auth/passkey/authenticate/verify/route";

const mockAuth = vi.mocked(auth);
const mockGenerateRegistrationOptions = vi.mocked(generateRegistrationOptions);
const mockVerifyRegistration = vi.mocked(verifyRegistration);
const mockGenerateAuthOptions = vi.mocked(generateAuthenticationOptions);
const mockVerifyAuthentication = vi.mocked(verifyAuthentication);
const mockListPasskeys = vi.mocked(listPasskeys);
const mockCheckRegRateLimit = vi.mocked(checkPasskeyRegistrationRateLimit);
const mockCheckAuthRateLimit = vi.mocked(checkPasskeyAuthRateLimit);
const mockEncode = vi.mocked(encode);
const mockLogAudit = vi.mocked(logAudit);
const mockPrisma = vi.mocked(prisma);
const mockGetSsoAutoCreateAccounts = vi.mocked(getSsoAutoCreateAccounts);
const mockGetSsoConfig = vi.mocked(getSsoConfig);

function makeRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(`http://localhost${url}`, options);
}

// ---------------------------------------------------------------------------
// Test Suite: Passkey Registration Flow
// ---------------------------------------------------------------------------

describe("Integration: Passkey Registration Flow", () => {
  /**
   * Validates: Requirement 2.3
   * Tests the full passkey registration flow:
   * 1. POST /api/auth/passkey/register/options (authenticated)
   * 2. Simulate WebAuthn response
   * 3. POST /api/auth/passkey/register/verify
   * 4. Verify passkey appears in GET /api/auth/passkey/credentials
   */

  const authenticatedSession = { user: { id: "user-reg-1" } } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(authenticatedSession);
    mockCheckRegRateLimit.mockReturnValue({ allowed: true });
  });

  it("completes full registration flow: options → verify → list", async () => {
    // Step 1: Generate registration options
    const mockOptions = {
      challenge: "reg-challenge-abc123",
      rp: { name: "Lyco", id: "localhost" },
      user: { id: "user-reg-1", name: "test@example.com", displayName: "Test User" },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      timeout: 60000,
      attestation: "none",
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
    };
    mockGenerateRegistrationOptions.mockResolvedValue(mockOptions as any);

    const optionsRes = await registerOptions(
      makeRequest("/api/auth/passkey/register/options", { method: "POST" })
    );
    expect(optionsRes.status).toBe(200);
    const optionsJson = await optionsRes.json();
    expect(optionsJson.options.challenge).toBe("reg-challenge-abc123");
    expect(optionsJson.options.pubKeyCredParams).toHaveLength(2);

    // Step 2: Simulate WebAuthn credential creation response
    const simulatedWebAuthnResponse = {
      id: "credential-id-base64url",
      rawId: "credential-id-base64url",
      type: "public-key",
      response: {
        clientDataJSON: "eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIn0",
        attestationObject: "o2NmbXRkbm9uZQ",
        transports: ["internal"],
      },
      clientExtensionResults: {},
    };

    // Step 3: Verify registration
    const storedPasskey = {
      id: "passkey-id-1",
      name: "MacBook Pro",
      createdAt: new Date("2025-01-15T12:00:00Z"),
    };
    mockVerifyRegistration.mockResolvedValue(storedPasskey);

    const verifyRes = await registerVerify(
      makeRequest("/api/auth/passkey/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential: simulatedWebAuthnResponse,
          name: "MacBook Pro",
        }),
      })
    );
    expect(verifyRes.status).toBe(201);
    const verifyJson = await verifyRes.json();
    expect(verifyJson.passkey.id).toBe("passkey-id-1");
    expect(verifyJson.passkey.name).toBe("MacBook Pro");

    // Step 4: Verify passkey appears in credentials list
    mockListPasskeys.mockResolvedValue([storedPasskey]);

    const listRes = await getCredentials();
    expect(listRes.status).toBe(200);
    const listJson = await listRes.json();
    expect(listJson.passkeys).toHaveLength(1);
    expect(listJson.passkeys[0].id).toBe("passkey-id-1");
    expect(listJson.passkeys[0].name).toBe("MacBook Pro");

    // Verify service was called with correct user ID
    expect(mockGenerateRegistrationOptions).toHaveBeenCalledWith("user-reg-1");
    expect(mockVerifyRegistration).toHaveBeenCalledWith(
      "user-reg-1",
      simulatedWebAuthnResponse,
      "MacBook Pro"
    );
    expect(mockListPasskeys).toHaveBeenCalledWith("user-reg-1");
  });

  it("rejects registration when user is not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const optionsRes = await registerOptions(
      makeRequest("/api/auth/passkey/register/options", { method: "POST" })
    );
    expect(optionsRes.status).toBe(401);

    const verifyRes = await registerVerify(
      makeRequest("/api/auth/passkey/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: {}, name: "Test" }),
      })
    );
    expect(verifyRes.status).toBe(401);
  });

  it("rejects registration when max passkeys reached at options step", async () => {
    mockGenerateRegistrationOptions.mockRejectedValue(
      new Error("Maximale Anzahl von 10 Passkeys erreicht. Bitte löschen Sie einen bestehenden Passkey.")
    );

    const res = await registerOptions(
      makeRequest("/api/auth/passkey/register/options", { method: "POST" })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Maximale Anzahl von 10 Passkeys");
  });

  it("rejects registration when challenge has expired", async () => {
    mockVerifyRegistration.mockRejectedValue(
      new Error("Die Sicherheitsabfrage ist abgelaufen. Bitte starten Sie den Vorgang erneut.")
    );

    const res = await registerVerify(
      makeRequest("/api/auth/passkey/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: { id: "cred-1" }, name: "Test Key" }),
      })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Sicherheitsabfrage ist abgelaufen");
  });
});


// ---------------------------------------------------------------------------
// Test Suite: Passkey Authentication Flow
// ---------------------------------------------------------------------------

describe("Integration: Passkey Authentication Flow", () => {
  /**
   * Validates: Requirement 3.3
   * Tests the full passkey authentication flow:
   * 1. POST /api/auth/passkey/authenticate/options
   * 2. Simulate WebAuthn assertion
   * 3. POST /api/auth/passkey/authenticate/verify
   * 4. Verify session cookie is set
   */

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckAuthRateLimit.mockReturnValue({ allowed: true });
    mockEncode.mockResolvedValue("mock-jwt-token-encoded");
    process.env.AUTH_SECRET = "integration-test-secret";
  });

  afterEach(() => {
    delete process.env.AUTH_SECRET;
  });

  it("completes full authentication flow: options → verify → session cookie", async () => {
    // Step 1: Generate authentication options (public endpoint, no auth needed)
    const mockAuthOptions = {
      challenge: "auth-challenge-xyz789",
      timeout: 60000,
      rpId: "localhost",
      allowCredentials: [], // Discoverable credentials
      userVerification: "preferred" as const,
    };
    mockGenerateAuthOptions.mockResolvedValue(mockAuthOptions);

    const optionsRes = await authenticateOptions(
      makeRequest("/api/auth/passkey/authenticate/options", { method: "POST" })
    );
    expect(optionsRes.status).toBe(200);
    const optionsJson = await optionsRes.json();
    expect(optionsJson.options.challenge).toBe("auth-challenge-xyz789");
    expect(optionsJson.options.allowCredentials).toEqual([]);

    // Step 2: Simulate WebAuthn assertion response
    const simulatedAssertion = {
      id: "credential-id-base64url",
      rawId: "credential-id-base64url",
      type: "public-key",
      response: {
        clientDataJSON: "eyJ0eXBlIjoid2ViYXV0aG4uZ2V0In0",
        authenticatorData: "SZYN5YgOjGh0NBcPZHZgW4_krrmihjLHmVzzuoMdl2MFAAAAAQ",
        signature: "MEUCIQDsample-signature-data",
        userHandle: "dXNlci1pZC0x",
      },
      clientExtensionResults: {},
    };

    // Step 3: Verify authentication
    const authenticatedUser = {
      id: "user-auth-1",
      email: "user@example.com",
      name: "Authenticated User",
      role: "USER" as const,
      accountStatus: "ACTIVE",
      credentialId: "credential-id-base64url",
    };
    mockVerifyAuthentication.mockResolvedValue(authenticatedUser);

    const verifyRes = await authenticateVerify(
      makeRequest("/api/auth/passkey/authenticate/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assertion: simulatedAssertion }),
      })
    );

    expect(verifyRes.status).toBe(200);
    const verifyJson = await verifyRes.json();
    expect(verifyJson.success).toBe(true);
    expect(verifyJson.user.id).toBe("user-auth-1");
    expect(verifyJson.user.email).toBe("user@example.com");

    // Step 4: Verify session cookie is set
    const sessionCookie = verifyRes.cookies.get("authjs.session-token");
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie?.value).toBe("mock-jwt-token-encoded");

    // Verify JWT was created with correct payload (24h session, authMethod=passkey)
    expect(mockEncode).toHaveBeenCalledWith(
      expect.objectContaining({
        token: expect.objectContaining({
          id: "user-auth-1",
          email: "user@example.com",
          role: "USER",
          accountStatus: "ACTIVE",
          authMethod: "passkey",
          rememberMe: false,
        }),
        secret: "integration-test-secret",
        salt: "authjs.session-token",
      })
    );

    // Verify audit log was created for successful authentication
    expect(mockLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "PASSKEY_AUTH_SUCCESS",
        actorId: "user-auth-1",
        details: expect.objectContaining({
          method: "passkey",
          credentialId: "credential-id-base64url",
        }),
      })
    );
  });

  it("denies authentication for suspended accounts after successful assertion", async () => {
    const suspendedUser = {
      id: "user-suspended-1",
      email: "suspended@example.com",
      name: "Suspended User",
      role: "USER" as const,
      accountStatus: "SUSPENDED",
      credentialId: "cred-suspended",
    };
    mockVerifyAuthentication.mockResolvedValue(suspendedUser);

    const res = await authenticateVerify(
      makeRequest("/api/auth/passkey/authenticate/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assertion: { id: "cred-suspended", response: {} },
        }),
      })
    );

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain("Konto wurde gesperrt");

    // No session cookie should be set
    const sessionCookie = res.cookies.get("authjs.session-token");
    expect(sessionCookie).toBeUndefined();
  });

  it("records failed attempts and enforces rate limiting", async () => {
    // First attempt fails
    mockVerifyAuthentication.mockRejectedValue(
      new Error("Passkey-Authentifizierung fehlgeschlagen. Bitte versuchen Sie es erneut.")
    );

    const failRes = await authenticateVerify(
      makeRequest("/api/auth/passkey/authenticate/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assertion: { id: "bad-cred", response: {} } }),
      })
    );
    expect(failRes.status).toBe(401);
    expect(vi.mocked(recordFailedPasskeyAuth)).toHaveBeenCalledWith("10.0.0.1");

    // After too many failures, rate limit kicks in
    mockCheckAuthRateLimit.mockReturnValue({ allowed: false, retryAfter: 600 });

    const rateLimitedRes = await authenticateVerify(
      makeRequest("/api/auth/passkey/authenticate/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assertion: { id: "any-cred", response: {} } }),
      })
    );
    expect(rateLimitedRes.status).toBe(429);
    expect(rateLimitedRes.headers.get("Retry-After")).toBe("600");
  });

  it("rejects compromised credentials", async () => {
    mockVerifyAuthentication.mockRejectedValue(
      new Error("Sicherheitsproblem erkannt. Dieser Passkey wurde deaktiviert. Bitte registrieren Sie einen neuen Passkey.")
    );

    const res = await authenticateVerify(
      makeRequest("/api/auth/passkey/authenticate/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assertion: { id: "compromised-cred", response: {} },
        }),
      })
    );

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain("Sicherheitsproblem erkannt");
  });
});


// ---------------------------------------------------------------------------
// Test Suite: SSO Login Flow
// ---------------------------------------------------------------------------

describe("Integration: SSO Login Flow", () => {
  /**
   * Validates: Requirement 4.6
   * Tests the SSO login flow with mocked Authentik responses.
   * Since the signIn callback is inside auth.ts which is mocked at the top level
   * for route handler tests, we use a fresh module import approach.
   *
   * Flow tested:
   * 1. Simulate the signIn callback with mocked Authentik profile data
   * 2. Verify account matching/creation
   * 3. Verify session creation (user object populated for JWT)
   */

  /**
   * Helper to get the signIn callback from a fresh import of auth.ts.
   * Uses vi.resetModules() + vi.doMock() to bypass the top-level vi.mock.
   */
  async function getSignInCallback() {
    vi.resetModules();

    const localMockPrisma = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      ssoAccount: {
        upsert: vi.fn(),
        create: vi.fn(),
      },
    };

    const localMockGetSsoAutoCreate = vi.fn();

    vi.doMock("next/headers", () => ({
      headers: vi.fn(async () => ({
        get: (name: string) => {
          if (name === "x-forwarded-for") return "10.0.0.1";
          return null;
        },
      })),
    }));
    vi.doMock("@/lib/prisma", () => ({
      prisma: localMockPrisma,
    }));
    vi.doMock("@/lib/services/log-service", () => ({
      logAudit: vi.fn(),
      LOGIN_SUCCESS: "LOGIN_SUCCESS",
      LOGIN_FAILED: "LOGIN_FAILED",
      SSO_AUTH_SUCCESS: "SSO_AUTH_SUCCESS",
      SSO_AUTH_FAILED: "SSO_AUTH_FAILED",
    }));
    vi.doMock("@/lib/services/system-setting-service", () => ({
      getSsoAutoCreateAccounts: localMockGetSsoAutoCreate,
    }));
    vi.doMock("@/lib/config/auth-env", () => ({
      getSsoConfig: () => ({
        clientId: "test-client-id",
        clientSecret: "test-client-secret",
        issuerUrl: "https://auth.example.com",
      }),
      getWebAuthnConfig: () => ({
        rpId: "localhost",
        rpName: "Lyco",
        origin: "http://localhost:3000",
      }),
    }));
    vi.doMock("@/lib/auth.config", () => ({
      authConfig: {
        pages: { signIn: "/login" },
        callbacks: {
          jwt: async ({ token, user }: { token: Record<string, unknown>; user?: Record<string, unknown> }) => {
            if (user) {
              token.id = user.id;
              token.role = user.role;
              token.accountStatus = user.accountStatus;
              token.authMethod = user.authMethod;
            }
            return token;
          },
        },
      },
      SESSION_MAX_AGE_DEFAULT: 86400,
      SESSION_MAX_AGE_REMEMBER_ME: 2592000,
    }));
    vi.doMock("@/lib/services/auth-service", () => ({
      authorize: vi.fn(),
    }));

    let capturedConfig: Record<string, unknown> | null = null;
    vi.doMock("next-auth", () => ({
      default: (config: Record<string, unknown>) => {
        capturedConfig = config;
        return {
          handlers: {},
          auth: vi.fn(),
          signIn: vi.fn(),
          signOut: vi.fn(),
        };
      },
      customFetch: Symbol("customFetch"),
    }));
    vi.doMock("next-auth/providers/credentials", () => ({
      default: vi.fn((cfg: unknown) => ({ ...cfg as object, type: "credentials" })),
    }));
    vi.doMock("next-auth/providers/authentik", () => ({
      default: vi.fn((cfg: unknown) => ({ ...cfg as object, type: "oauth", id: "authentik" })),
    }));

    // Also mock the auth-service since credentials provider uses it
    vi.doMock("@/lib/services/auth-service", () => ({
      authorize: vi.fn(),
    }));

    // Unmock @/lib/auth so the real module is imported (overrides top-level vi.mock)
    vi.doUnmock("@/lib/auth");

    await import("@/lib/auth");

    if (!capturedConfig) {
      throw new Error("NextAuth config was not captured");
    }

    const callbacks = capturedConfig.callbacks as Record<string, Function>;
    return { signIn: callbacks.signIn, prisma: localMockPrisma, getSsoAutoCreateAccounts: localMockGetSsoAutoCreate };
  }

  it("matches existing ACTIVE account and creates session", async () => {
    const { signIn: signInCallback, prisma: localPrisma } = await getSignInCallback();

    const existingUser = {
      id: "existing-user-1",
      accountStatus: "ACTIVE",
      name: "Existing User",
      role: "USER",
    };
    localPrisma.user.findUnique.mockResolvedValue(existingUser as any);
    localPrisma.ssoAccount.upsert.mockResolvedValue({} as any);

    const user: Record<string, unknown> = { id: "temp-id" };
    const result = await signInCallback({
      user,
      account: { provider: "authentik", providerAccountId: "sso-account-id-1" },
      profile: {
        sub: "sso-account-id-1",
        email: "existing@example.com",
        name: "Existing User",
      },
    });

    // Should allow sign-in
    expect(result).toBe(true);

    // User object should be populated with existing account data for JWT
    expect(user.id).toBe("existing-user-1");
    expect(user.role).toBe("USER");
    expect(user.accountStatus).toBe("ACTIVE");
    expect(user.authMethod).toBe("sso");

    // SsoAccount should be linked
    expect(localPrisma.ssoAccount.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          provider_providerAccountId: {
            provider: "authentik",
            providerAccountId: "sso-account-id-1",
          },
        },
        create: expect.objectContaining({
          userId: "existing-user-1",
          provider: "authentik",
          providerAccountId: "sso-account-id-1",
        }),
      })
    );
  });

  it("creates new account when auto-create is enabled and no account exists", async () => {
    const { signIn: signInCallback, prisma: localPrisma, getSsoAutoCreateAccounts: localAutoCreate } = await getSignInCallback();

    localPrisma.user.findUnique.mockResolvedValue(null);
    localAutoCreate.mockResolvedValue(true);
    localPrisma.user.create.mockResolvedValue({
      id: "new-user-1",
      email: "new@example.com",
      name: "New SSO User",
      role: "USER",
      accountStatus: "ACTIVE",
    } as any);
    localPrisma.ssoAccount.create.mockResolvedValue({} as any);

    const user: Record<string, unknown> = { id: "temp-id" };
    const result = await signInCallback({
      user,
      account: { provider: "authentik", providerAccountId: "new-sso-id" },
      profile: {
        sub: "new-sso-id",
        email: "new@example.com",
        name: "New SSO User",
      },
    });

    // Should allow sign-in
    expect(result).toBe(true);

    // New user should be created with correct role and status
    expect(localPrisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "new@example.com",
        name: "New SSO User",
        role: "USER",
        accountStatus: "ACTIVE",
      }),
    });

    // User object should be populated for JWT
    expect(user.id).toBe("new-user-1");
    expect(user.role).toBe("USER");
    expect(user.accountStatus).toBe("ACTIVE");
    expect(user.authMethod).toBe("sso");
  });

  it("denies login when no account exists and auto-create is disabled", async () => {
    const { signIn: signInCallback, prisma: localPrisma, getSsoAutoCreateAccounts: localAutoCreate } = await getSignInCallback();

    localPrisma.user.findUnique.mockResolvedValue(null);
    localAutoCreate.mockResolvedValue(false);

    const result = await signInCallback({
      user: { id: "temp-id" },
      account: { provider: "authentik", providerAccountId: "unknown-sso-id" },
      profile: {
        sub: "unknown-sso-id",
        email: "unknown@example.com",
        name: "Unknown User",
      },
    });

    // Should redirect to login with no-account error
    expect(result).toBe("/login?error=no-account");

    // No user should be created
    expect(localPrisma.user.create).not.toHaveBeenCalled();
  });

  it("denies login for SUSPENDED accounts", async () => {
    const { signIn: signInCallback, prisma: localPrisma } = await getSignInCallback();

    localPrisma.user.findUnique.mockResolvedValue({
      id: "suspended-user-1",
      accountStatus: "SUSPENDED",
      name: "Suspended",
      role: "USER",
    } as any);

    const result = await signInCallback({
      user: { id: "temp-id" },
      account: { provider: "authentik", providerAccountId: "sso-id" },
      profile: {
        sub: "sso-id",
        email: "suspended@example.com",
        name: "Suspended",
      },
    });

    expect(result).toBe("/login?error=suspended");
    expect(localPrisma.ssoAccount.upsert).not.toHaveBeenCalled();
  });

  it("denies login for PENDING accounts", async () => {
    const { signIn: signInCallback, prisma: localPrisma } = await getSignInCallback();

    localPrisma.user.findUnique.mockResolvedValue({
      id: "pending-user-1",
      accountStatus: "PENDING",
      name: "Pending",
      role: "USER",
    } as any);

    const result = await signInCallback({
      user: { id: "temp-id" },
      account: { provider: "authentik", providerAccountId: "sso-id" },
      profile: {
        sub: "sso-id",
        email: "pending@example.com",
        name: "Pending",
      },
    });

    expect(result).toBe("/login?error=pending");
    expect(localPrisma.ssoAccount.upsert).not.toHaveBeenCalled();
  });

  it("rejects SSO login when profile has no email", async () => {
    const { signIn: signInCallback } = await getSignInCallback();

    const result = await signInCallback({
      user: { id: "temp-id" },
      account: { provider: "authentik", providerAccountId: "sso-no-email" },
      profile: { sub: "sso-no-email" }, // No email
    });

    expect(result).toBe("/login?error=sso-failed");
  });

  it("passes through non-authentik providers without SSO logic", async () => {
    const { signIn: signInCallback, prisma: localPrisma } = await getSignInCallback();

    const result = await signInCallback({
      user: { id: "user-1" },
      account: { provider: "credentials" },
      profile: undefined,
    });

    // Credentials provider should pass through
    expect(result).toBe(true);
    expect(localPrisma.user.findUnique).not.toHaveBeenCalled();
  });
});


// ---------------------------------------------------------------------------
// Test Suite: Remember-Me Session Persistence
// ---------------------------------------------------------------------------

describe("Integration: Remember-Me Session Persistence", () => {
  /**
   * Validates: Requirement 1.2
   * Tests remember-me session persistence:
   * - JWT callback sets correct expiry based on rememberMe flag
   * - Rolling session extends expiry on subsequent requests
   */

  const jwtCallback = authConfig.callbacks!.jwt! as (params: {
    token: Record<string, unknown>;
    user?: Record<string, unknown>;
    trigger?: string;
  }) => Promise<Record<string, unknown>>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T10:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sets 30-day session when rememberMe is true on initial sign-in", async () => {
    const token: Record<string, unknown> = {};
    const user = {
      id: "user-rm-1",
      role: "USER",
      accountStatus: "ACTIVE",
      rememberMe: true,
      authMethod: "credentials",
    };

    const result = await jwtCallback({ token, user });

    const now = Math.floor(Date.now() / 1000);
    expect(result.exp).toBe(now + SESSION_MAX_AGE_REMEMBER_ME);
    expect(result.rememberMe).toBe(true);
    expect(result.authMethod).toBe("credentials");
    expect(result.id).toBe("user-rm-1");
  });

  it("sets 24-hour session when rememberMe is false on initial sign-in", async () => {
    const token: Record<string, unknown> = {};
    const user = {
      id: "user-rm-2",
      role: "ADMIN",
      accountStatus: "ACTIVE",
      rememberMe: false,
      authMethod: "credentials",
    };

    const result = await jwtCallback({ token, user });

    const now = Math.floor(Date.now() / 1000);
    expect(result.exp).toBe(now + SESSION_MAX_AGE_DEFAULT);
    expect(result.rememberMe).toBe(false);
  });

  it("extends expiry on subsequent requests for remember-me sessions (rolling)", async () => {
    // Simulate a subsequent request (no user object, existing token)
    const existingExp = Math.floor(Date.now() / 1000) + 86400; // 1 day from now
    const token: Record<string, unknown> = {
      id: "user-rm-1",
      role: "USER",
      accountStatus: "ACTIVE",
      rememberMe: true,
      authMethod: "credentials",
      exp: existingExp,
    };

    // Advance time by 1 hour
    vi.advanceTimersByTime(3600 * 1000);

    const result = await jwtCallback({ token });

    // Expiry should be updated to now + 30 days (rolling)
    const now = Math.floor(Date.now() / 1000);
    expect(result.exp).toBe(now + SESSION_MAX_AGE_REMEMBER_ME);
  });

  it("does NOT extend expiry for non-remember-me sessions", async () => {
    const existingExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const token: Record<string, unknown> = {
      id: "user-rm-2",
      role: "USER",
      accountStatus: "ACTIVE",
      rememberMe: false,
      authMethod: "credentials",
      exp: existingExp,
    };

    // Advance time by 30 minutes
    vi.advanceTimersByTime(1800 * 1000);

    const result = await jwtCallback({ token });

    // Expiry should remain unchanged
    expect(result.exp).toBe(existingExp);
  });

  it("passkey authentication creates 24h session (no remember-me)", async () => {
    const token: Record<string, unknown> = {};
    const user = {
      id: "user-pk-1",
      role: "USER",
      accountStatus: "ACTIVE",
      authMethod: "passkey",
      // No rememberMe flag — defaults to false
    };

    const result = await jwtCallback({ token, user });

    const now = Math.floor(Date.now() / 1000);
    expect(result.exp).toBe(now + SESSION_MAX_AGE_DEFAULT);
    expect(result.rememberMe).toBe(false);
    expect(result.authMethod).toBe("passkey");
  });

  it("SSO authentication creates 24h session (no remember-me)", async () => {
    const token: Record<string, unknown> = {};
    const user = {
      id: "user-sso-1",
      role: "USER",
      accountStatus: "ACTIVE",
      authMethod: "sso",
    };

    const result = await jwtCallback({ token, user });

    const now = Math.floor(Date.now() / 1000);
    expect(result.exp).toBe(now + SESSION_MAX_AGE_DEFAULT);
    expect(result.rememberMe).toBe(false);
    expect(result.authMethod).toBe("sso");
  });

  it("session constants are correct", () => {
    expect(SESSION_MAX_AGE_DEFAULT).toBe(86400); // 24 hours
    expect(SESSION_MAX_AGE_REMEMBER_ME).toBe(2592000); // 30 days
  });
});
