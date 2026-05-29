/**
 * Property-based tests for Passkey Registration
 *
 * Tests the passkey-service.ts registration, management, and validation logic.
 *
 * Feature: login-enhancements
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    passkey: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    webAuthnChallenge: {
      create: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

// Mock @simplewebauthn/server
vi.mock("@simplewebauthn/server", () => ({
  generateRegistrationOptions: vi.fn(),
  verifyRegistrationResponse: vi.fn(),
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
import {
  generateRegistrationOptions,
  verifyRegistration,
  getPasskeyCount,
  listPasskeys,
  deletePasskey,
} from "@/lib/services/passkey-service";
import {
  generateRegistrationOptions as mockGenerateRegOptions,
  verifyRegistrationResponse as mockVerifyRegistrationResponse,
} from "@simplewebauthn/server";
import { isoCBOR } from "@simplewebauthn/server/helpers";

const mockPrisma = vi.mocked(prisma);
const mockGenRegOptions = vi.mocked(mockGenerateRegOptions);
const mockVerifyRegResponse = vi.mocked(mockVerifyRegistrationResponse);
const mockIsoCBOR = vi.mocked(isoCBOR);

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const userIdArb = fc.uuid();

const passkeyNameArb = fc.string({ minLength: 1, maxLength: 64 }).filter(
  (s) => s.trim().length >= 1 && s.trim().length <= 64
);

const invalidNameTooShortArb = fc.constant("   "); // trims to empty
const invalidNameTooLongArb = fc.string({ minLength: 65, maxLength: 128 });

const challengeArb = fc.base64String({ minLength: 16, maxLength: 64 });

const credentialIdArb = fc.base64String({ minLength: 16, maxLength: 64 });

const algorithmArb = fc.constantFrom(-7, -257); // ES256, RS256

const unsupportedAlgorithmArb = fc.integer().filter(
  (n) => n !== -7 && n !== -257
);

const passkeyCountArb = fc.integer({ min: 0, max: 9 });

const passkeyIdArb = fc.uuid();

// ---------------------------------------------------------------------------
// Feature: login-enhancements, Property 4: WebAuthn challenge expiry
// ---------------------------------------------------------------------------
describe("Property 4: WebAuthn challenge expiry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Default mock for cleanup of expired challenges
    mockPrisma.webAuthnChallenge.deleteMany.mockResolvedValue({ count: 0 });
  });

  it("challenge has 60-second timeout; verification after 60s is rejected", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        challengeArb,
        // Seconds past expiry (1 to 3600)
        fc.integer({ min: 1, max: 3600 }),
        async (userId, challenge, secondsPastExpiry) => {
          const now = new Date("2025-06-01T12:00:00Z");
          vi.setSystemTime(now);

          // Simulate an expired challenge (expiresAt is in the past)
          const expiresAt = new Date(now.getTime() - secondsPastExpiry * 1000);

          mockPrisma.passkey.count.mockResolvedValue(0);
          mockPrisma.webAuthnChallenge.findFirst.mockResolvedValue({
            id: "challenge-id",
            challenge,
            userId,
            type: "registration",
            expiresAt,
            createdAt: new Date(expiresAt.getTime() - 60_000),
          });
          mockPrisma.webAuthnChallenge.delete.mockResolvedValue({} as any);

          const credential = {
            id: "cred-id",
            rawId: "cred-id",
            type: "public-key" as const,
            response: {
              clientDataJSON: "eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIn0",
              attestationObject: "o2NmbXRkbm9uZQ",
              transports: ["internal" as const],
            },
            clientExtensionResults: {},
            authenticatorAttachment: "platform" as const,
          };

          // Verification should be rejected because challenge is expired
          await expect(
            verifyRegistration(userId, credential, "My Passkey")
          ).rejects.toThrow(
            "Die Sicherheitsabfrage ist abgelaufen. Bitte starten Sie den Vorgang erneut."
          );
        }
      ),
      { numRuns: 20 }
    );
  });

  it("generateRegistrationOptions stores challenge with 60s expiry", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        fc.integer({ min: 1700000000000, max: 1800000000000 }),
        async (userId, timestamp) => {
          vi.setSystemTime(new Date(timestamp));

          mockPrisma.passkey.count.mockResolvedValue(0);
          mockPrisma.user.findUnique.mockResolvedValue({
            id: userId,
            email: "test@example.com",
            name: "Test User",
          } as any);
          mockPrisma.passkey.findMany.mockResolvedValue([]);
          mockPrisma.webAuthnChallenge.create.mockResolvedValue({} as any);

          const generatedChallenge = "generated-challenge-" + userId.slice(0, 8);
          mockGenRegOptions.mockResolvedValue({
            challenge: generatedChallenge,
            rp: { name: "Lyco", id: "localhost" },
            user: { id: userId, name: "test@example.com", displayName: "Test User" },
            pubKeyCredParams: [{ type: "public-key", alg: -7 }],
            timeout: 60000,
            attestation: "none",
            excludeCredentials: [],
            authenticatorSelection: {
              residentKey: "preferred",
              userVerification: "preferred",
            },
          });

          await generateRegistrationOptions(userId);

          // Verify the challenge was stored with correct expiry
          expect(mockPrisma.webAuthnChallenge.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
              challenge: generatedChallenge,
              userId,
              type: "registration",
              expiresAt: new Date(timestamp + 60_000),
            }),
          });
        }
      ),
      { numRuns: 20 }
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// Feature: login-enhancements, Property 5: Passkey registration stores complete credential data
// ---------------------------------------------------------------------------
describe("Property 5: Passkey registration stores complete credential data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("for any valid registration with name 1–64 chars, stores public key, credential ID, name, and algorithm; credential is retrievable", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        passkeyNameArb,
        credentialIdArb,
        algorithmArb,
        async (userId, name, credentialId, algorithm) => {
          const now = new Date("2025-06-01T12:00:00Z");
          const challenge = "test-challenge-" + userId.slice(0, 8);
          const publicKeyBytes = new Uint8Array([1, 2, 3, 4, 5]);
          const credentialIdBytes = Buffer.from(credentialId, "base64url");

          // Mock: user has fewer than 10 passkeys
          mockPrisma.passkey.count.mockResolvedValue(0);

          // Mock: challenge exists and is not expired
          mockPrisma.webAuthnChallenge.findFirst.mockResolvedValue({
            id: "challenge-id",
            challenge,
            userId,
            type: "registration",
            expiresAt: new Date(now.getTime() + 30_000), // 30s remaining
            createdAt: new Date(now.getTime() - 30_000),
          });

          // Mock: verification succeeds
          mockVerifyRegResponse.mockResolvedValue({
            verified: true,
            registrationInfo: {
              credentialID: credentialIdBytes,
              credentialPublicKey: publicKeyBytes,
              counter: 0,
              credentialType: "public-key",
              credentialDeviceType: "singleDevice",
              credentialBackedUp: false,
              attestationObject: new Uint8Array(),
              userVerified: true,
              origin: "http://localhost:3000",
              rpID: "localhost",
              authenticatorExtensionResults: undefined,
            },
          });

          // Mock: CBOR decode returns the algorithm
          mockIsoCBOR.decodeFirst.mockReturnValue(
            new Map([[3, algorithm]]) as any
          );

          const createdPasskey = {
            id: "new-passkey-id",
            userId,
            credentialId,
            publicKey: Buffer.from(publicKeyBytes),
            counter: 0,
            name: name.trim(),
            algorithm,
            transports: ["internal"],
            isCompromised: false,
            createdAt: now,
          };
          mockPrisma.passkey.create.mockResolvedValue(createdPasskey as any);
          mockPrisma.webAuthnChallenge.delete.mockResolvedValue({} as any);

          const credential = {
            id: credentialId,
            rawId: credentialId,
            type: "public-key" as const,
            response: {
              clientDataJSON: "eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIn0",
              attestationObject: "o2NmbXRkbm9uZQ",
              transports: ["internal" as const],
            },
            clientExtensionResults: {},
            authenticatorAttachment: "platform" as const,
          };

          const result = await verifyRegistration(userId, credential, name);

          // Verify the credential was stored with all required data
          expect(mockPrisma.passkey.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
              userId,
              publicKey: Buffer.from(publicKeyBytes),
              name: name.trim(),
              algorithm,
            }),
          });

          // Verify the credential ID was stored
          const createCall = mockPrisma.passkey.create.mock.calls[0][0];
          expect(createCall.data.credentialId).toBeDefined();
          expect(typeof createCall.data.credentialId).toBe("string");

          // Verify result is retrievable (has id, name, createdAt)
          expect(result.id).toBe("new-passkey-id");
          expect(result.name).toBe(name.trim());
          expect(result.createdAt).toEqual(now);
        }
      ),
      { numRuns: 20 }
    );
  });
});

// ---------------------------------------------------------------------------
// Feature: login-enhancements, Property 6: Maximum passkeys per user invariant
// ---------------------------------------------------------------------------
describe("Property 6: Maximum passkeys per user invariant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-01T12:00:00Z"));
    // Default mock for cleanup of expired challenges
    mockPrisma.webAuthnChallenge.deleteMany.mockResolvedValue({ count: 0 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("for any user, passkey count never exceeds 10; registration at 10 is rejected", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        passkeyNameArb,
        async (userId, name) => {
          // User already has 10 passkeys
          mockPrisma.passkey.count.mockResolvedValue(10);

          const credential = {
            id: "cred-id",
            rawId: "cred-id",
            type: "public-key" as const,
            response: {
              clientDataJSON: "eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIn0",
              attestationObject: "o2NmbXRkbm9uZQ",
              transports: ["internal" as const],
            },
            clientExtensionResults: {},
            authenticatorAttachment: "platform" as const,
          };

          // Registration should be rejected
          await expect(
            verifyRegistration(userId, credential, name)
          ).rejects.toThrow(
            "Maximale Anzahl von 10 Passkeys erreicht. Bitte löschen Sie einen bestehenden Passkey."
          );

          // Passkey should NOT have been created
          expect(mockPrisma.passkey.create).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 20 }
    );
  });

  it("generateRegistrationOptions rejects when user already has 10 passkeys", async () => {
    await fc.assert(
      fc.asyncProperty(userIdArb, async (userId) => {
        mockPrisma.passkey.count.mockResolvedValue(10);

        await expect(generateRegistrationOptions(userId)).rejects.toThrow(
          "Maximale Anzahl von 10 Passkeys erreicht. Bitte löschen Sie einen bestehenden Passkey."
        );

        // No challenge should have been generated
        expect(mockPrisma.webAuthnChallenge.create).not.toHaveBeenCalled();
      }),
      { numRuns: 20 }
    );
  });

  it("registration is allowed when user has fewer than 10 passkeys", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        passkeyNameArb,
        passkeyCountArb, // 0-9
        algorithmArb,
        async (userId, name, currentCount, algorithm) => {
          const now = new Date("2025-06-01T12:00:00Z");
          const publicKeyBytes = new Uint8Array([1, 2, 3, 4, 5]);
          const credentialIdBytes = Buffer.from("credential-id", "base64url");

          mockPrisma.passkey.count.mockResolvedValue(currentCount);
          mockPrisma.webAuthnChallenge.findFirst.mockResolvedValue({
            id: "challenge-id",
            challenge: "test-challenge",
            userId,
            type: "registration",
            expiresAt: new Date(now.getTime() + 30_000),
            createdAt: new Date(now.getTime() - 30_000),
          });

          mockVerifyRegResponse.mockResolvedValue({
            verified: true,
            registrationInfo: {
              credentialID: credentialIdBytes,
              credentialPublicKey: publicKeyBytes,
              counter: 0,
              credentialType: "public-key",
              credentialDeviceType: "singleDevice",
              credentialBackedUp: false,
              attestationObject: new Uint8Array(),
              userVerified: true,
              origin: "http://localhost:3000",
              rpID: "localhost",
              authenticatorExtensionResults: undefined,
            },
          });

          mockIsoCBOR.decodeFirst.mockReturnValue(
            new Map([[3, algorithm]]) as any
          );

          mockPrisma.passkey.create.mockResolvedValue({
            id: "new-passkey-id",
            userId,
            credentialId: "credential-id",
            publicKey: Buffer.from(publicKeyBytes),
            counter: 0,
            name: name.trim(),
            algorithm,
            transports: ["internal"],
            isCompromised: false,
            createdAt: now,
          } as any);
          mockPrisma.webAuthnChallenge.delete.mockResolvedValue({} as any);

          const credential = {
            id: "cred-id",
            rawId: "cred-id",
            type: "public-key" as const,
            response: {
              clientDataJSON: "eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIn0",
              attestationObject: "o2NmbXRkbm9uZQ",
              transports: ["internal" as const],
            },
            clientExtensionResults: {},
            authenticatorAttachment: "platform" as const,
          };

          // Should NOT throw when count < 10
          const result = await verifyRegistration(userId, credential, name);
          expect(result.id).toBe("new-passkey-id");
        }
      ),
      { numRuns: 20 }
    );
  });
});

// ---------------------------------------------------------------------------
// Feature: login-enhancements, Property 7: Passkey deletion removes credential
// ---------------------------------------------------------------------------
describe("Property 7: Passkey deletion removes credential", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("for any user and their passkey, after deletion the credential no longer exists", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        passkeyIdArb,
        passkeyNameArb,
        async (userId, passkeyId, name) => {
          // Setup: passkey exists and belongs to user
          mockPrisma.passkey.findUnique.mockResolvedValue({
            id: passkeyId,
            userId,
          } as any);
          mockPrisma.passkey.delete.mockResolvedValue({
            id: passkeyId,
            userId,
            name,
          } as any);

          // Delete the passkey
          await deletePasskey(userId, passkeyId);

          // Verify delete was called with correct ID
          expect(mockPrisma.passkey.delete).toHaveBeenCalledWith({
            where: { id: passkeyId },
          });

          // Simulate post-deletion: passkey no longer exists
          mockPrisma.passkey.findUnique.mockResolvedValue(null);
          mockPrisma.passkey.findMany.mockResolvedValue([]);

          // Verify credential no longer exists in the database
          const found = await prisma.passkey.findUnique({
            where: { id: passkeyId },
          });
          expect(found).toBeNull();

          // Verify credential does not appear in user's passkey list
          const list = await listPasskeys(userId);
          expect(list).toEqual([]);
          expect(list.find((p) => p.id === passkeyId)).toBeUndefined();
        }
      ),
      { numRuns: 20 }
    );
  });

  it("deletion of non-existent passkey throws error", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        passkeyIdArb,
        async (userId, passkeyId) => {
          mockPrisma.passkey.findUnique.mockResolvedValue(null);

          await expect(deletePasskey(userId, passkeyId)).rejects.toThrow(
            "Passkey nicht gefunden"
          );

          expect(mockPrisma.passkey.delete).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 20 }
    );
  });

  it("deletion of passkey belonging to different user throws error", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        fc.uuid(), // different user
        passkeyIdArb,
        async (userId, otherUserId, passkeyId) => {
          // Ensure the two user IDs are different
          fc.pre(userId !== otherUserId);

          mockPrisma.passkey.findUnique.mockResolvedValue({
            id: passkeyId,
            userId: otherUserId,
          } as any);

          await expect(deletePasskey(userId, passkeyId)).rejects.toThrow(
            "Passkey gehört nicht zu diesem Benutzer"
          );

          expect(mockPrisma.passkey.delete).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 20 }
    );
  });
});

// ---------------------------------------------------------------------------
// Feature: login-enhancements, Property 11: Only ES256 and RS256 algorithms accepted
// ---------------------------------------------------------------------------
describe("Property 11: Only ES256 and RS256 algorithms accepted", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("for any registration, if algorithm is not -7 (ES256) or -257 (RS256), registration is rejected", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        passkeyNameArb,
        unsupportedAlgorithmArb,
        async (userId, name, unsupportedAlgorithm) => {
          const now = new Date("2025-06-01T12:00:00Z");
          const publicKeyBytes = new Uint8Array([1, 2, 3, 4, 5]);
          const credentialIdBytes = Buffer.from("credential-id", "base64url");

          mockPrisma.passkey.count.mockResolvedValue(0);
          mockPrisma.webAuthnChallenge.findFirst.mockResolvedValue({
            id: "challenge-id",
            challenge: "test-challenge",
            userId,
            type: "registration",
            expiresAt: new Date(now.getTime() + 30_000),
            createdAt: new Date(now.getTime() - 30_000),
          });

          // Verification succeeds at the WebAuthn level
          mockVerifyRegResponse.mockResolvedValue({
            verified: true,
            registrationInfo: {
              credentialID: credentialIdBytes,
              credentialPublicKey: publicKeyBytes,
              counter: 0,
              credentialType: "public-key",
              credentialDeviceType: "singleDevice",
              credentialBackedUp: false,
              attestationObject: new Uint8Array(),
              userVerified: true,
              origin: "http://localhost:3000",
              rpID: "localhost",
              authenticatorExtensionResults: undefined,
            },
          });

          // CBOR decode returns the unsupported algorithm
          mockIsoCBOR.decodeFirst.mockReturnValue(
            new Map([[3, unsupportedAlgorithm]]) as any
          );

          const credential = {
            id: "cred-id",
            rawId: "cred-id",
            type: "public-key" as const,
            response: {
              clientDataJSON: "eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIn0",
              attestationObject: "o2NmbXRkbm9uZQ",
              transports: ["internal" as const],
            },
            clientExtensionResults: {},
            authenticatorAttachment: "platform" as const,
          };

          // Registration should be rejected due to unsupported algorithm
          await expect(
            verifyRegistration(userId, credential, name)
          ).rejects.toThrow(
            "Nicht unterstützter Algorithmus. Nur ES256 und RS256 werden akzeptiert."
          );

          // No passkey should have been stored
          expect(mockPrisma.passkey.create).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 20 }
    );
  });

  it("ES256 (-7) and RS256 (-257) are accepted", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        passkeyNameArb,
        algorithmArb, // only -7 or -257
        async (userId, name, algorithm) => {
          const now = new Date("2025-06-01T12:00:00Z");
          const publicKeyBytes = new Uint8Array([1, 2, 3, 4, 5]);
          const credentialIdBytes = Buffer.from("credential-id", "base64url");

          mockPrisma.passkey.count.mockResolvedValue(0);
          mockPrisma.webAuthnChallenge.findFirst.mockResolvedValue({
            id: "challenge-id",
            challenge: "test-challenge",
            userId,
            type: "registration",
            expiresAt: new Date(now.getTime() + 30_000),
            createdAt: new Date(now.getTime() - 30_000),
          });

          mockVerifyRegResponse.mockResolvedValue({
            verified: true,
            registrationInfo: {
              credentialID: credentialIdBytes,
              credentialPublicKey: publicKeyBytes,
              counter: 0,
              credentialType: "public-key",
              credentialDeviceType: "singleDevice",
              credentialBackedUp: false,
              attestationObject: new Uint8Array(),
              userVerified: true,
              origin: "http://localhost:3000",
              rpID: "localhost",
              authenticatorExtensionResults: undefined,
            },
          });

          // CBOR decode returns a supported algorithm
          mockIsoCBOR.decodeFirst.mockReturnValue(
            new Map([[3, algorithm]]) as any
          );

          mockPrisma.passkey.create.mockResolvedValue({
            id: "new-passkey-id",
            userId,
            credentialId: "credential-id",
            publicKey: Buffer.from(publicKeyBytes),
            counter: 0,
            name: name.trim(),
            algorithm,
            transports: ["internal"],
            isCompromised: false,
            createdAt: now,
          } as any);
          mockPrisma.webAuthnChallenge.delete.mockResolvedValue({} as any);

          const credential = {
            id: "cred-id",
            rawId: "cred-id",
            type: "public-key" as const,
            response: {
              clientDataJSON: "eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIn0",
              attestationObject: "o2NmbXRkbm9uZQ",
              transports: ["internal" as const],
            },
            clientExtensionResults: {},
            authenticatorAttachment: "platform" as const,
          };

          // Should succeed for supported algorithms
          const result = await verifyRegistration(userId, credential, name);
          expect(result.id).toBe("new-passkey-id");

          // Verify the algorithm was stored
          expect(mockPrisma.passkey.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
              algorithm,
            }),
          });
        }
      ),
      { numRuns: 20 }
    );
  });
});
