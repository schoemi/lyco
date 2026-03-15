import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CreateUserInput, UpdateUserInput } from "../../src/types/auth";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/services/auth-service", () => ({
  hashPassword: vi.fn(async (pw: string) => `hashed_${pw}`),
}));

import { prisma } from "@/lib/prisma";
import {
  listUsers,
  getUserById,
  isEmailTaken,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
} from "@/lib/services/user-service";

const mockPrisma = vi.mocked(prisma);

const sampleUser = {
  id: "user-1",
  email: "test@example.com",
  name: "Test User",
  role: "USER" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("UserService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listUsers", () => {
    it("returns users without passwordHash", async () => {
      mockPrisma.user.findMany.mockResolvedValue([sampleUser]);
      const result = await listUsers();
      expect(result).toEqual([sampleUser]);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });
  });

  describe("getUserById", () => {
    it("returns user by id without passwordHash", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(sampleUser);
      const result = await getUserById("user-1");
      expect(result).toEqual(sampleUser);
      const call = mockPrisma.user.findUnique.mock.calls[0][0] as any;
      expect(call.where).toEqual({ id: "user-1" });
      expect(call.select.id).toBe(true);
      expect(call.select).not.toHaveProperty("passwordHash");
    });

    it("returns null for non-existent user", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const result = await getUserById("non-existent");
      expect(result).toBeNull();
    });
  });

  describe("isEmailTaken", () => {
    it("returns true when email exists", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1" });
      expect(await isEmailTaken("test@example.com")).toBe(true);
    });

    it("returns false when email does not exist", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      expect(await isEmailTaken("new@example.com")).toBe(false);
    });
  });

  describe("createUser", () => {
    it("creates user with hashed password", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null); // email not taken
      mockPrisma.user.create.mockResolvedValue(sampleUser);

      const input: CreateUserInput = {
        email: "test@example.com",
        name: "Test User",
        password: "securepassword",
        role: "USER",
      };

      const result = await createUser(input);
      expect(result).toEqual(sampleUser);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: "test@example.com",
          name: "Test User",
          passwordHash: "hashed_securepassword",
          role: "USER",
        },
        select: expect.objectContaining({ id: true }),
      });
    });

    it("throws error when email is already taken", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "existing" });

      const input: CreateUserInput = {
        email: "test@example.com",
        password: "securepassword",
        role: "USER",
      };

      await expect(createUser(input)).rejects.toThrow(
        "E-Mail bereits vergeben"
      );
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe("updateUser", () => {
    it("updates user fields", async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ ...sampleUser, passwordHash: "hash" }) // existing user
        .mockResolvedValueOnce(null); // email not taken
      mockPrisma.user.update.mockResolvedValue({
        ...sampleUser,
        name: "Updated",
      });

      const result = await updateUser("user-1", { name: "Updated" });
      expect(result.name).toBe("Updated");
    });

    it("throws error when user not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(updateUser("non-existent", { name: "X" })).rejects.toThrow(
        "Benutzer nicht gefunden"
      );
    });

    it("throws error when new email is already taken", async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({
          ...sampleUser,
          passwordHash: "hash",
          email: "old@example.com",
        })
        .mockResolvedValueOnce({ id: "other-user" }); // email taken

      await expect(
        updateUser("user-1", { email: "taken@example.com" })
      ).rejects.toThrow("E-Mail bereits vergeben");
    });
  });

  describe("deleteUser", () => {
    it("deletes user successfully", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...sampleUser,
        passwordHash: "hash",
      });
      mockPrisma.user.delete.mockResolvedValue(sampleUser);

      await expect(
        deleteUser("user-1", "admin-1")
      ).resolves.toBeUndefined();
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: "user-1" },
      });
    });

    it("throws error on self-deletion", async () => {
      await expect(deleteUser("admin-1", "admin-1")).rejects.toThrow(
        "Eigenen Account kann nicht gelöscht werden"
      );
      expect(mockPrisma.user.delete).not.toHaveBeenCalled();
    });

    it("throws error when user not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(deleteUser("non-existent", "admin-1")).rejects.toThrow(
        "Benutzer nicht gefunden"
      );
    });
  });

  describe("resetPassword", () => {
    it("generates temporary password and updates hash", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...sampleUser,
        passwordHash: "old_hash",
      });
      mockPrisma.user.update.mockResolvedValue(sampleUser);

      const tempPassword = await resetPassword("user-1");
      expect(typeof tempPassword).toBe("string");
      expect(tempPassword.length).toBeGreaterThan(0);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { passwordHash: expect.stringContaining("hashed_") },
      });
    });

    it("throws error when user not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(resetPassword("non-existent")).rejects.toThrow(
        "Benutzer nicht gefunden"
      );
    });
  });
});
