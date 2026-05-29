/**
 * Property-based tests for SSO Authentication
 *
 * Tests the OIDC provider configuration and signIn callback logic in auth.ts
 * for SSO via Authentik (OpenID Connect).
 *
 * Feature: login-enhancements
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fc from "fast-check";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock Prisma
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

// Mock log-service
vi.mock("@/lib/services/log-service", () => ({
  logAudit: vi.fn(),
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGIN_FAILED: "LOGIN_FAILED",
  SSO_AUTH_SUCCESS: "SSO_AUTH_SUCCESS",
  SSO_AUTH_FAILED: "SSO_AUTH_FAILED",
}));

// Mock system-setting-service
vi.mock("@/lib/services/system-setting-service", () => ({
  getSsoAutoCreateAccounts: vi.fn(),
}));

// Mock auth-env config
vi.mock("@/lib/config/auth-env", () => ({
  getSsoConfig: vi.fn(),
  getWebAuthnConfig: () => ({
    rpId: "localhost",
    rpName: "Lyco",
    origin: "http://localhost:3000",
  }),
}));

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({
    get: (name: string) => {
      if (name === "x-forwarded-for") return "127.0.0.1";
      return null;
    },
  })),
}));

// Mock auth.config
vi.mock("@/lib/auth.config", () => ({
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

// Mock next-auth
vi.mock("next-auth", () => {
  return {
    default: vi.fn((config: Record<string, unknown>) => {
      return {
        handlers: {},
        auth: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn(),
        __config: config,
      };
    }),
    customFetch: Symbol("customFetch"),
  };
});

// Mock next-auth/providers/credentials
vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn((config: unknown) => ({ ...config as object, type: "credentials" })),
}));

// Mock next-auth/providers/authentik
vi.mock("next-auth/providers/authentik", () => ({
  default: vi.fn((config: unknown) => ({ ...config as object, type: "oauth", id: "authentik" })),
}));

import { prisma } from "@/lib/prisma";
import { getSsoConfig } from "@/lib/config/auth-env";
import { getSsoAutoCreateAccounts } from "@/lib/services/system-setting-service";

const mockPrisma = vi.mocked(prisma);
const mockGetSsoConfig = vi.mocked(getSsoConfig);
const mockGetSsoAutoCreateAccounts = vi.mocked(getSsoAutoCreateAccounts);


// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const emailArb = fc.emailAddress();
const nameArb = fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0);
const userIdArb = fc.uuid();
const providerAccountIdArb = fc.uuid();
const issuerUrlArb = fc.constantFrom(
  "https://auth.example.com",
  "https://sso.company.org",
  "https://authentik.local/application/o/lyco"
);
const clientIdArb = fc.stringMatching(/^[0-9a-f]{16,32}$/);
const clientSecretArb = fc.stringMatching(/^[0-9a-f]{32,64}$/);

// ---------------------------------------------------------------------------
// Helper: get signIn callback from auth.ts
// ---------------------------------------------------------------------------

/**
 * Dynamically imports auth.ts and extracts the signIn callback.
 * We need to re-import after setting up mocks for each test scenario.
 */
