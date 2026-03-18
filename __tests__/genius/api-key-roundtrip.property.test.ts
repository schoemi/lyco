/**
 * Property 1: API-Schlüssel-Verschlüsselung Round-Trip
 *
 * Für jeden gültigen API-Schlüssel-String: `decryptApiKey(encryptApiKey(key)) === key`
 *
 * Feature: genius-song-import, Property 1: API-Schlüssel-Verschlüsselung Round-Trip
 *
 * **Validates: Requirements 8.2, 8.3, 8.7**
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fc from "fast-check";
import { encryptApiKey, decryptApiKey } from "@/lib/genius/api-key-store";

// A valid 32-byte hex-encoded key for testing
const TEST_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("Feature: genius-song-import, Property 1: API-Schlüssel-Verschlüsselung Round-Trip", () => {
  beforeEach(() => {
    process.env.GENIUS_ENCRYPTION_KEY = TEST_KEY;
  });

  afterEach(() => {
    delete process.env.GENIUS_ENCRYPTION_KEY;
  });

  it("decryptApiKey(encryptApiKey(key)) === key for every valid API key string", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 256 }),
        (apiKey) => {
          const encrypted = encryptApiKey(apiKey);
          const decrypted = decryptApiKey(encrypted);
          expect(decrypted).toBe(apiKey);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("each encryption produces a unique ciphertext (random IV)", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 128 }),
        (apiKey) => {
          const a = encryptApiKey(apiKey);
          const b = encryptApiKey(apiKey);
          expect(a).not.toBe(b);
          // Both must still decrypt to the original
          expect(decryptApiKey(a)).toBe(apiKey);
          expect(decryptApiKey(b)).toBe(apiKey);
        }
      ),
      { numRuns: 100 }
    );
  });
});
