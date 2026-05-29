import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock dependencies before imports
vi.mock("@/lib/services/passkey-service", () => ({
  generateAuthenticationOptions: vi.fn(),
  verifyAuthentication: vi.fn(),
}));

vi.mock("@/lib/services/passkey-auth-rate-limiter", () => ({
  checkPasskeyAuthRateLimit: vi.fn(),
  recordFailedPasskeyAuth: vi.fn(),
}));

vi.mock("@/lib/utils/request-ip", () => ({
  getClientIp: vi.fn().mockReturnValue("192.168.1.1"),
}));

vi.mock("@/lib/services/log-service", () => ({
  logAudit: vi.fn(),
  PASSKEY_AUTH_SUCCESS: "PASSKEY_AUTH_SUCCESS",
  PASSKEY_AUTH_FAILED: "PASSKEY_AUTH_FAILED",
}));

vi.mock("@/lib/utils/session-cookie", () => ({
  getSessionCookieName: vi.fn().mockReturnValue("authjs.session-token"),
}));

vi.mock("next-auth/jwt", () => ({
  encode: vi.fn().mockResolvedValue("mock-jwt-token"),
}));

import {
  generateAuthenticationOptions,
  verifyAuthentication,
} from "@/lib/services/passkey-service";
import {
  checkPasskeyAuthRateLimit,
  recordFailedPasskeyAuth,
} from "@/lib/services/passkey-auth-rate-limiter";
import { logAudit } from "@/lib/services/log-service";
import { encode } from "next-auth/jwt";
import { POST as authenticateOptions } from "@/app/api/auth/passkey/authenticate/options/route";
import { POST as authenticateVerify } from "@/app/api/auth/passkey/authenticate/verify/route";
import { NextRequest } from "next/server";

const mockGenerateAuthOptions = vi.mocked(generateAuthenticationOptions);
const mockVerifyAuthentication = vi.mocked(verifyAuthentication);
const mockCheckRateLimit = vi.mocked(checkPasskeyAuthRateLimit);
const mockRecordFailed = vi.mocked(recordFailedPasskeyAuth);
const mockLogAudit = vi.mocked(logAudit);
const mockEncode = vi.mocked(encode);

function makeRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(`http://localhost${url}`, options);
}

