import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  encryptApiKey,
  decryptApiKey,
  getUserApiKey,
  maskApiKey,
} from "@/lib/genius/api-key-store";

const mockPrisma = vi.mocked(prisma);

// A valid 32-byte hex-encoded key for testing
const TEST_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("api-key-store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GENIUS_ENCRYPTION_KEY = TEST_KEY;
  });

  afterEach(() => {
    delete process.env.GENIUS_ENCRYPTION_KEY;
  });

  describe("encryptApiKey / decryptApiKey", () => {
    it("round-trips a typical API key", () => {
      const key = "my-genius-api-key-12345";
      const encrypted = encryptApiKey(key);
      expect(decryptApiKey(encrypted)).toBe(key);
    });

    it("produces different ciphertexts for the same plaintext (random IV)", () => {
      const key = "same-key";
      const a = encryptApiKey(key);
      const b = encryptApiKey(key);
      expect(a).not.toBe(b);
    });

    it("output is valid base64", () => {
      const encrypted = encryptApiKey("test");
      expect(() => Buffer.from(encrypted, "base64")).not.toThrow();
      // Re-encoding should match (no invalid chars)
      const buf = Buffer.from(encrypted, "base64");
      expect(buf.toString("base64")).toBe(encrypted);
    });

    it("throws when GENIUS_ENCRYPTION_KEY is not set", () => {
      delete process.env.GENIUS_ENCRYPTION_KEY;
      expect(() => encryptApiKey("test")).toThrow("GENIUS_ENCRYPTION_KEY is not set");
    });

    it("throws when GENIUS_ENCRYPTION_KEY is wrong length", () => {
      process.env.GENIUS_ENCRYPTION_KEY = "abcd";
      expect(() => encryptApiKey("test")).toThrow("must be 32 bytes");
    });

    it("throws on tampered ciphertext", () => {
      const encrypted = encryptApiKey("secret");
      const buf = Buffer.from(encrypted, "base64");
      // Flip a byte in the ciphertext portion
      buf[buf.length - 1] ^= 0xff;
      const tampered = buf.toString("base64");
      expect(() => decryptApiKey(tampered)).toThrow();
    });
  });

  describe("getUserApiKey", () => {
    it("returns decrypted key when user has one", async () => {
      const plainKey = "genius-token-abc";
      const encrypted = encryptApiKey(plainKey);
      mockPrisma.user.findUnique.mockResolvedValue({
        geniusApiKeyEncrypted: encrypted,
      } as any);

      const result = await getUserApiKey("user-1");
      expect(result).toBe(plainKey);
    });

    it("throws when user has no API key", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        geniusApiKeyEncrypted: null,
      } as any);

      await expect(getUserApiKey("user-1")).rejects.toThrow(
        "Kein Genius-API-Schlüssel hinterlegt"
      );
    });

    it("throws when user not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(getUserApiKey("non-existent")).rejects.toThrow(
        "Kein Genius-API-Schlüssel hinterlegt"
      );
    });
  });

  describe("maskApiKey", () => {
    it("masks all but last 4 chars for long keys", () => {
      expect(maskApiKey("mySecretKey1234")).toBe("•••••••••••1234");
    });

    it("masks a 5-char key showing last 4", () => {
      expect(maskApiKey("abcde")).toBe("•bcde");
    });

    it("returns key as-is when length <= 4", () => {
      expect(maskApiKey("abcd")).toBe("abcd");
      expect(maskApiKey("ab")).toBe("ab");
      expect(maskApiKey("")).toBe("");
    });
  });
});