async function getSignInCallback() {
  // Reset module cache to get fresh import with current mock state
  vi.resetModules();

  // Re-apply mocks after resetModules
  vi.doMock("next/headers", () => ({
    headers: vi.fn(async () => ({
      get: (name: string) => {
        if (name === "x-forwarded-for") return "127.0.0.1";
        return null;
      },
    })),
  }));
  vi.doMock("@/lib/prisma", () => ({
    prisma: mockPrisma,
  }));
  vi.doMock("@/lib/services/log-service", () => ({
    logAudit: vi.fn(),
    LOGIN_SUCCESS: "LOGIN_SUCCESS",
    LOGIN_FAILED: "LOGIN_FAILED",
    SSO_AUTH_SUCCESS: "SSO_AUTH_SUCCESS",
    SSO_AUTH_FAILED: "SSO_AUTH_FAILED",
  }));
  vi.doMock("@/lib/services/system-setting-service", () => ({
    getSsoAutoCreateAccounts: mockGetSsoAutoCreateAccounts,
  }));
  vi.doMock("@/lib/config/auth-env", () => ({
    getSsoConfig: mockGetSsoConfig,
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

  await import("@/lib/auth");

  if (!capturedConfig) {
    throw new Error("NextAuth config was not captured");
  }

  const callbacks = capturedConfig.callbacks as Record<string, Function>;
  return callbacks.signIn;
}

/**
 * Gets the Authentik provider config from the captured NextAuth config.
 */
async function getAuthentikProviderConfig() {
  vi.resetModules();

  let capturedAuthentikConfig: Record<string, unknown> | null = null;

  vi.doMock("next/headers", () => ({
    headers: vi.fn(async () => ({
      get: (name: string) => {
        if (name === "x-forwarded-for") return "127.0.0.1";
        return null;
      },
    })),
  }));
  vi.doMock("@/lib/prisma", () => ({
    prisma: mockPrisma,
  }));
  vi.doMock("@/lib/services/log-service", () => ({
    logAudit: vi.fn(),
    LOGIN_SUCCESS: "LOGIN_SUCCESS",
    LOGIN_FAILED: "LOGIN_FAILED",
    SSO_AUTH_SUCCESS: "SSO_AUTH_SUCCESS",
    SSO_AUTH_FAILED: "SSO_AUTH_FAILED",
  }));
  vi.doMock("@/lib/services/system-setting-service", () => ({
    getSsoAutoCreateAccounts: mockGetSsoAutoCreateAccounts,
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
          }
          return token;
        },
      },
    },
    SESSION_MAX_AGE_DEFAULT: 86400,
    SESSION_MAX_AGE_REMEMBER_ME: 2592000,
  }));
  vi.doMock("next-auth", () => ({
    default: (config: Record<string, unknown>) => {
      return {
        handlers: {},
        auth: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn(),
        __config: config,
      };
    },
    customFetch: Symbol("customFetch"),
  }));
  vi.doMock("next-auth/providers/credentials", () => ({
    default: vi.fn((cfg: unknown) => ({ ...cfg as object, type: "credentials" })),
  }));
  vi.doMock("next-auth/providers/authentik", () => ({
    default: vi.fn((cfg: unknown) => {
      capturedAuthentikConfig = cfg as Record<string, unknown>;
      return { ...cfg as object, type: "oauth", id: "authentik" };
    }),
  }));

  await import("@/lib/auth");

  return capturedAuthentikConfig;
}


