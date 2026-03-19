/**
 * Unit-Tests für Frequenz-Utilities
 *
 * Testen: hzToMidi, midiToHz, centsDiff Konvertierungen
 *
 * Anforderungen: 6.6
 */

import { describe, it, expect } from "vitest";
import { hzToMidi, midiToHz, centsDiff } from "@/lib/vocal-trainer/frequenz-utils";

describe("frequenz-utils", () => {
  describe("hzToMidi", () => {
    it("converts A4 (440 Hz) to MIDI 69", () => {
      expect(hzToMidi(440)).toBe(69);
    });

    it("converts C4 (~261.63 Hz) to MIDI 60", () => {
      expect(hzToMidi(261.6256)).toBeCloseTo(60, 1);
    });

    it("converts A3 (220 Hz) to MIDI 57", () => {
      expect(hzToMidi(220)).toBeCloseTo(57, 5);
    });
  });

  describe("midiToHz", () => {
    it("converts MIDI 69 to 440 Hz", () => {
      expect(midiToHz(69)).toBe(440);
    });

    it("converts MIDI 60 to ~261.63 Hz (C4)", () => {
      expect(midiToHz(60)).toBeCloseTo(261.6256, 1);
    });

    it("converts MIDI 57 to 220 Hz (A3)", () => {
      expect(midiToHz(57)).toBeCloseTo(220, 5);
    });
  });

  describe("centsDiff", () => {
    it("returns 0 for identical frequencies", () => {
      expect(centsDiff(440, 440)).toBe(0);
    });

    it("returns ~1200 for an octave up", () => {
      expect(centsDiff(880, 440)).toBeCloseTo(1200, 5);
    });

    it("returns ~-1200 for an octave down", () => {
      expect(centsDiff(220, 440)).toBeCloseTo(-1200, 5);
    });

    it("returns ~100 for one semitone up", () => {
      const semitoneUp = 440 * Math.pow(2, 1 / 12);
      expect(centsDiff(semitoneUp, 440)).toBeCloseTo(100, 5);
    });
  });
});
