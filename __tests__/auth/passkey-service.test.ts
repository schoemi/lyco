import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    passkey: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    webAuthnChallenge: {
      deleteMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  listPasskeys,
  deletePasskey,
  cleanupExpiredChallenges,
} from "@/lib/services/passkey-service";

const mockPrisma = vi.mocked(prisma);

const samplePasskey = {
  id: "passkey-1",
  name: "My MacBook",
  createdAt: new Date("2024-01-15T10:00:00Z"),
};

describe("PasskeyService - Management Methods", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listPasskeys", () => {
    it("returns passkeys for a user with id, name, createdAt", async () => {
      mockPrisma.passkey.findMany.mockResolvedValue([
        samplePasskey,
        { id: "passkey-2", name: "iPhone", createdAt: new Date("2024-02-01T10:00:00Z") },
      ]);

      const result = await listPasskeys("user-1");

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(samplePasskey);
      expect(result[1]).toEqual({
        id: "passkey-2",
        name: "iPhone",
        createdAt: new Date("2024-02-01T10:00:00Z"),
      });
      expect(mockPrisma.passkey.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        select: {
          id: true,
          name: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });
    });

    it("returns empty array when user has no passkeys", async () => {
      mockPrisma.passkey.findMany.mockResolvedValue([]);

      const result = await listPasskeys("user-no-passkeys");

      expect(result).toEqual([]);
      expect(mockPrisma.passkey.findMany).toHaveBeenCalledWith({
        where: { userId: "user-no-passkeys" },
        select: { id: true, name: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      });
    });
  });

  describe("deletePasskey", () => {
    it("deletes a passkey that belongs to the user", async () => {
      mockPrisma.passkey.findUnique.mockResolvedValue({
        id: "passkey-1",
        userId: "user-1",
      });
      mockPrisma.passkey.delete.mockResolvedValue(samplePasskey as any);

      await expect(deletePasskey("user-1", "passkey-1")).resolves.toBeUndefined();

      expect(mockPrisma.passkey.findUnique).toHaveBeenCalledWith({
        where: { id: "passkey-1" },
        select: { id: true, userId: true },
      });
      expect(mockPrisma.passkey.delete).toHaveBeenCalledWith({
        where: { id: "passkey-1" },
      });
    });

    it("throws error when passkey does not exist", async () => {
      mockPrisma.passkey.findUnique.mockResolvedValue(null);

      await expect(deletePasskey("user-1", "non-existent")).rejects.toThrow(
        "Passkey nicht gefunden"
      );
      expect(mockPrisma.passkey.delete).not.toHaveBeenCalled();
    });

    it("throws error when passkey belongs to a different user", async () => {
      mockPrisma.passkey.findUnique.mockResolvedValue({
        id: "passkey-1",
        userId: "other-user",
      });

      await expect(deletePasskey("user-1", "passkey-1")).rejects.toThrow(
        "Passkey gehört nicht zu diesem Benutzer"
      );
      expect(mockPrisma.passkey.delete).not.toHaveBeenCalled();
    });
  });
});

describe("PasskeyService - Challenge Cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("cleanupExpiredChallenges", () => {
    it("deletes all expired challenges and returns the count", async () => {
      mockPrisma.webAuthnChallenge.deleteMany.mockResolvedValue({ count: 3 });

      const result = await cleanupExpiredChallenges();

      expect(result).toBe(3);
      expect(mockPrisma.webAuthnChallenge.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: { lt: expect.any(Date) },
        },
      });
    });

    it("returns 0 when no expired challenges exist", async () => {
      mockPrisma.webAuthnChallenge.deleteMany.mockResolvedValue({ count: 0 });

      const result = await cleanupExpiredChallenges();

      expect(result).toBe(0);
    });

    it("uses current time as the expiry threshold", async () => {
      const before = new Date();
      mockPrisma.webAuthnChallenge.deleteMany.mockResolvedValue({ count: 1 });

      await cleanupExpiredChallenges();

      const call = mockPrisma.webAuthnChallenge.deleteMany.mock.calls[0][0];
      const threshold = (call as any).where.expiresAt.lt as Date;
      const after = new Date();

      expect(threshold.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(threshold.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });
});
