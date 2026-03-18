import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/services/auth-service", () => ({
  verifyPassword: vi.fn(),
  validatePassword: vi.fn(),
  hashPassword: vi.fn(async (pw: string) => `hashed_${pw}`),
}));

vi.mock("@/lib/genius/api-key-store", () => ({
  encryptApiKey: vi.fn((key: string) => `encrypted_${key}`),
  decryptApiKey: vi.fn((enc: string) => enc.replace("encrypted_", "")),
  maskApiKey: vi.fn((key: string) => "••••" + key.slice(-4)),
}));

import { prisma } from "@/lib/prisma";
import {
  verifyPassword,
  validatePassword,
} from "@/lib/services/auth-service";
import { encryptApiKey, decryptApiKey, maskApiKey } from "@/lib/genius/api-key-store";
import {
  getProfile,
  updateProfile,
  changePassword,
} from "@/lib/services/profil-service";

const mockPrisma = vi.mocked(prisma);
const mockVerifyPassword = vi.mocked(verifyPassword);
const mockValidatePassword = vi.mocked(validatePassword);
const mockEncryptApiKey = vi.mocked(encryptApiKey);
const mockDecryptApiKey = vi.mocked(decryptApiKey);
const mockMaskApiKey = vi.mocked(maskApiKey);

const sampleProfile = {
  id: "user-1",
  name: "Test User",
  email: "test@example.com",
  alter: 30,
  geschlecht: "MAENNLICH" as const,
  erfahrungslevel: "ANFAENGER" as const,
  stimmlage: "Tenor",
  genre: "Rock",
  geniusApiKeyEncrypted: null as string | null,
};

