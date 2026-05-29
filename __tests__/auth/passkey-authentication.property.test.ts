/**
 * Property-based tests for Passkey Authentication
 *
 * Tests the passkey-service.ts authentication logic and passkey-auth-rate-limiter.ts.
 *
 * Feature: login-enhancements
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fc from "fast-check";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    passkey: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    webAuthnChallenge: {
      create: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock @simplewebauthn/server
vi.mock("@simplewebauthn/server", () => ({
  generateAuthenticationOptions: vi.fn(),
  verifyAuthenticationResponse: vi.fn(),
}));

// Mock @simplewebauthn/server/helpers
vi.mock("@simplewebauthn/server/helpers", () => ({
  isoBase64URL: {
    toBuffer: vi.fn((str: string) => Buffer.from(str, "base64url")),
    fromBuffer: vi.fn((buf: Uint8Array) => Buffer.from(buf).toString("base64url")),
  },
  isoCBOR: {
    decodeFirst: vi.fn(),
  },
}));

// Mock auth-env config
vi.mock("@/lib/config/auth-env", () => ({
  getWebAuthnConfig: () => ({
    rpId: "localhost",
    rpName: "Lyco",
    origin: "http://localhost:3000",
  }),
}));

import { prisma } from "@/lib/prisma";
import { verifyAuthentication } from "@/lib/services/passkey-service";
import { verifyAuthenticationResponse as mockVerifyAuthResponse } from "@simplewebauthn/server";
import {
  checkPasskeyAuthRateLimit,
  recordFailedPasskeyAuth,
  clearAllPasskeyAuthRateLimits,
} from "@/lib/services/passkey-auth-rate-limiter";

const mockPrisma = vi.mocked(prisma);
const mockVerifyAuth = vi.mocked(mockVerifyAuthResponse);

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const userIdArb = fc.uuid();
const credentialIdArb = fc.base64String({ minLength: 16, maxLength: 64 });
const challengeArb = fc.base64String({ minLength: 16, maxLength: 64 });
const ipAddressArb = fc.tuple(
  fc.integer({ min: 1, max: 255 }),
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 1, max: 254 })
).map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`);

/**
 * Generate a stored counter and a presented counter where presented <= stored.
 * The stored counter must be > 0 (per the service logic: counter check only applies when stored > 0).
 */
const counterViolationArb = fc
  .integer({ min: 1, max: 100_000 })
  .chain((storedCounter) =>
    fc.integer({ min: 0, max: storedCounter }).map((presentedCounter) => ({
      storedCounter,
      presentedCounter,
    }))
  );

/**
 * Generate a stored counter and a presented counter where presented > stored (valid).
 */
const validCounterArb = fc
  .integer({ min: 0, max: 100_000 })
  .chain((storedCounter) =>
    fc.integer({ min: storedCounter + 1, max: storedCounter + 10_000 }).map(
      (presentedCounter) => ({
        storedCounter,
        presentedCounter,
      })
    )
  );

