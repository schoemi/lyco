import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Unit-Tests für den UnlinkHandler
 * DELETE /api/auth/sso/unlink
 *
 * Requirements: 3.4, 3.5
 */

// --- Mocks (müssen vor den Importen stehen) ---

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

const mockCount = vi.fn();
const mockFindMany = vi.fn();
const mockDeleteMany = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    ssoAccount: {
      count: (...args: unknown[]) => mockCount(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
      deleteMany: (...args: unknown[]) => mockDeleteMany(...args),
    },
  },
}));

const mockLogAudit = vi.fn();
vi.mock("@/lib/services/log-service", () => ({
  logAudit: (...args: unknown[]) => mockLogAudit(...args),
  SSO_UNLINK_SUCCESS: "SSO_UNLINK_SUCCESS",
}));

import { DELETE } from "@/app/api/auth/sso/unlink/route";

// --- Test-Fixtures ---

const authenticatedSession = {
  user: { id: "user-123", email: "test@example.com", name: "Test User" },
};

function setupHappyPath() {
  mockAuth.mockResolvedValue(authenticatedSession);
  mockCount.mockResolvedValue(2);
  mockFindMany.mockResolvedValue([
    { provider: "authentik" },
    { provider: "google" },
  ]);
  mockDeleteMany.mockResolvedValue({ count: 2 });
}

describe("UnlinkHandler — DELETE /api/auth/sso/unlink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Requirement 3.5: 401 wenn nicht authentifiziert ---
  describe("401 — Nicht authentifiziert (Requirement 3.5)", () => {
    it("gibt 401 zurück wenn keine Session vorhanden ist", async () => {
      mockAuth.mockResolvedValue(null);

      const res = await DELETE();

      expect(res.status).toBe(401);
    });

    it("gibt 401 zurück wenn Session keinen User enthält", async () => {
      mockAuth.mockResolvedValue({ user: null });

      const res = await DELETE();

      expect(res.status).toBe(401);
    });

    it("gibt 401 zurück wenn User keine ID hat", async () => {
      mockAuth.mockResolvedValue({ user: { email: "no-id@example.com" } });

      const res = await DELETE();

      expect(res.status).toBe(401);
    });

    it("enthält eine Fehlermeldung im Response-Body bei 401", async () => {
      mockAuth.mockResolvedValue(null);

      const res = await DELETE();
      const json = await res.json();

      expect(json.error).toBeTruthy();
    });

    it("löst keinen DB-Zugriff aus bei nicht authentifiziertem User", async () => {
      mockAuth.mockResolvedValue(null);

      await DELETE();

      expect(mockCount).not.toHaveBeenCalled();
      expect(mockDeleteMany).not.toHaveBeenCalled();
    });
  });

  // --- Requirement 3.4: 404 wenn kein SsoAccount vorhanden ---
  describe("404 — Kein SsoAccount vorhanden (Requirement 3.4)", () => {
    it("gibt 404 zurück wenn count = 0", async () => {
      mockAuth.mockResolvedValue(authenticatedSession);
      mockCount.mockResolvedValue(0);

      const res = await DELETE();

      expect(res.status).toBe(404);
    });

    it("enthält eine Fehlermeldung im Response-Body bei 404", async () => {
      mockAuth.mockResolvedValue(authenticatedSession);
      mockCount.mockResolvedValue(0);

      const res = await DELETE();
      const json = await res.json();

      expect(json.error).toBeTruthy();
    });

    it("löst kein deleteMany aus wenn kein SsoAccount vorhanden ist", async () => {
      mockAuth.mockResolvedValue(authenticatedSession);
      mockCount.mockResolvedValue(0);

      await DELETE();

      expect(mockDeleteMany).not.toHaveBeenCalled();
    });

    it("ruft count mit der userId aus der Session auf", async () => {
      mockAuth.mockResolvedValue(authenticatedSession);
      mockCount.mockResolvedValue(0);

      await DELETE();

      expect(mockCount).toHaveBeenCalledWith({
        where: { userId: "user-123" },
      });
    });
  });

  // --- Requirement 3.6: 500 bei DB-Fehler ---
  describe("500 — Interner Datenbankfehler (Requirement 3.6)", () => {
    it("gibt 500 zurück wenn deleteMany wirft", async () => {
      setupHappyPath();
      mockDeleteMany.mockRejectedValue(new Error("DB connection lost"));

      const res = await DELETE();

      expect(res.status).toBe(500);
    });

    it("enthält eine Fehlermeldung im Response-Body bei 500", async () => {
      setupHappyPath();
      mockDeleteMany.mockRejectedValue(new Error("DB connection lost"));

      const res = await DELETE();
      const json = await res.json();

      expect(json.error).toBeTruthy();
    });

    it("schreibt keinen Audit-Log-Eintrag wenn deleteMany fehlschlägt", async () => {
      setupHappyPath();
      mockDeleteMany.mockRejectedValue(new Error("Constraint violation"));

      await DELETE();

      expect(mockLogAudit).not.toHaveBeenCalled();
    });
  });

  // --- Requirement 3.1, 3.2, 3.3: Happy Path ---
  describe("200 — Erfolgreicher Unlink (Requirements 3.1, 3.2, 3.3)", () => {
    it("gibt 200 mit { unlinked: true } zurück", async () => {
      setupHappyPath();

      const res = await DELETE();

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.unlinked).toBe(true);
    });

    it("ruft deleteMany mit der userId aus der Session auf", async () => {
      setupHappyPath();

      await DELETE();

      expect(mockDeleteMany).toHaveBeenCalledWith({
        where: { userId: "user-123" },
      });
    });

    it("ruft findMany vor dem Löschen auf, um Provider zu ermitteln", async () => {
      setupHappyPath();

      await DELETE();

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { userId: "user-123" },
        select: { provider: true },
      });
    });

    it("schreibt einen Audit-Log-Eintrag nach erfolgreichem Unlink", async () => {
      setupHappyPath();

      await DELETE();

      expect(mockLogAudit).toHaveBeenCalledOnce();
      const logArg = mockLogAudit.mock.calls[0][0];
      expect(logArg.action).toBe("SSO_UNLINK_SUCCESS");
      expect(logArg.actorId).toBe("user-123");
    });

    it("übergibt die Provider-Liste an den Audit-Log", async () => {
      setupHappyPath();

      await DELETE();

      const logArg = mockLogAudit.mock.calls[0][0];
      expect(logArg.details.providers).toEqual(["authentik", "google"]);
    });

    it("funktioniert auch wenn nur ein SsoAccount vorhanden ist", async () => {
      mockAuth.mockResolvedValue(authenticatedSession);
      mockCount.mockResolvedValue(1);
      mockFindMany.mockResolvedValue([{ provider: "authentik" }]);
      mockDeleteMany.mockResolvedValue({ count: 1 });

      const res = await DELETE();

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.unlinked).toBe(true);
    });
  });
});
