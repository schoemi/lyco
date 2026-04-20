/**
 * Unit-Tests für Beat-Marker-Overlay
 *
 * Tests für Marker-Rendering, Hervorhebung, Edge Cases (leeres Array, Position außerhalb).
 * Testet die reinen Hilfsfunktionen berechneMarkerPosition und findeHervorgehobenenBeat.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */
import { describe, it, expect } from "vitest";
import {
  berechneMarkerPosition,
  findeHervorgehobenenBeat,
} from "@/components/songs/beat-marker-overlay";

describe("berechneMarkerPosition", () => {
  it("should calculate correct percentage for a beat at the start", () => {
    expect(berechneMarkerPosition(0, 10000)).toBe(0);
  });

  it("should calculate correct percentage for a beat at the end", () => {
    expect(berechneMarkerPosition(10000, 10000)).toBe(100);
  });

  it("should calculate correct percentage for a beat in the middle", () => {
    expect(berechneMarkerPosition(5000, 10000)).toBe(50);
  });

  it("should calculate correct percentage for a beat at 25%", () => {
    expect(berechneMarkerPosition(2500, 10000)).toBe(25);
  });

  it("should clamp to 100 when beat is beyond duration", () => {
    expect(berechneMarkerPosition(15000, 10000)).toBe(100);
  });

  it("should return 0 when durationMs is 0", () => {
    expect(berechneMarkerPosition(5000, 0)).toBe(0);
  });

  it("should return 0 when durationMs is negative", () => {
    expect(berechneMarkerPosition(5000, -100)).toBe(0);
  });

  it("should return 0 for beat at 0ms with valid duration", () => {
    expect(berechneMarkerPosition(0, 60000)).toBe(0);
  });

  it("should handle very small durations", () => {
    expect(berechneMarkerPosition(1, 1)).toBe(100);
  });
});

describe("findeHervorgehobenenBeat", () => {
  it("should return null for empty beat array", () => {
    expect(findeHervorgehobenenBeat(5000, [])).toBeNull();
  });

  it("should highlight a beat exactly at the current position", () => {
    expect(findeHervorgehobenenBeat(5000, [3000, 5000, 7000])).toBe(1);
  });

  it("should highlight a beat within 50ms tolerance", () => {
    // Current at 5030, beat at 5000 → within 50ms
    expect(findeHervorgehobenenBeat(5030, [3000, 5000, 7000])).toBe(1);
  });

  it("should highlight a beat within negative 50ms tolerance", () => {
    // Current at 4970, beat at 5000 → within 50ms
    expect(findeHervorgehobenenBeat(4970, [3000, 5000, 7000])).toBe(1);
  });

  it("should return null when no beat is within tolerance", () => {
    // Current at 4000, beats at 3000 and 5000 → both > 50ms away
    expect(findeHervorgehobenenBeat(4000, [3000, 5000, 7000])).toBeNull();
  });

  it("should highlight the closest beat when multiple are within tolerance", () => {
    // Current at 5010, beats at 5000 (10ms away) and 5040 (30ms away)
    expect(findeHervorgehobenenBeat(5010, [5000, 5040])).toBe(0);
  });

  it("should highlight beat at exactly 50ms boundary", () => {
    // Current at 5050, beat at 5000 → exactly 50ms away (within tolerance)
    expect(findeHervorgehobenenBeat(5050, [5000])).toBe(0);
  });

  it("should not highlight beat at 51ms boundary", () => {
    // Current at 5051, beat at 5000 → 51ms away (outside tolerance)
    expect(findeHervorgehobenenBeat(5051, [5000])).toBeNull();
  });

  it("should handle single beat in array", () => {
    expect(findeHervorgehobenenBeat(1000, [1020])).toBe(0);
  });

  it("should handle current position at 0", () => {
    expect(findeHervorgehobenenBeat(0, [0, 500, 1000])).toBe(0);
  });

  it("should use custom tolerance when provided", () => {
    // With tolerance 100ms, beat at 5000 should be highlighted from 4900-5100
    expect(findeHervorgehobenenBeat(4920, [5000], 100)).toBe(0);
    // With tolerance 10ms, beat at 5000 should NOT be highlighted from 4920
    expect(findeHervorgehobenenBeat(4920, [5000], 10)).toBeNull();
  });
});
