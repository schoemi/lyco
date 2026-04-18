/**
 * Unit-Tests für serializePitchBalken und deserializePitchBalken — Edge Cases
 *
 * Testet Serialisierung und Deserialisierung von PitchBalken:
 * - Leeres Array (Round-Trip)
 * - Ungültiger JSON-String
 * - Fehlerhafte JSON-Struktur (kein Array, fehlende Felder, falsche Typen)
 *
 * Requirements: 8.4, 8.5
 */

import { describe, it, expect } from "vitest";
import {
  serializePitchBalken,
  deserializePitchBalken,
  type PitchBalken,
} from "@/lib/pitch-display/pitch-balken";

describe("serializePitchBalken / deserializePitchBalken — Edge Cases", () => {
  // Requirement 8.4: Round-Trip für leeres Array
  it("round-trips an empty array", () => {
    const input: PitchBalken[] = [];
    const serialized = serializePitchBalken(input);
    const deserialized = deserializePitchBalken(serialized);

    expect(deserialized).toEqual([]);
  });

  // Requirement 8.4: serialisiertes leeres Array ist valides JSON
  it("serializes empty array to '[]'", () => {
    const result = serializePitchBalken([]);
    expect(result).toBe("[]");
  });

  // Requirement 8.5: ungültiger JSON-String wirft Fehler
  it("throws on invalid JSON string", () => {
    expect(() => deserializePitchBalken("not json at all")).toThrow(
      /Ungültiges JSON/,
    );
  });

  // Requirement 8.5: leerer String wirft Fehler
  it("throws on empty string", () => {
    expect(() => deserializePitchBalken("")).toThrow(/Ungültiges JSON/);
  });

  // Requirement 8.5: JSON ist kein Array (Objekt statt Array)
  it("throws when JSON is an object instead of an array", () => {
    expect(() =>
      deserializePitchBalken('{"startMs": 0, "endMs": 10}'),
    ).toThrow(/erwartet ein Array/);
  });

  // Requirement 8.5: JSON ist ein primitiver Wert
  it("throws when JSON is a primitive value", () => {
    expect(() => deserializePitchBalken("42")).toThrow(/erwartet ein Array/);
  });

  // Requirement 8.5: Array enthält Nicht-Objekt-Elemente
  it("throws when array contains a non-object element", () => {
    expect(() => deserializePitchBalken("[42]")).toThrow(
      /PitchBalken\[0\] ist kein Objekt/,
    );
  });

  // Requirement 8.5: Array enthält null-Element
  it("throws when array contains null", () => {
    expect(() => deserializePitchBalken("[null]")).toThrow(
      /PitchBalken\[0\] ist kein Objekt/,
    );
  });

  // Requirement 8.5: Objekt mit fehlenden Feldern
  it("throws when object is missing required fields", () => {
    const malformed = JSON.stringify([{ startMs: 0 }]);
    expect(() => deserializePitchBalken(malformed)).toThrow(
      /endMs muss eine Zahl sein/,
    );
  });

  // Requirement 8.5: Feld hat falschen Typ (String statt Number)
  it("throws when a field has wrong type", () => {
    const malformed = JSON.stringify([
      { startMs: 0, endMs: "ten", midiValue: 60, durationMs: 10 },
    ]);
    expect(() => deserializePitchBalken(malformed)).toThrow(
      /endMs muss eine Zahl sein/,
    );
  });
});