// ---------------------------------------------------------------------------
// Feature: login-enhancements, Property 8: Signature counter monotonicity
// ---------------------------------------------------------------------------
describe("Property 8: Signature counter monotonicity", () => {
  // Feature: login-enhancements, Property 8: For any passkey auth attempt, if presented counter ≤ stored counter, auth is rejected AND credential is marked compromised

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("if presented counter ≤ stored counter (stored > 0), authentication is rejected and credential is marked compromised", async () => {
    // **Validates: Requirements 3.8, 6.2**
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        credentialIdArb,
        challengeArb,
        counterViolationArb,
        async (userId, credentialId, challenge, { storedCounter, presentedCounter }) => {
          const now = new Date("2025-06-01T12:00:00Z");
          const passkeyId = "passkey-" + credentialId.slice(0, 8);

          // Mock: credential exists and is not compromised
          mockPrisma.passkey.findUnique.mockResolvedValue({
            id: passkeyId,
            userId,
            credentialId,
            publicKey: Buffer.from([1, 2, 3, 4, 5]),
            counter: storedCounter,
            name: "Test Passkey",
            algorithm: -7,
            transports: ["internal"],
            isCompromised: false,
            createdAt: now,
            user: {
              id: userId,
              email: "test@example.com",
              name: "Test User",
              role: "USER",
              accountStatus: "ACTIVE",
            },
          } as any);

          // Mock: valid challenge exists
          mockPrisma.webAuthnChallenge.findFirst.mockResolvedValue({
            id: "challenge-id",
            challenge,
            userId: null,
            type: "authentication",
            expiresAt: new Date(now.getTime() + 30_000),
            createdAt: new Date(now.getTime() - 30_000),
          });

          // Mock: WebAuthn verification succeeds (assertion is cryptographically valid)
          // but the counter is not monotonically increasing
          mockVerifyAuth.mockResolvedValue({
            verified: true,
            authenticationInfo: {
              credentialID: Buffer.from(credentialId, "base64url"),
              newCounter: presentedCounter,
              credentialDeviceType: "singleDevice",
              credentialBackedUp: false,
              origin: "http://localhost:3000",
              rpID: "localhost",
              userVerified: true,
              authenticatorExtensionResults: undefined,
            },
          });

          mockPrisma.passkey.update.mockResolvedValue({} as any);

          const assertion = {
            id: credentialId,
            rawId: credentialId,
            type: "public-key" as const,
            response: {
              clientDataJSON: "eyJ0eXBlIjoid2ViYXV0aG4uZ2V0In0",
              authenticatorData: "dGVzdC1hdXRoLWRhdGE",
              signature: "dGVzdC1zaWduYXR1cmU",
              userHandle: userId,
            },
            clientExtensionResults: {},
            authenticatorAttachment: "platform" as const,
          };

          // Authentication should be rejected
          await expect(verifyAuthentication(assertion)).rejects.toThrow(
            "Sicherheitsproblem erkannt. Dieser Passkey wurde deaktiviert. Bitte registrieren Sie einen neuen Passkey."
          );

          // Credential should be marked as compromised
          expect(mockPrisma.passkey.update).toHaveBeenCalledWith({
            where: { id: passkeyId },
            data: { isCompromised: true },
          });
        }
      ),
      { numRuns: 20 }
    );
  });

  it("if presented counter > stored counter, authentication succeeds and counter is updated", async () => {
    // **Validates: Requirements 3.8, 6.2**
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        credentialIdArb,
        challengeArb,
        validCounterArb,
        async (userId, credentialId, challenge, { storedCounter, presentedCounter }) => {
          const now = new Date("2025-06-01T12:00:00Z");
          const passkeyId = "passkey-" + credentialId.slice(0, 8);

          // Mock: credential exists and is not compromised
          mockPrisma.passkey.findUnique.mockResolvedValue({
            id: passkeyId,
            userId,
            credentialId,
            publicKey: Buffer.from([1, 2, 3, 4, 5]),
            counter: storedCounter,
            name: "Test Passkey",
            algorithm: -7,
            transports: ["internal"],
            isCompromised: false,
            createdAt: now,
            user: {
              id: userId,
              email: "test@example.com",
              name: "Test User",
              role: "USER",
              accountStatus: "ACTIVE",
            },
          } as any);

          // Mock: valid challenge exists
          mockPrisma.webAuthnChallenge.findFirst.mockResolvedValue({
            id: "challenge-id",
            challenge,
            userId: null,
            type: "authentication",
            expiresAt: new Date(now.getTime() + 30_000),
            createdAt: new Date(now.getTime() - 30_000),
          });

          // Mock: WebAuthn verification succeeds with valid counter
          mockVerifyAuth.mockResolvedValue({
            verified: true,
            authenticationInfo: {
              credentialID: Buffer.from(credentialId, "base64url"),
              newCounter: presentedCounter,
              credentialDeviceType: "singleDevice",
              credentialBackedUp: false,
              origin: "http://localhost:3000",
              rpID: "localhost",
              userVerified: true,
              authenticatorExtensionResults: undefined,
            },
          });

          mockPrisma.passkey.update.mockResolvedValue({} as any);
          mockPrisma.webAuthnChallenge.delete.mockResolvedValue({} as any);

          const assertion = {
            id: credentialId,
            rawId: credentialId,
            type: "public-key" as const,
            response: {
              clientDataJSON: "eyJ0eXBlIjoid2ViYXV0aG4uZ2V0In0",
              authenticatorData: "dGVzdC1hdXRoLWRhdGE",
              signature: "dGVzdC1zaWduYXR1cmU",
              userHandle: userId,
            },
            clientExtensionResults: {},
            authenticatorAttachment: "platform" as const,
          };

          // Authentication should succeed
          const result = await verifyAuthentication(assertion);
          expect(result.id).toBe(userId);
          expect(result.email).toBe("test@example.com");
          expect(result.credentialId).toBe(credentialId);

          // Counter should be updated to the new value
          expect(mockPrisma.passkey.update).toHaveBeenCalledWith({
            where: { id: passkeyId },
            data: { counter: presentedCounter },
          });
        }
      ),
      { numRuns: 20 }
    );
  });
});