describe("profil-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getProfile", () => {
    it("returns profile data without password hash", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(sampleProfile);
      const result = await getProfile("user-1");
      expect(result).toEqual({
        id: "user-1",
        name: "Test User",
        email: "test@example.com",
        alter: 30,
        geschlecht: "MAENNLICH",
        erfahrungslevel: "ANFAENGER",
        stimmlage: "Tenor",
        genre: "Rock",
        geniusApiKeyMasked: null,
      });
      const call = mockPrisma.user.findUnique.mock.calls[0][0] as any;
      expect(call.where).toEqual({ id: "user-1" });
      expect(call.select).not.toHaveProperty("passwordHash");
    });

    it("throws error when user not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(getProfile("non-existent")).rejects.toThrow(
        "Benutzer nicht gefunden"
      );
    });
  });

  describe("updateProfile – validation", () => {
    it("rejects empty name", async () => {
      await expect(
        updateProfile("user-1", { name: "" })
      ).rejects.toThrow("Name darf nicht leer sein");
    });

    it("rejects whitespace-only name", async () => {
      await expect(
        updateProfile("user-1", { name: "   " })
      ).rejects.toThrow("Name darf nicht leer sein");
    });

    it("rejects name longer than 100 characters", async () => {
      const longName = "a".repeat(101);
      await expect(
        updateProfile("user-1", { name: longName })
      ).rejects.toThrow("Name darf maximal 100 Zeichen lang sein");
    });

    it("accepts name with exactly 100 characters", async () => {
      const name100 = "a".repeat(100);
      mockPrisma.user.update.mockResolvedValue({ ...sampleProfile, name: name100 });
      const result = await updateProfile("user-1", { name: name100 });
      expect(result.name).toBe(name100);
    });

    it("rejects non-integer alter", async () => {
      await expect(
        updateProfile("user-1", { alter: 25.5 })
      ).rejects.toThrow("Alter muss eine Ganzzahl zwischen 1 und 120 sein");
    });

    it("rejects alter below 1", async () => {
      await expect(
        updateProfile("user-1", { alter: 0 })
      ).rejects.toThrow("Alter muss eine Ganzzahl zwischen 1 und 120 sein");
    });

    it("rejects alter above 120", async () => {
      await expect(
        updateProfile("user-1", { alter: 121 })
      ).rejects.toThrow("Alter muss eine Ganzzahl zwischen 1 und 120 sein");
    });

    it("accepts alter at boundary 1", async () => {
      mockPrisma.user.update.mockResolvedValue({ ...sampleProfile, alter: 1 });
      const result = await updateProfile("user-1", { alter: 1 });
      expect(result.alter).toBe(1);
    });

    it("accepts alter at boundary 120", async () => {
      mockPrisma.user.update.mockResolvedValue({ ...sampleProfile, alter: 120 });
      const result = await updateProfile("user-1", { alter: 120 });
      expect(result.alter).toBe(120);
    });

    it("rejects invalid geschlecht", async () => {
      await expect(
        updateProfile("user-1", { geschlecht: "INVALID" as any })
      ).rejects.toThrow("Geschlecht muss MAENNLICH, WEIBLICH oder DIVERS sein");
    });

    it("accepts valid geschlecht values", async () => {
      for (const g of ["MAENNLICH", "WEIBLICH", "DIVERS"] as const) {
        mockPrisma.user.update.mockResolvedValue({ ...sampleProfile, geschlecht: g });
        const result = await updateProfile("user-1", { geschlecht: g });
        expect(result.geschlecht).toBe(g);
      }
    });

    it("rejects invalid erfahrungslevel", async () => {
      await expect(
        updateProfile("user-1", { erfahrungslevel: "MEISTER" as any })
      ).rejects.toThrow(
        "Erfahrungslevel muss ANFAENGER, FORTGESCHRITTEN, ERFAHREN oder PROFI sein"
      );
    });

    it("accepts valid erfahrungslevel values", async () => {
      for (const e of ["ANFAENGER", "FORTGESCHRITTEN", "ERFAHREN", "PROFI"] as const) {
        mockPrisma.user.update.mockResolvedValue({ ...sampleProfile, erfahrungslevel: e });
        const result = await updateProfile("user-1", { erfahrungslevel: e });
        expect(result.erfahrungslevel).toBe(e);
      }
    });

    it("allows null for optional fields", async () => {
      mockPrisma.user.update.mockResolvedValue({
        ...sampleProfile,
        alter: null,
        geschlecht: null,
        erfahrungslevel: null,
      });
      const result = await updateProfile("user-1", {
        alter: null,
        geschlecht: null,
        erfahrungslevel: null,
      });
      expect(result.alter).toBeNull();
      expect(result.geschlecht).toBeNull();
      expect(result.erfahrungslevel).toBeNull();
    });
  });

  describe("getProfile – Genius API Key", () => {
    it("returns masked key when geniusApiKeyEncrypted is set", async () => {
      const profileWithKey = {
        ...sampleProfile,
        geniusApiKeyEncrypted: "encrypted_mySecretKey1234",
      };
      mockPrisma.user.findUnique.mockResolvedValue(profileWithKey);

      const result = await getProfile("user-1");

      expect(mockDecryptApiKey).toHaveBeenCalledWith("encrypted_mySecretKey1234");
      expect(mockMaskApiKey).toHaveBeenCalledWith("mySecretKey1234");
      expect(result.geniusApiKeyMasked).toBe("••••1234");
    });

    it("returns null when geniusApiKeyEncrypted is null", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(sampleProfile);

      const result = await getProfile("user-1");

      expect(mockDecryptApiKey).not.toHaveBeenCalled();
      expect(result.geniusApiKeyMasked).toBeNull();
    });
  });

  describe("updateProfile – Genius API Key", () => {
    it("encrypts and saves non-empty geniusApiKey", async () => {
      const updatedProfile = {
        ...sampleProfile,
        geniusApiKeyEncrypted: "encrypted_newApiKey9999",
      };
      mockPrisma.user.update.mockResolvedValue(updatedProfile);

      const result = await updateProfile("user-1", { geniusApiKey: "newApiKey9999" });

      expect(mockEncryptApiKey).toHaveBeenCalledWith("newApiKey9999");
      const updateCall = mockPrisma.user.update.mock.calls[0][0] as any;
      expect(updateCall.data.geniusApiKeyEncrypted).toBe("encrypted_newApiKey9999");
      expect(result.geniusApiKeyMasked).toBe("••••9999");
    });

    it("sets geniusApiKeyEncrypted to null when geniusApiKey is empty", async () => {
      const updatedProfile = {
        ...sampleProfile,
        geniusApiKeyEncrypted: null,
      };
      mockPrisma.user.update.mockResolvedValue(updatedProfile);

      const result = await updateProfile("user-1", { geniusApiKey: "" });

      expect(mockEncryptApiKey).not.toHaveBeenCalled();
      const updateCall = mockPrisma.user.update.mock.calls[0][0] as any;
      expect(updateCall.data.geniusApiKeyEncrypted).toBeNull();
      expect(result.geniusApiKeyMasked).toBeNull();
    });

    it("does not touch geniusApiKeyEncrypted when geniusApiKey is not provided", async () => {
      mockPrisma.user.update.mockResolvedValue(sampleProfile);

      await updateProfile("user-1", { name: "New Name" });

      expect(mockEncryptApiKey).not.toHaveBeenCalled();
      const updateCall = mockPrisma.user.update.mock.calls[0][0] as any;
      expect(updateCall.data).not.toHaveProperty("geniusApiKeyEncrypted");
    });
  });

  describe("changePassword", () => {
    const passwordData = {
      currentPassword: "oldPassword1",
      newPassword: "newPassword1",
      confirmPassword: "newPassword1",
    };

    it("throws when current password is wrong", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        passwordHash: "hash123",
      });
      mockVerifyPassword.mockResolvedValue(false);

      await expect(
        changePassword("user-1", passwordData)
      ).rejects.toThrow("Aktuelles Passwort ist falsch");
    });

    it("throws when new passwords do not match", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        passwordHash: "hash123",
      });
      mockVerifyPassword.mockResolvedValue(true);

      await expect(
        changePassword("user-1", {
          ...passwordData,
          confirmPassword: "different",
        })
      ).rejects.toThrow("Passwörter stimmen nicht überein");
    });

    it("throws when new password is too short", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        passwordHash: "hash123",
      });
      mockVerifyPassword.mockResolvedValue(true);
      mockValidatePassword.mockReturnValue({
        valid: false,
        error: "Passwort muss mindestens 8 Zeichen lang sein",
      });

      await expect(
        changePassword("user-1", {
          currentPassword: "oldPassword1",
          newPassword: "short",
          confirmPassword: "short",
        })
      ).rejects.toThrow("Passwort muss mindestens 8 Zeichen lang sein");
    });

    it("throws when user not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        changePassword("non-existent", passwordData)
      ).rejects.toThrow("Benutzer nicht gefunden");
    });

    it("hashes and saves new password on success", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        passwordHash: "hash123",
      });
      mockVerifyPassword.mockResolvedValue(true);
      mockValidatePassword.mockReturnValue({ valid: true });
      mockPrisma.user.update.mockResolvedValue({} as any);

      await changePassword("user-1", passwordData);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { passwordHash: "hashed_newPassword1" },
      });
    });
  });
});
