/**
 * Unit tests for WebAuthn and SSO environment variable validation.
 *
 * Validates: Requirements 4.10, 2.2
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("auth-env config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getWebAuthnConfig", () => {
    it("returns config when all WebAuthn vars are set", async () => {
      process.env.WEBAUTHN_RP_ID = "example.com";
      process.env.WEBAUTHN_RP_NAME = "My App";
      process.env.WEBAUTHN_ORIGIN = "https://example.com";

      const { getWebAuthnConfig } = await import("@/lib/config/auth-env");
      const config = getWebAuthnConfig();

      expect(config).toEqual({
        rpId: "example.com",
        rpName: "My App",
        origin: "https://example.com",
      });
    });

    it("throws when WEBAUTHN_RP_ID is missing", async () => {
      process.env.WEBAUTHN_RP_NAME = "My App";
      process.env.WEBAUTHN_ORIGIN = "https://example.com";
      delete process.env.WEBAUTHN_RP_ID;

      const { getWebAuthnConfig } = await import("@/lib/config/auth-env");
      expect(() => getWebAuthnConfig()).toThrow("WEBAUTHN_RP_ID");
    });

    it("throws when WEBAUTHN_RP_NAME is missing", async () => {
      process.env.WEBAUTHN_RP_ID = "example.com";
      process.env.WEBAUTHN_ORIGIN = "https://example.com";
      delete process.env.WEBAUTHN_RP_NAME;

      const { getWebAuthnConfig } = await import("@/lib/config/auth-env");
      expect(() => getWebAuthnConfig()).toThrow("WEBAUTHN_RP_NAME");
    });

    it("throws when WEBAUTHN_ORIGIN is missing", async () => {
      process.env.WEBAUTHN_RP_ID = "example.com";
      process.env.WEBAUTHN_RP_NAME = "My App";
      delete process.env.WEBAUTHN_ORIGIN;

      const { getWebAuthnConfig } = await import("@/lib/config/auth-env");
      expect(() => getWebAuthnConfig()).toThrow("WEBAUTHN_ORIGIN");
    });

    it("throws listing all missing vars when none are set", async () => {
      delete process.env.WEBAUTHN_RP_ID;
      delete process.env.WEBAUTHN_RP_NAME;
      delete process.env.WEBAUTHN_ORIGIN;

      const { getWebAuthnConfig } = await import("@/lib/config/auth-env");
      expect(() => getWebAuthnConfig()).toThrow(
        "WEBAUTHN_RP_ID, WEBAUTHN_RP_NAME, WEBAUTHN_ORIGIN"
      );
    });
  });

  describe("getSsoConfig", () => {
    it("returns config when all SSO vars are set", async () => {
      process.env.SSO_CLIENT_ID = "client-123";
      process.env.SSO_CLIENT_SECRET = "secret-456";
      process.env.SSO_ISSUER_URL = "https://auth.example.com";

      const { getSsoConfig } = await import("@/lib/config/auth-env");
      const config = getSsoConfig();

      expect(config).toEqual({
        clientId: "client-123",
        clientSecret: "secret-456",
        issuerUrl: "https://auth.example.com",
      });
    });

    it("returns null when SSO_CLIENT_ID is missing", async () => {
      process.env.SSO_CLIENT_SECRET = "secret-456";
      process.env.SSO_ISSUER_URL = "https://auth.example.com";
      delete process.env.SSO_CLIENT_ID;

      const { getSsoConfig } = await import("@/lib/config/auth-env");
      expect(getSsoConfig()).toBeNull();
    });

    it("returns null when SSO_CLIENT_SECRET is missing", async () => {
      process.env.SSO_CLIENT_ID = "client-123";
      process.env.SSO_ISSUER_URL = "https://auth.example.com";
      delete process.env.SSO_CLIENT_SECRET;

      const { getSsoConfig } = await import("@/lib/config/auth-env");
      expect(getSsoConfig()).toBeNull();
    });

    it("returns null when SSO_ISSUER_URL is missing", async () => {
      process.env.SSO_CLIENT_ID = "client-123";
      process.env.SSO_CLIENT_SECRET = "secret-456";
      delete process.env.SSO_ISSUER_URL;

      const { getSsoConfig } = await import("@/lib/config/auth-env");
      expect(getSsoConfig()).toBeNull();
    });

    it("returns null when no SSO vars are set", async () => {
      delete process.env.SSO_CLIENT_ID;
      delete process.env.SSO_CLIENT_SECRET;
      delete process.env.SSO_ISSUER_URL;

      const { getSsoConfig } = await import("@/lib/config/auth-env");
      expect(getSsoConfig()).toBeNull();
    });
  });

  describe("isSsoConfigured", () => {
    it("returns true when all SSO vars are set", async () => {
      process.env.SSO_CLIENT_ID = "client-123";
      process.env.SSO_CLIENT_SECRET = "secret-456";
      process.env.SSO_ISSUER_URL = "https://auth.example.com";

      const { isSsoConfigured } = await import("@/lib/config/auth-env");
      expect(isSsoConfigured()).toBe(true);
    });

    it("returns false when SSO vars are incomplete", async () => {
      process.env.SSO_CLIENT_ID = "client-123";
      delete process.env.SSO_CLIENT_SECRET;
      delete process.env.SSO_ISSUER_URL;

      const { isSsoConfigured } = await import("@/lib/config/auth-env");
      expect(isSsoConfigured()).toBe(false);
    });
  });
});
