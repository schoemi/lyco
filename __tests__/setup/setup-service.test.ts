import { describe, it, expect, vi, beforeEach } from "vitest";
import { isSetupRequired, createInitialAdmin } from "@/lib/services/setup-service";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      count: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock auth-service
vi.mock("@/lib/services/auth-service", () => ({
  hashPassword: vi.fn().mockResolvedValue("$2b$12$hashedpassword"),
  validateEmail: vi.fn().mockReturnValue(true),
  validatePassword: vi.fn().mockReturnValue({ valid: true }),
}));

import { prisma } from "@/lib/prisma";
import { validateEmail, validatePassword } from "@/lib/services/auth-service";

const mockCount = vi.mocked(prisma.user.count);
const mockCreate = vi.mocked(prisma.user.create);
const mockValidateEmail = vi.mocked(validateEmail);
const mockValidatePassword = vi.mocked(validatePassword);

describe("SetupService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateEmail.mockReturnValue(true);
    mockValidatePassword.mockReturnValue({ valid: true });
  });

  describe("isSetupRequired", () => {
    it("returns true when no admin exists", async () => {
      mockCount.mockResolvedValue(0);
      expect(await isSetupRequired()).toBe(true);
      expect(mockCount).toHaveBeenCalledWith({ where: { role: "ADMIN" } });
    });

    it("returns false when at least one admin exists", async () => {
      mockCount.mockResolvedValue(1);
      expect(await isSetupRequired()).toBe(false);
    });

    it("returns false when multiple admins exist", async () => {
      mockCount.mockResolvedValue(3);
      expect(await isSetupRequired()).toBe(false);
    });
  });

  describe("createInitialAdmin", () => {
    const validInput = {
      email: "admin@example.com",
      name: "Admin User",
      password: "securepassword123",
    };

    const createdUser = {
      id: "cuid123",
      email: "admin@example.com",
      name: "Admin User",
      role: "ADMIN" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("creates an admin when no admin exists", async () => {
      mockCount.mockResolvedValue(0);
      mockCreate.mockResolvedValue(createdUser);

      const result = await createInitialAdmin(validInput);

      expect(result).toEqual(createdUser);
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          email: validInput.email,
          name: validInput.name,
          passwordHash: "$2b$12$hashedpassword",
          role: "ADMIN",
        },
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

    it("throws error when admin already exists", async () => {
      mockCount.mockResolvedValue(1);

      await expect(createInitialAdmin(validInput)).rejects.toThrow(
        "Setup wurde bereits abgeschlossen"
      );
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("throws error for invalid email", async () => {
      mockCount.mockResolvedValue(0);
      mockValidateEmail.mockReturnValue(false);

      await expect(
        createInitialAdmin({ ...validInput, email: "invalid" })
      ).rejects.toThrow("Ungültige E-Mail-Adresse");
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("throws error for short password", async () => {
      mockCount.mockResolvedValue(0);
      mockValidatePassword.mockReturnValue({
        valid: false,
        error: "Passwort muss mindestens 8 Zeichen lang sein",
      });

      await expect(
        createInitialAdmin({ ...validInput, password: "short" })
      ).rejects.toThrow("Passwort muss mindestens 8 Zeichen lang sein");
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("returns user without passwordHash", async () => {
      mockCount.mockResolvedValue(0);
      mockCreate.mockResolvedValue(createdUser);

      const result = await createInitialAdmin(validInput);

      expect(result).not.toHaveProperty("passwordHash");
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("email");
      expect(result).toHaveProperty("role");
    });
  });
});
