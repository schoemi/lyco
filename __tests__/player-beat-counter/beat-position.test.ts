/**
 * Unit tests for berechneBeatPosition — edge cases and specific examples.
 *
 * Tests: empty array, currentTimeMs before first beat, single beat, default taktZaehler,
 * invalid taktZaehler guard.
 *
 * Requirements: 1.3, 1.4, 1.5, 3.1, 3.2, 3.4
 */
import { describe, it, expect } from "vitest";
import { berechneBeatPosition } from "@/hooks/use-beat-position";

describe("berechneBeatPosition", () => {
  describe("empty array", () => {
    it("returns null for empty beatPositionenMs", () => {
      expect(berechneBeatPosition([], 5000)).toBeNull();
    });

    it("returns null for empty array regardless of currentTimeMs", () => {
      expect(berechneBeatPosition([], 0)).toBeNull();
      expect(berechneBeatPosition([], -100)).toBeNull();
      expect(berechneBeatPosition([], 999999)).toBeNull();
    });
  });

  describe("currentTimeMs before first beat", () => {
    it("returns null when currentTimeMs is before the first beat", () => {
      expect(berechneBeatPosition([1000, 2000, 3000], 500)).toBeNull();
    });

    it("returns null when currentTimeMs is 0 and first beat is at 100ms", () => {
      expect(berechneBeatPosition([100, 200, 300], 0)).toBeNull();
    });

    it("returns null for negative currentTimeMs", () => {
      expect(berechneBeatPosition([0, 500, 1000], -1)).toBeNull();
    });
  });

  describe("single beat", () => {
    it("returns takt 1, schlag 1 for a single beat at currentTimeMs", () => {
      const result = berechneBeatPosition([1000], 1000);
      expect(result).toEqual({
        taktNummer: 1,
        schlagImTakt: 1,
        beatIndex: 0,
      });
    });

    it("returns takt 1, schlag 1 for a single beat before currentTimeMs", () => {
      const result = berechneBeatPosition([1000], 5000);
      expect(result).toEqual({
        taktNummer: 1,
        schlagImTakt: 1,
        beatIndex: 0,
      });
    });
  });

  describe("default taktZaehler (4)", () => {
    it("uses taktZaehler=4 when not specified", () => {
      // 8 beats: indices 0-7
      const beats = [0, 500, 1000, 1500, 2000, 2500, 3000, 3500];

      // Beat index 0 → Takt 1, Schlag 1
      expect(berechneBeatPosition(beats, 0)).toEqual({
        taktNummer: 1,
        schlagImTakt: 1,
        beatIndex: 0,
      });

      // Beat index 3 → Takt 1, Schlag 4
      expect(berechneBeatPosition(beats, 1500)).toEqual({
        taktNummer: 1,
        schlagImTakt: 4,
        beatIndex: 3,
      });

      // Beat index 4 → Takt 2, Schlag 1
      expect(berechneBeatPosition(beats, 2000)).toEqual({
        taktNummer: 2,
        schlagImTakt: 1,
        beatIndex: 4,
      });

      // Beat index 7 → Takt 2, Schlag 4
      expect(berechneBeatPosition(beats, 3500)).toEqual({
        taktNummer: 2,
        schlagImTakt: 4,
        beatIndex: 7,
      });
    });
  });

  describe("custom taktZaehler", () => {
    it("computes correctly with taktZaehler=3 (3/4 time)", () => {
      const beats = [0, 500, 1000, 1500, 2000, 2500];

      // Beat index 2 → Takt 1, Schlag 3
      expect(berechneBeatPosition(beats, 1000, 3)).toEqual({
        taktNummer: 1,
        schlagImTakt: 3,
        beatIndex: 2,
      });

      // Beat index 3 → Takt 2, Schlag 1
      expect(berechneBeatPosition(beats, 1500, 3)).toEqual({
        taktNummer: 2,
        schlagImTakt: 1,
        beatIndex: 3,
      });
    });
  });

  describe("invalid taktZaehler guard", () => {
    it("falls back to 4 when taktZaehler is 0", () => {
      const beats = [0, 500, 1000, 1500, 2000];

      // Beat index 4 with default 4 → Takt 2, Schlag 1
      const result = berechneBeatPosition(beats, 2000, 0);
      expect(result).toEqual({
        taktNummer: 2,
        schlagImTakt: 1,
        beatIndex: 4,
      });
    });

    it("falls back to 4 when taktZaehler is negative", () => {
      const beats = [0, 500, 1000, 1500, 2000];

      const result = berechneBeatPosition(beats, 2000, -3);
      expect(result).toEqual({
        taktNummer: 2,
        schlagImTakt: 1,
        beatIndex: 4,
      });
    });
  });

  describe("currentTimeMs between beats", () => {
    it("returns the last beat before currentTimeMs", () => {
      const beats = [0, 1000, 2000, 3000];

      // At 1500ms, last beat is index 1 (at 1000ms)
      const result = berechneBeatPosition(beats, 1500);
      expect(result).toEqual({
        taktNummer: 1,
        schlagImTakt: 2,
        beatIndex: 1,
      });
    });
  });

  describe("currentTimeMs exactly at first beat (0ms)", () => {
    it("returns takt 1, schlag 1 when currentTimeMs equals first beat at 0", () => {
      const result = berechneBeatPosition([0, 500, 1000], 0);
      expect(result).toEqual({
        taktNummer: 1,
        schlagImTakt: 1,
        beatIndex: 0,
      });
    });
  });
});