// ---------------------------------------------------------------------------
// Feature: login-enhancements, Property 12: ID token validation rejects invalid tokens
// ---------------------------------------------------------------------------
describe("Property 12: ID token validation rejects invalid tokens", () => {
  // Feature: login-enhancements, Property 12: For any ID token, if issuer doesn't match, OR audience doesn't match, OR expiry is past → rejected

  it("OIDC provider is configured so NextAuth validates issuer, audience, and expiry via standard OIDC validation", async () => {
    // **Validates: Requirements 4.5, 6.5**
    //
    // NextAuth's OIDC provider (Authentik) delegates token validation to oauth4webapi,
    // which validates issuer, audience, and expiry as part of the standard OIDC flow.
    // We verify the provider is configured with the correct issuer and clientId,
    // which are used by oauth4webapi for validation.
    await fc.assert(
      fc.asyncProperty(
        issuerUrlArb,
        clientIdArb,
        clientSecretArb,
        async (issuerUrl, clientId, clientSecret) => {
          vi.resetModules();

          let capturedConfig: Record<string, unknown> | null = null;

          vi.doMock("next/headers", () => ({
            headers: vi.fn(async () => ({
              get: () => null,
            })),
          }));
          vi.doMock("@/lib/prisma", () => ({ prisma: mockPrisma }));
          vi.doMock("@/lib/services/log-service", () => ({
            logAudit: vi.fn(),
            LOGIN_SUCCESS: "LOGIN_SUCCESS",
            LOGIN_FAILED: "LOGIN_FAILED",
            SSO_AUTH_SUCCESS: "SSO_AUTH_SUCCESS",
            SSO_AUTH_FAILED: "SSO_AUTH_FAILED",
          }));
          vi.doMock("@/lib/services/system-setting-service", () => ({
            getSsoAutoCreateAccounts: mockGetSsoAutoCreateAccounts,
          }));
          vi.doMock("@/lib/config/auth-env", () => ({
            getSsoConfig: () => ({ clientId, clientSecret, issuerUrl }),
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
                jwt: async ({ token }: { token: Record<string, unknown> }) => token,
              },
            },
            SESSION_MAX_AGE_DEFAULT: 86400,
            SESSION_MAX_AGE_REMEMBER_ME: 2592000,
          }));
          vi.doMock("next-auth/providers/credentials", () => ({
            default: vi.fn((cfg: unknown) => ({ ...cfg as object, type: "credentials" })),
          }));
          vi.doMock("next-auth/providers/authentik", () => ({
            default: vi.fn((cfg: unknown) => {
              capturedConfig = cfg as Record<string, unknown>;
              return { ...cfg as object, type: "oauth", id: "authentik" };
            }),
          }));
          vi.doMock("next-auth", () => ({
            default: (config: Record<string, unknown>) => ({
              handlers: {},
              auth: vi.fn(),
              signIn: vi.fn(),
              signOut: vi.fn(),
            }),
            customFetch: Symbol("customFetch"),
          }));

          await import("@/lib/auth");

          // The Authentik provider must be configured with the correct issuer and clientId
          // These are used by oauth4webapi to validate the ID token's iss and aud claims
          expect(capturedConfig).not.toBeNull();
          expect(capturedConfig!.clientId).toBe(clientId);
          expect(capturedConfig!.clientSecret).toBe(clientSecret);
          expect(capturedConfig!.issuer).toBe(issuerUrl);
        }
      ),
      { numRuns: 20 }
    );
  });

  it("when SSO signIn callback receives no email in profile, authentication is rejected", async () => {
    // **Validates: Requirements 4.5, 6.5**
    // If the ID token doesn't contain a valid email, the signIn callback rejects
    await fc.assert(
      fc.asyncProperty(
        providerAccountIdArb,
        async (providerAccountId) => {
          mockGetSsoConfig.mockReturnValue({
            clientId: "test-client",
            clientSecret: "test-secret",
            issuerUrl: "https://auth.example.com",
          });

          const signInCallback = await getSignInCallback();

          // Call signIn with authentik provider but no email in profile
          const result = await signInCallback({
            user: { id: "temp-id" },
            account: { provider: "authentik", providerAccountId },
            profile: { sub: providerAccountId }, // no email
          });

          // Should redirect to login with error
          expect(result).toBe("/login?error=sso-failed");
        }
      ),
      { numRuns: 20 }
    );
  });
});