// ---------------------------------------------------------------------------
// Feature: login-enhancements, Property 9: Compromised credentials permanently rejected
// ---------------------------------------------------------------------------
describe("Property 9: Compromised credentials permanently rejected", () => {
  // Feature: login-enhancements, Property 9: For any credential marked compromised (isCompromised=true), all subsequent auth attempts are rejected regardless of assertion validity

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("for any credential marked compromised, all auth attempts are rejected regardless of assertion validity", async () => {
    // **Validates: Requirements 6.7**
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        credentialIdArb,
        fc.integer({ min: 0, max: 100_000 }), // any counter value
        async (userId, credentialId, counter) => {
          const now = new Date("2025-06-01T12:00:00Z");

          // Mock: credential exists but IS compromised
          mockPrisma.passkey.findUnique.mockResolvedValue({
            id: "passkey-compromised",
            userId,
            credentialId,
            publicKey: Buffer.from([1, 2, 3, 4, 5]),
            counter,
            name: "Compromised Passkey",
            algorithm: -7,
            transports: ["internal"],
            isCompromised: true, // <-- compromised
            createdAt: now,
            user: {
              id: userId,
              email: "test@example.com",
              name: "Test User",
              role: "USER",
              accountStatus: "ACTIVE",
            },
          } as any);

          const assertion = {
            id: credentialId,
            rawId: credentialId,
            type: "public-key" as const,
            response: {
              clientDataJSON: "eyJ0eXBlIjoid2ViYXV0aG4uZ2V0In0",
              authenticatorData: "dGVzdC1hdXRoLWRhdGE",
              signature: "dGVzdC1zaWduYXR1cmU",
              userHandle: userId,
            },
            clientExtensionResults: {},
            authenticatorAttachment: "platform" as const,
          };

          // Authentication should be rejected immediately
          await expect(verifyAuthentication(assertion)).rejects.toThrow(
            "Sicherheitsproblem erkannt. Dieser Passkey wurde deaktiviert. Bitte registrieren Sie einen neuen Passkey."
          );

          // WebAuthn verification should NOT have been called (early rejection)
          expect(mockVerifyAuth).not.toHaveBeenCalled();

          // Challenge lookup should NOT have been attempted
          expect(mockPrisma.webAuthnChallenge.findFirst).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 20 }
    );
  });
});

