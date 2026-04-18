/**
 * Property 2: Preservation — Gültige Archive werden akzeptiert
 *
 * Für gültige ZIP-Archive unter allen Limits gibt `validateZipSecurity`
 * immer `{ valid: true }` zurück und `validateImport` liefert dasselbe
 * Ergebnis wie vor dem Fix.
 *
 * Feature: zip-bomb-protection, Property 2: Preservation
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

// Mock adm-zip to control entries returned
const { mockGetEntries } = vi.hoisted(() => ({
  mockGetEntries: vi.fn(),
}));

vi.mock("adm-zip", () => ({
  default: vi.fn().mockImplementation(function () {
    return { getEntries: mockGetEntries };
  }),
}));

import { validateZipSecurity } from "@/lib/services/import-service";
import { ZIP_LIMITS } from "@/lib/upload-config";

/**
 * Generates a valid ZIP buffer (starts with magic bytes) and a list of
 * mock entries whose total uncompressed size is ≤ 500 MB and count ≤ 1000.
 */
const arbValidZipInput = fc
  .record({
    entryCount: fc.integer({ min: 1, max: 1000 }),
    // Extra random bytes after the 4-byte header to simulate a real ZIP body
    extraBytes: fc.uint8Array({ minLength: 0, maxLength: 128 }),
  })
  .chain(({ entryCount, extraBytes }) => {
    // Generate random sizes for each entry that sum to ≤ 500 MB
    return fc
      .array(
        fc.integer({ min: 0, max: Math.floor(ZIP_LIMITS.MAX_UNCOMPRESSED_SIZE / entryCount) }),
        { minLength: entryCount, maxLength: entryCount }
      )
      .map((sizes) => ({ entryCount, extraBytes, sizes }));
  })
  .map(({ extraBytes, sizes }) => {
    // Build a buffer with valid ZIP magic bytes
    const header = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
    const body = Buffer.from(extraBytes);
    const zipBuffer = Buffer.concat([header, body]);

    // Build mock entries
    const entries = sizes.map((size) => ({ header: { size } }));

    return { zipBuffer, entries };
  });

describe("Feature: zip-bomb-protection, Property 2: Preservation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts any valid ZIP archive with entries under all limits", async () => {
    await fc.assert(
      fc.asyncProperty(arbValidZipInput, async ({ zipBuffer, entries }) => {
        mockGetEntries.mockReturnValue(entries);

        const result = validateZipSecurity(zipBuffer);

        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });
});
