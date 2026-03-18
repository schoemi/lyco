/**
 * Property 2: API-Schlüssel-Maskierung verbirgt Klartext
 *
 * Für jeden Schlüssel mit Länge ≥ 4: maskierte Darstellung enthält nicht den vollständigen Schlüssel,
 * zeigt nur letzte 4 Zeichen.
 *
 * Feature: genius-song-import, Property 2: API-Schlüssel-Maskierung verbirgt Klartext
 *
 * **Validates: Requirements 8.5**
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { maskApiKey } from "@/lib/genius/api-key-store";

describe("Feature: genius-song-import, Property 2: API-Schlüssel-Maskierung verbirgt Klartext", () => {
  it("masked representation does NOT contain the full key for keys with length >= 4", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 5, maxLength: 256 }).filter((s) => s.length >= 5),
        (apiKey) => {
          const masked = maskApiKey(apiKey);
          expect(masked).not.toBe(apiKey);
          expect(masked).not.toContain(apiKey);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("masked representation shows only the last 4 characters in cleartext", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 4, maxLength: 256 }).filter((s) => s.length >= 4),
        (apiKey) => {
          const masked = maskApiKey(apiKey);
          const lastFour = apiKey.slice(-4);

          // The masked string must end with the last 4 characters
          expect(masked.endsWith(lastFour)).toBe(true);

          // The prefix must be all mask characters (•)
          const prefix = masked.slice(0, masked.length - 4);
          expect(prefix).toBe("•".repeat(apiKey.length - 4));

          // Total length must match original key length
          expect(masked.length).toBe(apiKey.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