describe("Passkey Authentication API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockReturnValue({ allowed: true });
    mockEncode.mockResolvedValue("mock-jwt-token");
    process.env.AUTH_SECRET = "test-secret";
  });

  afterEach(() => {
    delete process.env.AUTH_SECRET;
  });

  describe("POST /api/auth/passkey/authenticate/options", () => {
    it("returns authentication options on success", async () => {
      const mockOptions = {
        challenge: "test-challenge",
        timeout: 60000,
        rpId: "localhost",
        allowCredentials: [],
        userVerification: "preferred" as const,
      };
      mockGenerateAuthOptions.mockResolvedValue(mockOptions);

      const res = await authenticateOptions(
        makeRequest("/api/auth/passkey/authenticate/options", { method: "POST" })
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.options).toEqual(mockOptions);
    });

    it("returns 429 when rate limited", async () => {
      mockCheckRateLimit.mockReturnValue({ allowed: false, retryAfter: 600 });

      const res = await authenticateOptions(
        makeRequest("/api/auth/passkey/authenticate/options", { method: "POST" })
      );

      expect(res.status).toBe(429);
      expect(res.headers.get("Retry-After")).toBe("600");
      const json = await res.json();
      expect(json.error).toContain("Zu viele fehlgeschlagene Versuche");
    });

    it("returns 500 on internal error", async () => {
      mockGenerateAuthOptions.mockRejectedValue(new Error("DB connection failed"));

      const res = await authenticateOptions(
        makeRequest("/api/auth/passkey/authenticate/options", { method: "POST" })
      );

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("Interner Serverfehler");
    });

    it("does not require authentication (public endpoint)", async () => {
      const mockOptions = {
        challenge: "public-challenge",
        timeout: 60000,
        rpId: "localhost",
        allowCredentials: [],
        userVerification: "preferred" as const,
      };
      mockGenerateAuthOptions.mockResolvedValue(mockOptions);

      // No auth header or session — should still work
      const res = await authenticateOptions(
        makeRequest("/api/auth/passkey/authenticate/options", { method: "POST" })
      );

      expect(res.status).toBe(200);
    });
  });

  describe("POST /api/auth/passkey/authenticate/verify", () => {
    const mockAuthenticatedUser = {
      id: "user-1",
      email: "test@example.com",
      name: "Test User",
      role: "USER" as const,
      accountStatus: "ACTIVE",
      credentialId: "credential-id-123",
    };

    const validBody = {
      assertion: {
        id: "credential-id-123",
        rawId: "credential-id-123",
        type: "public-key",
        response: {
          clientDataJSON: "eyJ0eXBlIjoid2ViYXV0aG4uZ2V0In0",
          authenticatorData: "auth-data",
          signature: "sig-data",
        },
        clientExtensionResults: {},
      },
    };

    it("returns success with session cookie on valid authentication", async () => {
      mockVerifyAuthentication.mockResolvedValue(mockAuthenticatedUser);

      const res = await authenticateVerify(
        makeRequest("/api/auth/passkey/authenticate/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validBody),
        })
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.user.id).toBe("user-1");
      expect(json.user.email).toBe("test@example.com");

      // Verify session cookie was set
      const setCookie = res.cookies.get("authjs.session-token");
      expect(setCookie).toBeDefined();
      expect(setCookie?.value).toBe("mock-jwt-token");
    });

    it("creates JWT with correct payload (24h duration, authMethod passkey)", async () => {
      mockVerifyAuthentication.mockResolvedValue(mockAuthenticatedUser);

      await authenticateVerify(
        makeRequest("/api/auth/passkey/authenticate/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validBody),
        })
      );

      expect(mockEncode).toHaveBeenCalledWith(
        expect.objectContaining({
          token: expect.objectContaining({
            id: "user-1",
            email: "test@example.com",
            name: "Test User",
            role: "USER",
            accountStatus: "ACTIVE",
            authMethod: "passkey",
            rememberMe: false,
          }),
          secret: "test-secret",
          salt: "authjs.session-token",
        })
      );
    });

    it("returns 429 when rate limited", async () => {
      mockCheckRateLimit.mockReturnValue({ allowed: false, retryAfter: 300 });

      const res = await authenticateVerify(
        makeRequest("/api/auth/passkey/authenticate/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validBody),
        })
      );

      expect(res.status).toBe(429);
      expect(res.headers.get("Retry-After")).toBe("300");
    });

    it("logs rate-limited attempts to audit log", async () => {
      mockCheckRateLimit.mockReturnValue({ allowed: false, retryAfter: 300 });

      await authenticateVerify(
        makeRequest("/api/auth/passkey/authenticate/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validBody),
        })
      );

      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "PASSKEY_AUTH_FAILED",
          details: expect.objectContaining({
            reason: "rate_limited",
            method: "passkey",
          }),
          ipAddress: "192.168.1.1",
        })
      );
    });

    it("returns 400 when assertion is missing", async () => {
      const res = await authenticateVerify(
        makeRequest("/api/auth/passkey/authenticate/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        })
      );

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Assertion fehlt");
    });

    it("returns 401 when authentication fails (invalid assertion)", async () => {
      mockVerifyAuthentication.mockRejectedValue(
        new Error("Passkey-Authentifizierung fehlgeschlagen. Bitte versuchen Sie es erneut.")
      );

      const res = await authenticateVerify(
        makeRequest("/api/auth/passkey/authenticate/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validBody),
        })
      );

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain("Passkey-Authentifizierung fehlgeschlagen");
    });

    it("returns 401 when challenge is expired", async () => {
      mockVerifyAuthentication.mockRejectedValue(
        new Error("Die Sicherheitsabfrage ist abgelaufen. Bitte starten Sie den Vorgang erneut.")
      );

      const res = await authenticateVerify(
        makeRequest("/api/auth/passkey/authenticate/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validBody),
        })
      );

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain("Sicherheitsabfrage ist abgelaufen");
    });

    it("returns 401 when credential is compromised", async () => {
      mockVerifyAuthentication.mockRejectedValue(
        new Error("Sicherheitsproblem erkannt. Dieser Passkey wurde deaktiviert. Bitte registrieren Sie einen neuen Passkey.")
      );

      const res = await authenticateVerify(
        makeRequest("/api/auth/passkey/authenticate/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validBody),
        })
      );

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain("Sicherheitsproblem erkannt");
    });

    it("returns 401 when account is suspended", async () => {
      mockVerifyAuthentication.mockResolvedValue({
        ...mockAuthenticatedUser,
        accountStatus: "SUSPENDED",
      });

      const res = await authenticateVerify(
        makeRequest("/api/auth/passkey/authenticate/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validBody),
        })
      );

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain("Konto wurde gesperrt");
    });

    it("returns 401 when account is pending", async () => {
      mockVerifyAuthentication.mockResolvedValue({
        ...mockAuthenticatedUser,
        accountStatus: "PENDING",
      });

      const res = await authenticateVerify(
        makeRequest("/api/auth/passkey/authenticate/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validBody),
        })
      );

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain("wartet auf Freigabe");
    });

    it("records failed attempt for rate limiting on authentication failure", async () => {
      mockVerifyAuthentication.mockRejectedValue(
        new Error("Passkey-Authentifizierung fehlgeschlagen. Bitte versuchen Sie es erneut.")
      );

      await authenticateVerify(
        makeRequest("/api/auth/passkey/authenticate/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validBody),
        })
      );

      expect(mockRecordFailed).toHaveBeenCalledWith("192.168.1.1");
    });

    it("logs successful authentication to audit log", async () => {
      mockVerifyAuthentication.mockResolvedValue(mockAuthenticatedUser);

      await authenticateVerify(
        makeRequest("/api/auth/passkey/authenticate/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validBody),
        })
      );

      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "PASSKEY_AUTH_SUCCESS",
          actorId: "user-1",
          targetEntity: "User",
          targetId: "user-1",
          details: expect.objectContaining({
            method: "passkey",
            credentialId: "credential-id-123",
          }),
          ipAddress: "192.168.1.1",
        })
      );
    });

    it("logs failed authentication to audit log", async () => {
      mockVerifyAuthentication.mockRejectedValue(
        new Error("Passkey-Authentifizierung fehlgeschlagen. Bitte versuchen Sie es erneut.")
      );

      await authenticateVerify(
        makeRequest("/api/auth/passkey/authenticate/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validBody),
        })
      );

      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "PASSKEY_AUTH_FAILED",
          details: expect.objectContaining({
            method: "passkey",
            reason: "Passkey-Authentifizierung fehlgeschlagen. Bitte versuchen Sie es erneut.",
          }),
          ipAddress: "192.168.1.1",
        })
      );
    });

    it("logs suspended account denial to audit log with credential ID", async () => {
      mockVerifyAuthentication.mockResolvedValue({
        ...mockAuthenticatedUser,
        accountStatus: "SUSPENDED",
      });

      await authenticateVerify(
        makeRequest("/api/auth/passkey/authenticate/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validBody),
        })
      );

      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "PASSKEY_AUTH_FAILED",
          actorId: "user-1",
          details: expect.objectContaining({
            reason: "account_suspended",
            method: "passkey",
            credentialId: "credential-id-123",
          }),
          ipAddress: "192.168.1.1",
        })
      );
    });

    it("does not require authentication (public endpoint)", async () => {
      mockVerifyAuthentication.mockResolvedValue(mockAuthenticatedUser);

      // No auth header or session — should still work
      const res = await authenticateVerify(
        makeRequest("/api/auth/passkey/authenticate/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validBody),
        })
      );

      expect(res.status).toBe(200);
    });
  });
});
