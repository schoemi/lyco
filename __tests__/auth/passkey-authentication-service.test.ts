import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
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
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/config/auth-env", () => ({
  getWebAuthnConfig: vi.fn(() => ({
    rpId: "localhost",
    rpName: "Lyco",
    origin: "http://localhost:3000",
  })),
}));

vi.mock("@simplewebauthn/server", () => ({
  generateAuthenticationOptions: vi.fn(),
  verifyAuthenticationResponse: vi.fn(),
  generateRegistrationOptions: vi.fn(),
  verifyRegistrationResponse: vi.fn(),
}));

vi.mock("@simplewebauthn/server/helpers", () => ({
  isoBase64URL: {
    toBuffer: vi.fn((str: string) => new Uint8Array(Buffer.from(str, "base64url"))),
    fromBuffer: vi.fn((buf: Uint8Array) => Buffer.from(buf).toString("base64url")),
  },
  isoCBOR: {
    decodeFirst: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import {
  generateAuthenticationOptions as generateAuthOptionsLib,
  verifyAuthenticationResponse as verifyAuthResponseLib,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import {
  generateAuthenticationOptions,
  verifyAuthentication,
} from "@/lib/services/passkey-service";

const mockPrisma = vi.mocked(prisma);
const mockGenerateAuthOptions = vi.mocked(generateAuthOptionsLib);
const mockVerifyAuthResponse = vi.mocked(verifyAuthResponseLib);

describe("PasskeyService - Authentication Methods", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));
    // Default mock for cleanup of expired challenges
    mockPrisma.webAuthnChallenge.deleteMany.mockResolvedValue({ count: 0 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("generateAuthenticationOptions", () => {
    it("generates options with empty allowCredentials for discoverable credentials", async () => {
      const mockOptions = {
        challenge: "test-challenge-base64url",
        timeout: 60000,
        rpId: "localhost",
        allowCredentials: [],
        userVerification: "preferred" as const,
      };
      mockGenerateAuthOptions.mockResolvedValue(mockOptions);
      mockPrisma.webAuthnChallenge.create.mockResolvedValue({
        id: "challenge-1",
        challenge: "test-challenge-base64url",
        userId: null,
        type: "authentication",
        expiresAt: new Date("2024-06-15T12:01:00Z"),
        createdAt: new Date("2024-06-15T12:00:00Z"),
      });

      const result = await generateAuthenticationOptions();

      expect(result).toEqual(mockOptions);
      expect(mockGenerateAuthOptions).toHaveBeenCalledWith({
        rpID: "localhost",
        timeout: 60000,
        allowCredentials: [],
        userVerification: "preferred",
      });
    });

    it("stores challenge in WebAuthnChallenge table with type 'authentication' and userId=null", async () => {
      const mockOptions = {
        challenge: "stored-challenge",
        timeout: 60000,
        rpId: "localhost",
        allowCredentials: [],
        userVerification: "preferred" as const,
      };
      mockGenerateAuthOptions.mockResolvedValue(mockOptions);
      mockPrisma.webAuthnChallenge.create.mockResolvedValue({
        id: "challenge-1",
        challenge: "stored-challenge",
        userId: null,
        type: "authentication",
        expiresAt: new Date("2024-06-15T12:01:00Z"),
        createdAt: new Date("2024-06-15T12:00:00Z"),
      });

      await generateAuthenticationOptions();

      expect(mockPrisma.webAuthnChallenge.create).toHaveBeenCalledWith({
        data: {
          challenge: "stored-challenge",
          userId: null,
          type: "authentication",
          expiresAt: new Date("2024-06-15T12:01:00Z"), // 60s from now
        },
      });
    });

    it("sets challenge expiry to 60 seconds from now", async () => {
      const mockOptions = {
        challenge: "timed-challenge",
        timeout: 60000,
        rpId: "localhost",
        allowCredentials: [],
        userVerification: "preferred" as const,
      };
      mockGenerateAuthOptions.mockResolvedValue(mockOptions);
      mockPrisma.webAuthnChallenge.create.mockResolvedValue({
        id: "challenge-1",
        challenge: "timed-challenge",
        userId: null,
        type: "authentication",
        expiresAt: new Date("2024-06-15T12:01:00Z"),
        createdAt: new Date("2024-06-15T12:00:00Z"),
      });

      await generateAuthenticationOptions();

      const createCall = mockPrisma.webAuthnChallenge.create.mock.calls[0][0];
      const expiresAt = createCall.data.expiresAt as Date;
      const now = new Date("2024-06-15T12:00:00Z");
      const diffMs = expiresAt.getTime() - now.getTime();
      expect(diffMs).toBe(60000);
    });
  });

  describe("verifyAuthentication", () => {
    const mockAssertion = {
      id: "credential-id-base64url",
      rawId: "credential-id-base64url",
      type: "public-key" as const,
      response: {
        clientDataJSON: "eyJ0eXBlIjoid2ViYXV0aG4uZ2V0In0",
        authenticatorData: "auth-data-base64url",
        signature: "signature-base64url",
      },
      clientExtensionResults: {},
      authenticatorAttachment: "platform" as const,
    };

    const mockCredential = {
      id: "passkey-db-id",
      userId: "user-1",
      credentialId: "credential-id-base64url",
      publicKey: Buffer.from("mock-public-key"),
      counter: 5,
      name: "My Passkey",
      algorithm: -7,
      transports: ["internal"],
      isCompromised: false,
      createdAt: new Date("2024-01-01"),
      user: {
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        role: "USER" as const,
        accountStatus: "ACTIVE",
      },
    };

    const mockChallenge = {
      id: "challenge-1",
      challenge: "valid-challenge",
      userId: null,
      type: "authentication",
      expiresAt: new Date("2024-06-15T12:01:00Z"), // not expired
      createdAt: new Date("2024-06-15T12:00:00Z"),
    };

    it("successfully authenticates with valid assertion and returns user info", async () => {
      mockPrisma.passkey.findUnique.mockResolvedValue(mockCredential as any);
      mockPrisma.webAuthnChallenge.findFirst.mockResolvedValue(mockChallenge);
      mockPrisma.passkey.update.mockResolvedValue(mockCredential as any);
      mockPrisma.webAuthnChallenge.delete.mockResolvedValue(mockChallenge);
      mockVerifyAuthResponse.mockResolvedValue({
        verified: true,
        authenticationInfo: {
          credentialID: new Uint8Array([1, 2, 3]),
          newCounter: 6,
          userVerified: true,
          credentialDeviceType: "multiDevice",
          credentialBackedUp: true,
          origin: "http://localhost:3000",
          rpID: "localhost",
        },
      });

      const result = await verifyAuthentication(mockAssertion);

      expect(result).toEqual({
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        role: "USER",
        accountStatus: "ACTIVE",
        credentialId: "credential-id-base64url",
      });
    });

    it("rejects authentication when credential is not found", async () => {
      mockPrisma.passkey.findUnique.mockResolvedValue(null);

      await expect(verifyAuthentication(mockAssertion)).rejects.toThrow(
        "Passkey-Authentifizierung fehlgeschlagen. Bitte versuchen Sie es erneut."
      );
    });

    it("rejects authentication when credential is compromised", async () => {
      mockPrisma.passkey.findUnique.mockResolvedValue({
        ...mockCredential,
        isCompromised: true,
      } as any);

      await expect(verifyAuthentication(mockAssertion)).rejects.toThrow(
        "Sicherheitsproblem erkannt. Dieser Passkey wurde deaktiviert. Bitte registrieren Sie einen neuen Passkey."
      );
    });

    it("rejects authentication when no valid challenge exists", async () => {
      mockPrisma.passkey.findUnique.mockResolvedValue(mockCredential as any);
      mockPrisma.webAuthnChallenge.findFirst.mockResolvedValue(null);

      await expect(verifyAuthentication(mockAssertion)).rejects.toThrow(
        "Die Sicherheitsabfrage ist abgelaufen. Bitte starten Sie den Vorgang erneut."
      );
    });

    it("rejects and marks credential as compromised when counter is not monotonically increasing", async () => {
      mockPrisma.passkey.findUnique.mockResolvedValue(mockCredential as any);
      mockPrisma.webAuthnChallenge.findFirst.mockResolvedValue(mockChallenge);
      mockPrisma.passkey.update.mockResolvedValue(mockCredential as any);
      mockVerifyAuthResponse.mockResolvedValue({
        verified: true,
        authenticationInfo: {
          credentialID: new Uint8Array([1, 2, 3]),
          newCounter: 5, // same as stored counter (5) — violation!
          userVerified: true,
          credentialDeviceType: "multiDevice",
          credentialBackedUp: true,
          origin: "http://localhost:3000",
          rpID: "localhost",
        },
      });

      await expect(verifyAuthentication(mockAssertion)).rejects.toThrow(
        "Sicherheitsproblem erkannt. Dieser Passkey wurde deaktiviert. Bitte registrieren Sie einen neuen Passkey."
      );

      // Verify credential was marked as compromised
      expect(mockPrisma.passkey.update).toHaveBeenCalledWith({
        where: { id: "passkey-db-id" },
        data: { isCompromised: true },
      });
    });

    it("rejects and marks credential as compromised when counter decreases", async () => {
      mockPrisma.passkey.findUnique.mockResolvedValue(mockCredential as any);
      mockPrisma.webAuthnChallenge.findFirst.mockResolvedValue(mockChallenge);
      mockPrisma.passkey.update.mockResolvedValue(mockCredential as any);
      mockVerifyAuthResponse.mockResolvedValue({
        verified: true,
        authenticationInfo: {
          credentialID: new Uint8Array([1, 2, 3]),
          newCounter: 3, // less than stored counter (5) — violation!
          userVerified: true,
          credentialDeviceType: "multiDevice",
          credentialBackedUp: true,
          origin: "http://localhost:3000",
          rpID: "localhost",
        },
      });

      await expect(verifyAuthentication(mockAssertion)).rejects.toThrow(
        "Sicherheitsproblem erkannt. Dieser Passkey wurde deaktiviert."
      );

      expect(mockPrisma.passkey.update).toHaveBeenCalledWith({
        where: { id: "passkey-db-id" },
        data: { isCompromised: true },
      });
    });

    it("updates stored counter on successful authentication", async () => {
      mockPrisma.passkey.findUnique.mockResolvedValue(mockCredential as any);
      mockPrisma.webAuthnChallenge.findFirst.mockResolvedValue(mockChallenge);
      mockPrisma.passkey.update.mockResolvedValue(mockCredential as any);
      mockPrisma.webAuthnChallenge.delete.mockResolvedValue(mockChallenge);
      mockVerifyAuthResponse.mockResolvedValue({
        verified: true,
        authenticationInfo: {
          credentialID: new Uint8Array([1, 2, 3]),
          newCounter: 10,
          userVerified: true,
          credentialDeviceType: "multiDevice",
          credentialBackedUp: true,
          origin: "http://localhost:3000",
          rpID: "localhost",
        },
      });

      await verifyAuthentication(mockAssertion);

      expect(mockPrisma.passkey.update).toHaveBeenCalledWith({
        where: { id: "passkey-db-id" },
        data: { counter: 10 },
      });
    });

    it("cleans up used challenge after successful authentication", async () => {
      mockPrisma.passkey.findUnique.mockResolvedValue(mockCredential as any);
      mockPrisma.webAuthnChallenge.findFirst.mockResolvedValue(mockChallenge);
      mockPrisma.passkey.update.mockResolvedValue(mockCredential as any);
      mockPrisma.webAuthnChallenge.delete.mockResolvedValue(mockChallenge);
      mockVerifyAuthResponse.mockResolvedValue({
        verified: true,
        authenticationInfo: {
          credentialID: new Uint8Array([1, 2, 3]),
          newCounter: 6,
          userVerified: true,
          credentialDeviceType: "multiDevice",
          credentialBackedUp: true,
          origin: "http://localhost:3000",
          rpID: "localhost",
        },
      });

      await verifyAuthentication(mockAssertion);

      expect(mockPrisma.webAuthnChallenge.delete).toHaveBeenCalledWith({
        where: { id: "challenge-1" },
      });
    });

    it("rejects when verification fails (invalid assertion)", async () => {
      mockPrisma.passkey.findUnique.mockResolvedValue(mockCredential as any);
      mockPrisma.webAuthnChallenge.findFirst.mockResolvedValue(mockChallenge);
      mockVerifyAuthResponse.mockResolvedValue({
        verified: false,
        authenticationInfo: {
          credentialID: new Uint8Array([1, 2, 3]),
          newCounter: 6,
          userVerified: false,
          credentialDeviceType: "multiDevice",
          credentialBackedUp: false,
          origin: "http://localhost:3000",
          rpID: "localhost",
        },
      });

      await expect(verifyAuthentication(mockAssertion)).rejects.toThrow(
        "Passkey-Authentifizierung fehlgeschlagen. Bitte versuchen Sie es erneut."
      );
    });

    it("passes correct authenticator device to verifyAuthenticationResponse", async () => {
      mockPrisma.passkey.findUnique.mockResolvedValue(mockCredential as any);
      mockPrisma.webAuthnChallenge.findFirst.mockResolvedValue(mockChallenge);
      mockPrisma.passkey.update.mockResolvedValue(mockCredential as any);
      mockPrisma.webAuthnChallenge.delete.mockResolvedValue(mockChallenge);
      mockVerifyAuthResponse.mockResolvedValue({
        verified: true,
        authenticationInfo: {
          credentialID: new Uint8Array([1, 2, 3]),
          newCounter: 6,
          userVerified: true,
          credentialDeviceType: "multiDevice",
          credentialBackedUp: true,
          origin: "http://localhost:3000",
          rpID: "localhost",
        },
      });

      await verifyAuthentication(mockAssertion);

      expect(mockVerifyAuthResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          response: mockAssertion,
          expectedChallenge: "valid-challenge",
          expectedOrigin: "http://localhost:3000",
          expectedRPID: "localhost",
          authenticator: expect.objectContaining({
            counter: 5,
            transports: ["internal"],
          }),
        })
      );
    });
  });
});
