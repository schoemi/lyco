import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  checkUploadRateLimit,
  clearAllUploadRateLimits,
} from "@/lib/services/upload-rate-limiter";

describe("Upload Rate Limiter", () => {
  beforeEach(() => {
    clearAllUploadRateLimits();
    vi.restoreAllMocks();
  });

  it("erlaubt den ersten Upload eines Users", () => {
    const result = checkUploadRateLimit("user-1");
    expect(result.allowed).toBe(true);
    expect(result.retryAfter).toBeUndefined();
  });

  it("erlaubt bis zu 20 Uploads innerhalb des Fensters", () => {
    for (let i = 0; i < 20; i++) {
      const result = checkUploadRateLimit("user-1");
      expect(result.allowed).toBe(true);
    }
  });

  it("blockiert den 21. Upload und gibt retryAfter zurück", () => {
    for (let i = 0; i < 20; i++) {
      checkUploadRateLimit("user-1");
    }

    const result = checkUploadRateLimit("user-1");
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeDefined();
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("trackt verschiedene User unabhängig", () => {
    for (let i = 0; i < 20; i++) {
      checkUploadRateLimit("user-1");
    }

    const resultUser1 = checkUploadRateLimit("user-1");
    expect(resultUser1.allowed).toBe(false);

    const resultUser2 = checkUploadRateLimit("user-2");
    expect(resultUser2.allowed).toBe(true);
  });

  it("bereinigt abgelaufene Timestamps und erlaubt neue Uploads", () => {
    const now = Date.now();
    const sixteenMinutesAgo = now - 16 * 60 * 1000;

    // Simuliere alte Timestamps durch Manipulation von Date.now
    vi.spyOn(Date, "now").mockReturnValue(sixteenMinutesAgo);
    for (let i = 0; i < 20; i++) {
      checkUploadRateLimit("user-1");
    }

    // Jetzt zurück zur aktuellen Zeit — alte Einträge sind abgelaufen
    vi.spyOn(Date, "now").mockReturnValue(now);
    const result = checkUploadRateLimit("user-1");
    expect(result.allowed).toBe(true);
  });

  it("retryAfter ist in Sekunden und positiv", () => {
    for (let i = 0; i < 20; i++) {
      checkUploadRateLimit("user-1");
    }

    const result = checkUploadRateLimit("user-1");
    expect(result.allowed).toBe(false);
    expect(typeof result.retryAfter).toBe("number");
    expect(result.retryAfter!).toBeGreaterThan(0);
    // retryAfter sollte maximal 15 Minuten (900 Sekunden) sein
    expect(result.retryAfter!).toBeLessThanOrEqual(900);
  });
});