// ---------------------------------------------------------------------------
// Feature: login-enhancements, Property 13: SSO account matching and creation
// ---------------------------------------------------------------------------
describe("Property 13: SSO account matching and creation", () => {
  // Feature: login-enhancements, Property 13: For any valid ID token: if account exists → authenticate; if no account + auto-create enabled → create account (role USER, status ACTIVE); if no account + auto-create disabled → denied

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSsoConfig.mockReturnValue({
      clientId: "test-client",
      clientSecret: "test-secret",
      issuerUrl: "https://auth.example.com",
    });
  });

  it("if account with email exists and is ACTIVE, user is authenticated to that account", async () => {
    // **Validates: Requirements 4.6, 5.2**
    await fc.assert(
      fc.asyncProperty(
        emailArb,
        nameArb,
        userIdArb,
        providerAccountIdArb,
        fc.constantFrom("ADMIN" as const, "USER" as const),
        async (email, name, userId, providerAccountId, role) => {
          mockPrisma.user.findUnique.mockResolvedValue({
            id: userId,
            accountStatus: "ACTIVE",
            name,
            role,
          } as any);
          mockPrisma.ssoAccount.upsert.mockResolvedValue({} as any);

          const signInCallback = await getSignInCallback();

          const user: Record<string, unknown> = { id: "temp-id" };
          const result = await signInCallback({
            user,
            account: { provider: "authentik", providerAccountId },
            profile: { sub: providerAccountId, email, name },
          });

          // Should allow sign-in
          expect(result).toBe(true);

          // User object should be populated with existing account data
          expect(user.id).toBe(userId);
          expect(user.role).toBe(role);
          expect(user.accountStatus).toBe("ACTIVE");
          expect(user.authMethod).toBe("sso");
        }
      ),
      { numRuns: 20 }
    );
  });

  it("if no account exists and auto-create is enabled, new account created with role USER, status ACTIVE", async () => {
    // **Validates: Requirements 4.7, 5.2, 5.3**
    await fc.assert(
      fc.asyncProperty(
        emailArb,
        nameArb,
        userIdArb,
        providerAccountIdArb,
        async (email, displayName, newUserId, providerAccountId) => {
          // No existing user
          mockPrisma.user.findUnique.mockResolvedValue(null);
          // Auto-create enabled
          mockGetSsoAutoCreateAccounts.mockResolvedValue(true);
          // User creation returns new user
          mockPrisma.user.create.mockResolvedValue({
            id: newUserId,
            email,
            name: displayName,
            role: "USER",
            accountStatus: "ACTIVE",
          } as any);
          mockPrisma.ssoAccount.create.mockResolvedValue({} as any);

          const signInCallback = await getSignInCallback();

          const user: Record<string, unknown> = { id: "temp-id" };
          const result = await signInCallback({
            user,
            account: { provider: "authentik", providerAccountId },
            profile: { sub: providerAccountId, email, name: displayName },
          });

          // Should allow sign-in
          expect(result).toBe(true);

          // User should be created with correct role and status
          expect(mockPrisma.user.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
              email,
              role: "USER",
              accountStatus: "ACTIVE",
            }),
          });

          // User object should be populated with new account data
          expect(user.id).toBe(newUserId);
          expect(user.role).toBe("USER");
          expect(user.accountStatus).toBe("ACTIVE");
          expect(user.authMethod).toBe("sso");
        }
      ),
      { numRuns: 20 }
    );
  });

  it("if no account exists and auto-create is disabled, authentication is denied", async () => {
    // **Validates: Requirements 4.8, 5.3**
    await fc.assert(
      fc.asyncProperty(
        emailArb,
        nameArb,
        providerAccountIdArb,
        async (email, name, providerAccountId) => {
          // No existing user
          mockPrisma.user.findUnique.mockResolvedValue(null);
          // Auto-create disabled
          mockGetSsoAutoCreateAccounts.mockResolvedValue(false);

          const signInCallback = await getSignInCallback();

          const result = await signInCallback({
            user: { id: "temp-id" },
            account: { provider: "authentik", providerAccountId },
            profile: { sub: providerAccountId, email, name },
          });

          // Should redirect to login with no-account error
          expect(result).toBe("/login?error=no-account");

          // No user should be created
          expect(mockPrisma.user.create).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 20 }
    );
  });
});


