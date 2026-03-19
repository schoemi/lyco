/**
 * Unit-Tests für Pitch-Daten Serialisierung/Deserialisierung
 *
 * Anforderungen: 12.1, 12.2
 */

import { describe, it, expect } from "vitest";
import {
  serializePitchDaten,
  deserializePitchDaten,
} from "@/lib/vocal-trainer/pitch-daten";
import type { PitchFrame } from "@/types/vocal-trainer";

const validFrames: PitchFrame[] = [
  { timestampMs: 0, f0Hz: 440.0, midiValue: 69.0, isVoiced: true, confidence: 0.95 },
  { timestampMs: 23, f0Hz: 0, midiValue: 0, isVoiced: false, confidence: 0.1 },
];

describe("pitch-daten", () => {
  describe("serializePitchDaten", () => {
    it("serializes valid frames to a JSON string", () => {
      const json = serializePitchDaten(validFrames);
      expect(typeof json).toBe("string");
      expect(JSON.parse(json)).toEqual(validFrames);
    });

    it("serializes empty frames array", () => {
      const json = serializePitchDaten([]);
      expect(JSON.parse(json)).toEqual([]);
    });
  });

  describe("deserializePitchDaten", () => {
    it("deserializes valid JSON to a PitchFrame array", () => {
      const json = JSON.stringify(validFrames);
      const result = deserializePitchDaten(json);
      expect(result).toEqual(validFrames);
    });

    it("throws on invalid JSON syntax", () => {
      expect(() => deserializePitchDaten("{not valid json")).toThrow("Ungültiges JSON");
    });

    it("throws when root is not an array", () => {
      expect(() => deserializePitchDaten('{"key": "value"}')).toThrow("Erwartet wird ein Array");
    });

    it("throws when root is a string", () => {
      expect(() => deserializePitchDaten('"just a string"')).toThrow("Erwartet wird ein Array");
    });

    it("throws when root is null", () => {
      expect(() => deserializePitchDaten("null")).toThrow("Erwartet wird ein Array");
    });

    it("throws when a frame is not an object", () => {
      expect(() => deserializePitchDaten('[42]')).toThrow("Frame an Index 0");
    });

    it("throws when a frame is null", () => {
      expect(() => deserializePitchDaten('[null]')).toThrow("Frame an Index 0");
    });

    it("throws when a frame is an array", () => {
      expect(() => deserializePitchDaten('[[]]')).toThrow("Frame an Index 0");
    });

    it("throws when timestampMs is missing", () => {
      const data = [{ f0Hz: 440, midiValue: 69, isVoiced: true, confidence: 0.9 }];
      expect(() => deserializePitchDaten(JSON.stringify(data))).toThrow("'timestampMs' muss eine endliche Zahl sein");
    });

    it("throws when f0Hz is not a number", () => {
      const data = [{ timestampMs: 0, f0Hz: "440", midiValue: 69, isVoiced: true, confidence: 0.9 }];
      expect(() => deserializePitchDaten(JSON.stringify(data))).toThrow("'f0Hz' muss eine endliche Zahl sein");
    });

    it("throws when midiValue is Infinity", () => {
      const data = [{ timestampMs: 0, f0Hz: 440, midiValue: Infinity, isVoiced: true, confidence: 0.9 }];
      expect(() => deserializePitchDaten(JSON.stringify(data))).toThrow("'midiValue' muss eine endliche Zahl sein");
    });

    it("throws when isVoiced is not a boolean", () => {
      const data = [{ timestampMs: 0, f0Hz: 440, midiValue: 69, isVoiced: "yes", confidence: 0.9 }];
      expect(() => deserializePitchDaten(JSON.stringify(data))).toThrow("'isVoiced' muss ein Boolean sein");
    });

    it("throws when confidence is missing", () => {
      const data = [{ timestampMs: 0, f0Hz: 440, midiValue: 69, isVoiced: true }];
      expect(() => deserializePitchDaten(JSON.stringify(data))).toThrow("'confidence' muss eine endliche Zahl sein");
    });

    it("includes frame index in error message", () => {
      const data = [
        { timestampMs: 0, f0Hz: 440, midiValue: 69, isVoiced: true, confidence: 0.9 },
        { timestampMs: 23, f0Hz: 440, midiValue: 69, isVoiced: "bad", confidence: 0.9 },
      ];
      expect(() => deserializePitchDaten(JSON.stringify(data))).toThrow("Frame an Index 1");
    });

    it("round-trips valid data correctly", () => {
      const json = serializePitchDaten(validFrames);
      const result = deserializePitchDaten(json);
      expect(result).toEqual(validFrames);
    });
  });
});
