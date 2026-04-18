import { describe, it, expect } from "vitest";
import {
  UPLOAD_LIMITS,
  ZIP_LIMITS,
  ZIP_MAGIC_BYTES,
} from "@/lib/upload-config";

describe("Zentrale Upload-Konfiguration", () => {
  describe("UPLOAD_LIMITS", () => {
    it("enthält korrekte Standardwerte für alle Routen", () => {
      expect(UPLOAD_LIMITS.BACKUP_IMPORT).toBe(100 * 1024 * 1024); // 100 MB
      expect(UPLOAD_LIMITS.AUDIO).toBe(50 * 1024 * 1024); // 50 MB
      expect(UPLOAD_LIMITS.PDF).toBe(5 * 1024 * 1024); // 5 MB
      expect(UPLOAD_LIMITS.COVER).toBe(5 * 1024 * 1024); // 5 MB
      expect(UPLOAD_LIMITS.DEFAULT).toBe(10 * 1024 * 1024); // 10 MB
    });
  });

  describe("ZIP_LIMITS", () => {
    it("enthält korrekte Werte (500 MB, 1.000 Einträge)", () => {
      expect(ZIP_LIMITS.MAX_UNCOMPRESSED_SIZE).toBe(500 * 1024 * 1024); // 500 MB
      expect(ZIP_LIMITS.MAX_ENTRY_COUNT).toBe(1_000);
    });
  });

  describe("ZIP_MAGIC_BYTES", () => {
    it("entspricht [0x50, 0x4B, 0x03, 0x04]", () => {
      expect(ZIP_MAGIC_BYTES).toEqual(
        Buffer.from([0x50, 0x4b, 0x03, 0x04])
      );
    });
  });
});