// ---------------------------------------------------------------------------
// Feature: login-enhancements, Property 14: Non-ACTIVE accounts denied SSO login
// ---------------------------------------------------------------------------
describe("Property 14: Non-ACTIVE accounts denied SSO login", () => {
  // Feature: login-enhancements, Property 14: For any SSO auth where matched account has status SUSPENDED or PENDING → denied regardless of token validity

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSsoConfig.mockReturnValue({
      clientId: "test-client",
      clientSecret: "test-secret",
      issuerUrl: "https://auth.example.com",
    });
  });

  it("SUSPENDED accounts are denied SSO login with suspended error", async () => {
    // **Validates: Requirements 5.5**
    await fc.assert(
      fc.asyncProperty(
        emailArb,
        nameArb,
        userIdArb,
        providerAccountIdArb,
        async (email, name, userId, providerAccountId) => {
          mockPrisma.user.findUnique.mockResolvedValue({
            id: userId,
            accountStatus: "SUSPENDED",
            name,
            role: "USER",
          } as any);

          const signInCallback = await getSignInCallback();

          const result = await signInCallback({
            user: { id: "temp-id" },
            account: { provider: "authentik", providerAccountId },
            profile: { sub: providerAccountId, email, name },
          });

          // Should redirect to login with suspended error
          expect(result).toBe("/login?error=suspended");

          // No SsoAccount should be created/updated
          expect(mockPrisma.ssoAccount.upsert).not.toHaveBeenCalled();
          expect(mockPrisma.ssoAccount.create).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 20 }
    );
  });

  it("PENDING accounts are denied SSO login with pending error", async () => {
    // **Validates: Requirements 5.6**
    await fc.assert(
      fc.asyncProperty(
        emailArb,
        nameArb,
        userIdArb,
        providerAccountIdArb,
        async (email, name, userId, providerAccountId) => {
          mockPrisma.user.findUnique.mockResolvedValue({
            id: userId,
            accountStatus: "PENDING",
            name,
            role: "USER",
          } as any);

          const signInCallback = await getSignInCallback();

          const result = await signInCallback({
            user: { id: "temp-id" },
            account: { provider: "authentik", providerAccountId },
            profile: { sub: providerAccountId, email, name },
          });

          // Should redirect to login with pending error
          expect(result).toBe("/login?error=pending");

          // No SsoAccount should be created/updated
          expect(mockPrisma.ssoAccount.upsert).not.toHaveBeenCalled();
          expect(mockPrisma.ssoAccount.create).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 20 }
    );
  });

  it("for any non-ACTIVE status (SUSPENDED or PENDING), SSO login is denied regardless of other factors", async () => {
    // **Validates: Requirements 5.5, 5.6**
    await fc.assert(
      fc.asyncProperty(
        emailArb,
        nameArb,
        userIdArb,
        providerAccountIdArb,
        fc.constantFrom("SUSPENDED" as const, "PENDING" as const),
        fc.constantFrom("ADMIN" as const, "USER" as const),
        async (email, name, userId, providerAccountId, accountStatus, role) => {
          mockPrisma.user.findUnique.mockResolvedValue({
            id: userId,
            accountStatus,
            name,
            role,
          } as any);

          const signInCallback = await getSignInCallback();

          const result = await signInCallback({
            user: { id: "temp-id" },
            account: { provider: "authentik", providerAccountId },
            profile: { sub: providerAccountId, email, name },
          });

          // Should be denied (redirect to login with error)
          expect(result).not.toBe(true);
          expect(typeof result).toBe("string");
          expect(result).toMatch(/\/login\?error=(suspended|pending)/);
        }
      ),
      { numRuns: 20 }
    );
  });
});


