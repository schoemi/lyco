/**
 * Property 1: Bug Condition — ZIP-Sicherheitsvalidierung lehnt ungültige Daten ab
 *
 * Für zufällige Byte-Buffer ohne gültige ZIP-Magic-Bytes gibt
 * `validateZipSecurity` immer `{ valid: false }` zurück.
 *
 * Feature: zip-bomb-protection, Property 1: Bug Condition
 *
 * **Validates: Requirements 2.2**
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

// Mock adm-zip so it never actually parses anything
const { mockGetEntries } = vi.hoisted(() => ({
  mockGetEntries: vi.fn(),
}));

vi.mock("adm-zip", () => ({
  default: vi.fn().mockImplementation(function () {
    return { getEntries: mockGetEntries };
  }),
}));

import { validateZipSecurity } from "@/lib/services/import-service";

describe("Feature: zip-bomb-protection, Property 1: Bug Condition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetEntries.mockReturnValue([]);
  });

  it("rejects any random byte buffer whose first byte is not 0x50 (ZIP magic)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .uint8Array({ minLength: 4, maxLength: 512 })
          .map((arr) => {
            // Force first byte to NOT be 0x50 so it can never match ZIP magic
            const copy = new Uint8Array(arr);
            if (copy[0] === 0x50) {
              copy[0] = 0x51;
            }
            return copy;
          }),
        async (arr) => {
          const result = validateZipSecurity(Buffer.from(arr));
          expect(result.valid).toBe(false);
          expect(result.error).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it("rejects any buffer shorter than 4 bytes", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 0, maxLength: 3 }),
        async (arr) => {
          const result = validateZipSecurity(Buffer.from(arr));
          expect(result.valid).toBe(false);
          expect(result.error).toBe(
            "Ungültiges Dateiformat: Keine gültige ZIP-Datei"
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
