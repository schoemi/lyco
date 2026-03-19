/**
 * Unit-Tests für Referenz-Daten Serialisierung/Deserialisierung
 *
 * Anforderungen: 11.1, 11.2, 11.3
 */

import { describe, it, expect } from "vitest";
import {
  serializeReferenzDaten,
  deserializeReferenzDaten,
} from "@/lib/vocal-trainer/referenz-daten";
import type { ReferenzDaten } from "@/types/vocal-trainer";

const validData: ReferenzDaten = {
  songId: "clxyz123",
  sampleRate: 44100,
  windowSize: 1024,
  frames: [
    { timestampMs: 0, f0Hz: 440.0, midiValue: 69.0, isVoiced: true, isOnset: true },
    { timestampMs: 23, f0Hz: 0, midiValue: 0, isVoiced: false, isOnset: false },
  ],
};

describe("referenz-daten", () => {
  describe("serializeReferenzDaten", () => {
    it("serializes valid data to a JSON string", () => {
      const json = serializeReferenzDaten(validData);
      expect(typeof json).toBe("string");
      expect(JSON.parse(json)).toEqual(validData);
    });

    it("serializes empty frames array", () => {
      const data: ReferenzDaten = { songId: "s1", sampleRate: 48000, windowSize: 512, frames: [] };
      const json = serializeReferenzDaten(data);
      expect(JSON.parse(json).frames).toEqual([]);
    });
  });

  describe("deserializeReferenzDaten", () => {
    it("deserializes valid JSON to a ReferenzDaten object", () => {
      const json = JSON.stringify(validData);
      const result = deserializeReferenzDaten(json);
      expect(result).toEqual(validData);
    });

    it("throws on invalid JSON syntax", () => {
      expect(() => deserializeReferenzDaten("{not valid json")).toThrow("Ungültiges JSON");
    });

    it("throws when root is not an object", () => {
      expect(() => deserializeReferenzDaten('"just a string"')).toThrow("Erwartet wird ein Objekt");
    });

    it("throws when root is an array", () => {
      expect(() => deserializeReferenzDaten("[]")).toThrow("Erwartet wird ein Objekt");
    });

    it("throws when root is null", () => {
      expect(() => deserializeReferenzDaten("null")).toThrow("Erwartet wird ein Objekt");
    });

    it("throws when songId is missing", () => {
      const data = { sampleRate: 44100, windowSize: 1024, frames: [] };
      expect(() => deserializeReferenzDaten(JSON.stringify(data))).toThrow("'songId' muss ein String sein");
    });

    it("throws when sampleRate is not a number", () => {
      const data = { songId: "s1", sampleRate: "44100", windowSize: 1024, frames: [] };
      expect(() => deserializeReferenzDaten(JSON.stringify(data))).toThrow("'sampleRate' muss eine endliche Zahl sein");
    });

    it("throws when windowSize is missing", () => {
      const data = { songId: "s1", sampleRate: 44100, frames: [] };
      expect(() => deserializeReferenzDaten(JSON.stringify(data))).toThrow("'windowSize' muss eine endliche Zahl sein");
    });

    it("throws when frames is not an array", () => {
      const data = { songId: "s1", sampleRate: 44100, windowSize: 1024, frames: "not-array" };
      expect(() => deserializeReferenzDaten(JSON.stringify(data))).toThrow("'frames' muss ein Array sein");
    });

    it("throws when a frame is missing timestampMs", () => {
      const data = {
        songId: "s1", sampleRate: 44100, windowSize: 1024,
        frames: [{ f0Hz: 440, midiValue: 69, isVoiced: true, isOnset: false }],
      };
      expect(() => deserializeReferenzDaten(JSON.stringify(data))).toThrow("Frame an Index 0");
    });

    it("throws when a frame has wrong boolean type", () => {
      const data = {
        songId: "s1", sampleRate: 44100, windowSize: 1024,
        frames: [{ timestampMs: 0, f0Hz: 440, midiValue: 69, isVoiced: "yes", isOnset: false }],
      };
      expect(() => deserializeReferenzDaten(JSON.stringify(data))).toThrow("'isVoiced' muss ein Boolean sein");
    });

    it("round-trips valid data correctly", () => {
      const json = serializeReferenzDaten(validData);
      const result = deserializeReferenzDaten(json);
      expect(result).toEqual(validData);
    });
  });
});