// ---------------------------------------------------------------------------
// Feature: login-enhancements, Property 15: State parameter validation
// ---------------------------------------------------------------------------
describe("Property 15: State parameter validation", () => {
  // Feature: login-enhancements, Property 15: For any OIDC callback where state doesn't match → aborted

  it("OIDC provider configuration includes 'state' in checks array", async () => {
    // **Validates: Requirements 4.9**
    //
    // NextAuth's OIDC provider with checks: ["state"] ensures that the state
    // parameter is validated on callback. If state doesn't match, NextAuth/oauth4webapi
    // aborts the authentication automatically.
    await fc.assert(
      fc.asyncProperty(
        issuerUrlArb,
        clientIdArb,
        clientSecretArb,
        async (issuerUrl, clientId, clientSecret) => {
          vi.resetModules();

          let capturedConfig: Record<string, unknown> | null = null;

          vi.doMock("next/headers", () => ({
            headers: vi.fn(async () => ({
              get: () => null,
            })),
          }));
          vi.doMock("@/lib/prisma", () => ({ prisma: mockPrisma }));
          vi.doMock("@/lib/services/log-service", () => ({
            logAudit: vi.fn(),
            LOGIN_SUCCESS: "LOGIN_SUCCESS",
            LOGIN_FAILED: "LOGIN_FAILED",
            SSO_AUTH_SUCCESS: "SSO_AUTH_SUCCESS",
            SSO_AUTH_FAILED: "SSO_AUTH_FAILED",
          }));
          vi.doMock("@/lib/services/system-setting-service", () => ({
            getSsoAutoCreateAccounts: mockGetSsoAutoCreateAccounts,
          }));
          vi.doMock("@/lib/config/auth-env", () => ({
            getSsoConfig: () => ({ clientId, clientSecret, issuerUrl }),
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
                jwt: async ({ token }: { token: Record<string, unknown> }) => token,
              },
            },
            SESSION_MAX_AGE_DEFAULT: 86400,
            SESSION_MAX_AGE_REMEMBER_ME: 2592000,
          }));
          vi.doMock("next-auth/providers/credentials", () => ({
            default: vi.fn((cfg: unknown) => ({ ...cfg as object, type: "credentials" })),
          }));
          vi.doMock("next-auth/providers/authentik", () => ({
            default: vi.fn((cfg: unknown) => {
              capturedConfig = cfg as Record<string, unknown>;
              return { ...cfg as object, type: "oauth", id: "authentik" };
            }),
          }));
          vi.doMock("next-auth", () => ({
            default: () => ({
              handlers: {},
              auth: vi.fn(),
              signIn: vi.fn(),
              signOut: vi.fn(),
            }),
            customFetch: Symbol("customFetch"),
          }));

          await import("@/lib/auth");

          // The provider must include "state" in checks
          expect(capturedConfig).not.toBeNull();
          const checks = capturedConfig!.checks as string[];
          expect(checks).toContain("state");
        }
      ),
      { numRuns: 20 }
    );
  });
});


