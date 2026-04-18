import { describe, it, expect, vi, beforeEach } from "vitest";
import { randomBytes } from "crypto";

// Use vi.hoisted so the mock fn is available inside the hoisted vi.mock factory
const { mockGetEntries } = vi.hoisted(() => ({
  mockGetEntries: vi.fn(),
}));

vi.mock("adm-zip", () => ({
  default: vi.fn().mockImplementation(function () {
    return { getEntries: mockGetEntries };
  }),
}));

import { validateZipSecurity } from "@/lib/services/import-service";

describe("validateZipSecurity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Magic-Bytes-Validierung", () => {
    it("lehnt Buffer mit JPEG-Header ab", () => {
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      const result = validateZipSecurity(jpegBuffer);
      expect(result).toEqual({
        valid: false,
        error: "Ungültiges Dateiformat: Keine gültige ZIP-Datei",
      });
    });

    it("lehnt leeren Buffer ab", () => {
      const emptyBuffer = Buffer.alloc(0);
      const result = validateZipSecurity(emptyBuffer);
      expect(result).toEqual({
        valid: false,
        error: "Ungültiges Dateiformat: Keine gültige ZIP-Datei",
      });
    });

    it("lehnt zufällige Bytes ab", () => {
      const randomBuffer = randomBytes(256);
      // Ensure first bytes are not accidentally ZIP magic bytes
      randomBuffer[0] = 0x00;
      randomBuffer[1] = 0x00;
      const result = validateZipSecurity(randomBuffer);
      expect(result).toEqual({
        valid: false,
        error: "Ungültiges Dateiformat: Keine gültige ZIP-Datei",
      });
    });
  });

  describe("Entpackte Gesamtgröße", () => {
    it("lehnt ZIP mit entpackter Gesamtgröße > 500 MB ab", () => {
      // Buffer with valid ZIP magic bytes
      const zipBuffer = Buffer.alloc(64);
      zipBuffer[0] = 0x50;
      zipBuffer[1] = 0x4b;
      zipBuffer[2] = 0x03;
      zipBuffer[3] = 0x04;

      // Mock entries whose total uncompressed size exceeds 500 MB
      mockGetEntries.mockReturnValue([
        { header: { size: 300 * 1024 * 1024 } }, // 300 MB
        { header: { size: 250 * 1024 * 1024 } }, // 250 MB — total 550 MB
      ]);

      const result = validateZipSecurity(zipBuffer);
      expect(result).toEqual({
        valid: false,
        error: "ZIP-Archiv überschreitet das maximale entpackte Größenlimit (500 MB)",
      });
    });
  });

  describe("Eintragsanzahl", () => {
    it("lehnt ZIP mit > 1.000 Einträgen ab", () => {
      // Buffer with valid ZIP magic bytes
      const zipBuffer = Buffer.alloc(64);
      zipBuffer[0] = 0x50;
      zipBuffer[1] = 0x4b;
      zipBuffer[2] = 0x03;
      zipBuffer[3] = 0x04;

      // Mock > 1000 entries with small sizes (under 500 MB total)
      const mockEntries = Array.from({ length: 1001 }, () => ({
        header: { size: 100 },
      }));
      mockGetEntries.mockReturnValue(mockEntries);

      const result = validateZipSecurity(zipBuffer);
      expect(result).toEqual({
        valid: false,
        error: "ZIP-Archiv enthält zu viele Einträge (max. 1.000)",
      });
    });
  });

  describe("Gültiges ZIP", () => {
    it("akzeptiert gültiges ZIP unter allen Limits", () => {
      // Buffer with valid ZIP magic bytes
      const zipBuffer = Buffer.alloc(64);
      zipBuffer[0] = 0x50;
      zipBuffer[1] = 0x4b;
      zipBuffer[2] = 0x03;
      zipBuffer[3] = 0x04;

      // Mock a small number of entries under all limits
      mockGetEntries.mockReturnValue([
        { header: { size: 1024 } },
        { header: { size: 2048 } },
      ]);

      const result = validateZipSecurity(zipBuffer);
      expect(result).toEqual({ valid: true });
    });
  });
});