// ---------------------------------------------------------------------------
// Feature: login-enhancements, Property 10: Rate limiting on passkey authentication
// ---------------------------------------------------------------------------
describe("Property 10: Rate limiting on passkey authentication", () => {
  // Feature: login-enhancements, Property 10: For any IP, after 5 failed attempts within 15 minutes, all subsequent attempts are blocked until window expires

  beforeEach(() => {
    clearAllPasskeyAuthRateLimits();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-01T12:00:00Z"));
  });

  afterEach(() => {
    clearAllPasskeyAuthRateLimits();
    vi.useRealTimers();
  });

  it("after 5 failed attempts within 15 minutes, subsequent attempts from same IP are blocked", () => {
    // **Validates: Requirements 3.9, 6.4**
    fc.assert(
      fc.property(ipAddressArb, (ip) => {
        clearAllPasskeyAuthRateLimits();
        vi.setSystemTime(new Date("2025-06-01T12:00:00Z"));

        // Record 5 failed attempts
        for (let i = 0; i < 5; i++) {
          const check = checkPasskeyAuthRateLimit(ip);
          expect(check.allowed).toBe(true);
          recordFailedPasskeyAuth(ip);
        }

        // 6th attempt should be blocked
        const result = checkPasskeyAuthRateLimit(ip);
        expect(result.allowed).toBe(false);
        expect(result.retryAfter).toBeDefined();
        expect(result.retryAfter!).toBeGreaterThan(0);
      }),
      { numRuns: 20 }
    );
  });

  it("fewer than 5 failed attempts within 15 minutes are allowed", () => {
    // **Validates: Requirements 3.9, 6.4**
    fc.assert(
      fc.property(
        ipAddressArb,
        fc.integer({ min: 1, max: 4 }),
        (ip, attemptCount) => {
          clearAllPasskeyAuthRateLimits();
          vi.setSystemTime(new Date("2025-06-01T12:00:00Z"));

          // Record fewer than 5 failed attempts
          for (let i = 0; i < attemptCount; i++) {
            recordFailedPasskeyAuth(ip);
          }

          // Should still be allowed
          const result = checkPasskeyAuthRateLimit(ip);
          expect(result.allowed).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  });

  it("after window expires (15 minutes), attempts are allowed again", () => {
    // **Validates: Requirements 3.9, 6.4**
    fc.assert(
      fc.property(
        ipAddressArb,
        fc.integer({ min: 1, max: 3600 }), // seconds past the 15-min window
        (ip, secondsPastWindow) => {
          clearAllPasskeyAuthRateLimits();
          const baseTime = new Date("2025-06-01T12:00:00Z").getTime();
          vi.setSystemTime(new Date(baseTime));

          // Record 5 failed attempts
          for (let i = 0; i < 5; i++) {
            recordFailedPasskeyAuth(ip);
          }

          // Verify blocked
          const blocked = checkPasskeyAuthRateLimit(ip);
          expect(blocked.allowed).toBe(false);

          // Advance time past the 15-minute window
          const windowMs = 15 * 60 * 1000;
          vi.setSystemTime(new Date(baseTime + windowMs + secondsPastWindow * 1000));

          // Should be allowed again
          const result = checkPasskeyAuthRateLimit(ip);
          expect(result.allowed).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  });

  it("different IPs are rate-limited independently", () => {
    // **Validates: Requirements 3.9, 6.4**
    fc.assert(
      fc.property(
        ipAddressArb,
        ipAddressArb,
        (ip1, ip2) => {
          // Ensure different IPs
          fc.pre(ip1 !== ip2);

          clearAllPasskeyAuthRateLimits();
          vi.setSystemTime(new Date("2025-06-01T12:00:00Z"));

          // Rate-limit ip1
          for (let i = 0; i < 5; i++) {
            recordFailedPasskeyAuth(ip1);
          }

          // ip1 should be blocked
          const result1 = checkPasskeyAuthRateLimit(ip1);
          expect(result1.allowed).toBe(false);

          // ip2 should still be allowed
          const result2 = checkPasskeyAuthRateLimit(ip2);
          expect(result2.allowed).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  });
});
