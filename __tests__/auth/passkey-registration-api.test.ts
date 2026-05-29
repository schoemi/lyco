import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before imports
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/services/passkey-service", () => ({
  generateRegistrationOptions: vi.fn(),
  verifyRegistration: vi.fn(),
  listPasskeys: vi.fn(),
  deletePasskey: vi.fn(),
}));

vi.mock("@/lib/services/passkey-rate-limiter", () => ({
  checkPasskeyRegistrationRateLimit: vi.fn(),
}));

vi.mock("@/lib/utils/request-ip", () => ({
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

import { auth } from "@/lib/auth";
import {
  generateRegistrationOptions,
  verifyRegistration,
  listPasskeys,
  deletePasskey,
} from "@/lib/services/passkey-service";
import { checkPasskeyRegistrationRateLimit } from "@/lib/services/passkey-rate-limiter";
import { POST as registerOptions } from "@/app/api/auth/passkey/register/options/route";
import { POST as registerVerify } from "@/app/api/auth/passkey/register/verify/route";
import { GET as getCredentials } from "@/app/api/auth/passkey/credentials/route";
import { DELETE as deleteCredential } from "@/app/api/auth/passkey/credentials/[id]/route";
import { NextRequest } from "next/server";

const mockAuth = vi.mocked(auth);
const mockGenerateRegistrationOptions = vi.mocked(generateRegistrationOptions);
const mockVerifyRegistration = vi.mocked(verifyRegistration);
const mockListPasskeys = vi.mocked(listPasskeys);
const mockDeletePasskey = vi.mocked(deletePasskey);
const mockCheckRateLimit = vi.mocked(checkPasskeyRegistrationRateLimit);

function makeRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(`http://localhost${url}`, options);
}

describe("Passkey Registration API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockReturnValue({ allowed: true });
  });

  describe("POST /api/auth/passkey/register/options", () => {
    it("returns 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const res = await registerOptions(makeRequest("/api/auth/passkey/register/options", { method: "POST" }));
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Nicht authentifiziert");
    });

    it("returns 429 when rate limited", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } } as any);
      mockCheckRateLimit.mockReturnValue({ allowed: false, retryAfter: 600 });

      const res = await registerOptions(makeRequest("/api/auth/passkey/register/options", { method: "POST" }));
      expect(res.status).toBe(429);
      expect(res.headers.get("Retry-After")).toBe("600");
    });

    it("returns registration options on success", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } } as any);
      const mockOptions = { challenge: "abc123", rp: { name: "Lyco" } };
      mockGenerateRegistrationOptions.mockResolvedValue(mockOptions as any);

      const res = await registerOptions(makeRequest("/api/auth/passkey/register/options", { method: "POST" }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.options).toEqual(mockOptions);
    });

    it("returns 400 when max passkeys reached", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } } as any);
      mockGenerateRegistrationOptions.mockRejectedValue(
        new Error("Maximale Anzahl von 10 Passkeys erreicht. Bitte löschen Sie einen bestehenden Passkey.")
      );

      const res = await registerOptions(makeRequest("/api/auth/passkey/register/options", { method: "POST" }));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Maximale Anzahl");
    });
  });

  describe("POST /api/auth/passkey/register/verify", () => {
    it("returns 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const res = await registerVerify(
        makeRequest("/api/auth/passkey/register/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: {}, name: "Test" }),
        })
      );
      expect(res.status).toBe(401);
    });

    it("returns 429 when rate limited", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } } as any);
      mockCheckRateLimit.mockReturnValue({ allowed: false, retryAfter: 300 });

      const res = await registerVerify(
        makeRequest("/api/auth/passkey/register/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: {}, name: "Test" }),
        })
      );
      expect(res.status).toBe(429);
    });

    it("returns 400 when credential is missing", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } } as any);

      const res = await registerVerify(
        makeRequest("/api/auth/passkey/register/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Test" }),
        })
      );
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Credential fehlt");
    });

    it("returns 400 when name is missing", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } } as any);

      const res = await registerVerify(
        makeRequest("/api/auth/passkey/register/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: {} }),
        })
      );
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Passkey-Name");
    });

    it("returns 201 on successful registration", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } } as any);
      const mockPasskey = { id: "pk-1", name: "My Key", createdAt: new Date() };
      mockVerifyRegistration.mockResolvedValue(mockPasskey);

      const res = await registerVerify(
        makeRequest("/api/auth/passkey/register/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: { id: "cred-1" }, name: "My Key" }),
        })
      );
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.passkey.id).toBe("pk-1");
    });

    it("returns 400 when challenge expired", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } } as any);
      mockVerifyRegistration.mockRejectedValue(
        new Error("Die Sicherheitsabfrage ist abgelaufen. Bitte starten Sie den Vorgang erneut.")
      );

      const res = await registerVerify(
        makeRequest("/api/auth/passkey/register/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: { id: "cred-1" }, name: "My Key" }),
        })
      );
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Sicherheitsabfrage ist abgelaufen");
    });
  });

  describe("GET /api/auth/passkey/credentials", () => {
    it("returns 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const res = await getCredentials();
      expect(res.status).toBe(401);
    });

    it("returns passkey list on success", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } } as any);
      const mockPasskeys = [
        { id: "pk-1", name: "MacBook", createdAt: new Date() },
        { id: "pk-2", name: "iPhone", createdAt: new Date() },
      ];
      mockListPasskeys.mockResolvedValue(mockPasskeys);

      const res = await getCredentials();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.passkeys).toHaveLength(2);
    });
  });

  describe("DELETE /api/auth/passkey/credentials/[id]", () => {
    it("returns 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const res = await deleteCredential(
        makeRequest("/api/auth/passkey/credentials/pk-1", { method: "DELETE" }),
        { params: Promise.resolve({ id: "pk-1" }) }
      );
      expect(res.status).toBe(401);
    });

    it("returns 200 on successful deletion", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } } as any);
      mockDeletePasskey.mockResolvedValue(undefined);

      const res = await deleteCredential(
        makeRequest("/api/auth/passkey/credentials/pk-1", { method: "DELETE" }),
        { params: Promise.resolve({ id: "pk-1" }) }
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.message).toBe("Passkey gelöscht");
    });

    it("returns 404 when passkey not found", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } } as any);
      mockDeletePasskey.mockRejectedValue(new Error("Passkey nicht gefunden"));

      const res = await deleteCredential(
        makeRequest("/api/auth/passkey/credentials/pk-1", { method: "DELETE" }),
        { params: Promise.resolve({ id: "pk-1" }) }
      );
      expect(res.status).toBe(404);
    });

    it("returns 403 when passkey belongs to another user", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } } as any);
      mockDeletePasskey.mockRejectedValue(new Error("Passkey gehört nicht zu diesem Benutzer"));

      const res = await deleteCredential(
        makeRequest("/api/auth/passkey/credentials/pk-1", { method: "DELETE" }),
        { params: Promise.resolve({ id: "pk-1" }) }
      );
      expect(res.status).toBe(403);
    });
  });
});