// ---------------------------------------------------------------------------
// Feature: login-enhancements, Property 16: PKCE parameters in authorization request
// ---------------------------------------------------------------------------
describe("Property 16: PKCE parameters in authorization request", () => {
  // Feature: login-enhancements, Property 16: For any SSO login initiation, authorization redirect includes code_challenge (S256), random state, scope "openid email profile"

  it("OIDC provider configuration includes 'pkce' in checks and scope 'openid email profile'", async () => {
    // **Validates: Requirements 4.2, 6.6**
    //
    // NextAuth's OIDC provider with checks: ["pkce"] ensures PKCE (S256) is used.
    // The scope parameter ensures "openid email profile" is requested.
    await fc.assert(
      fc.asyncProperty(
        issuerUrlArb,
        clientIdArb,
        clientSecretArb,
        async (issuerUrl, clientId, clientSecret) => {
          vi.resetModules();

          let capturedConfig: Record<string, unknown> | null = null;

          vi.doMock("next/headers", () => ({
            headers: vi.fn(async () => ({
              get: () => null,
            })),
          }));
          vi.doMock("@/lib/prisma", () => ({ prisma: mockPrisma }));
          vi.doMock("@/lib/services/log-service", () => ({
            logAudit: vi.fn(),
            LOGIN_SUCCESS: "LOGIN_SUCCESS",
            LOGIN_FAILED: "LOGIN_FAILED",
            SSO_AUTH_SUCCESS: "SSO_AUTH_SUCCESS",
            SSO_AUTH_FAILED: "SSO_AUTH_FAILED",
          }));
          vi.doMock("@/lib/services/system-setting-service", () => ({
            getSsoAutoCreateAccounts: mockGetSsoAutoCreateAccounts,
          }));
          vi.doMock("@/lib/config/auth-env", () => ({
            getSsoConfig: () => ({ clientId, clientSecret, issuerUrl }),
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
                jwt: async ({ token }: { token: Record<string, unknown> }) => token,
              },
            },
            SESSION_MAX_AGE_DEFAULT: 86400,
            SESSION_MAX_AGE_REMEMBER_ME: 2592000,
          }));
          vi.doMock("next-auth/providers/credentials", () => ({
            default: vi.fn((cfg: unknown) => ({ ...cfg as object, type: "credentials" })),
          }));
          vi.doMock("next-auth/providers/authentik", () => ({
            default: vi.fn((cfg: unknown) => {
              capturedConfig = cfg as Record<string, unknown>;
              return { ...cfg as object, type: "oauth", id: "authentik" };
            }),
          }));
          vi.doMock("next-auth", () => ({
            default: () => ({
              handlers: {},
              auth: vi.fn(),
              signIn: vi.fn(),
              signOut: vi.fn(),
            }),
            customFetch: Symbol("customFetch"),
          }));

          await import("@/lib/auth");

          expect(capturedConfig).not.toBeNull();

          // Must include "pkce" in checks for PKCE S256 code_challenge
          const checks = capturedConfig!.checks as string[];
          expect(checks).toContain("pkce");

          // Must include correct scope
          const authorization = capturedConfig!.authorization as { params: { scope: string } };
          expect(authorization).toBeDefined();
          expect(authorization.params).toBeDefined();
          expect(authorization.params.scope).toBe("openid email profile");
        }
      ),
      { numRuns: 20 }
    );
  });

  it("OIDC provider checks include both 'pkce' and 'state' together", async () => {
    // **Validates: Requirements 4.2, 6.6**
    // Both PKCE and state must be present for a secure authorization flow
    await fc.assert(
      fc.asyncProperty(
        issuerUrlArb,
        clientIdArb,
        clientSecretArb,
        async (issuerUrl, clientId, clientSecret) => {
          vi.resetModules();

          let capturedConfig: Record<string, unknown> | null = null;

          vi.doMock("next/headers", () => ({
            headers: vi.fn(async () => ({
              get: () => null,
            })),
          }));
          vi.doMock("@/lib/prisma", () => ({ prisma: mockPrisma }));
          vi.doMock("@/lib/services/log-service", () => ({
            logAudit: vi.fn(),
            LOGIN_SUCCESS: "LOGIN_SUCCESS",
            LOGIN_FAILED: "LOGIN_FAILED",
            SSO_AUTH_SUCCESS: "SSO_AUTH_SUCCESS",
            SSO_AUTH_FAILED: "SSO_AUTH_FAILED",
          }));
          vi.doMock("@/lib/services/system-setting-service", () => ({
            getSsoAutoCreateAccounts: mockGetSsoAutoCreateAccounts,
          }));
          vi.doMock("@/lib/config/auth-env", () => ({
            getSsoConfig: () => ({ clientId, clientSecret, issuerUrl }),
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
                jwt: async ({ token }: { token: Record<string, unknown> }) => token,
              },
            },
            SESSION_MAX_AGE_DEFAULT: 86400,
            SESSION_MAX_AGE_REMEMBER_ME: 2592000,
          }));
          vi.doMock("next-auth/providers/credentials", () => ({
            default: vi.fn((cfg: unknown) => ({ ...cfg as object, type: "credentials" })),
          }));
          vi.doMock("next-auth/providers/authentik", () => ({
            default: vi.fn((cfg: unknown) => {
              capturedConfig = cfg as Record<string, unknown>;
              return { ...cfg as object, type: "oauth", id: "authentik" };
            }),
          }));
          vi.doMock("next-auth", () => ({
            default: () => ({
              handlers: {},
              auth: vi.fn(),
              signIn: vi.fn(),
              signOut: vi.fn(),
            }),
            customFetch: Symbol("customFetch"),
          }));

          await import("@/lib/auth");

          expect(capturedConfig).not.toBeNull();
          const checks = capturedConfig!.checks as string[];
          expect(checks).toContain("pkce");
          expect(checks).toContain("state");
          expect(checks.length).toBeGreaterThanOrEqual(2);
        }
      ),
      { numRuns: 20 }
    );
  });
});
