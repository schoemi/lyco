/**
 * Serialisierung und Deserialisierung von Pitch-Daten (Nutzer-Aufnahme).
 *
 * Anforderungen: 12.1, 12.2
 */

import type { PitchFrame } from "@/types/vocal-trainer";

/**
 * Serialisiert ein PitchFrame-Array zu einem JSON-String.
 */
export function serializePitchDaten(frames: PitchFrame[]): string {
  return JSON.stringify(frames);
}

/**
 * Deserialisiert einen JSON-String zu einem PitchFrame-Array.
 * Wirft einen beschreibenden Fehler bei ungültigem JSON oder fehlenden/falschen Feldern.
 */
export function deserializePitchDaten(json: string): PitchFrame[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Ungültiges JSON: Der String konnte nicht geparst werden.");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Ungültige Pitch-Daten: Erwartet wird ein Array.");
  }

  return parsed.map((frame: unknown, index: number) =>
    validatePitchFrame(frame, index)
  );
}

function validatePitchFrame(frame: unknown, index: number): PitchFrame {
  if (typeof frame !== "object" || frame === null || Array.isArray(frame)) {
    throw new Error(`Ungültiger Frame an Index ${index}: Erwartet wird ein Objekt.`);
  }

  const f = frame as Record<string, unknown>;

  if (typeof f.timestampMs !== "number" || !Number.isFinite(f.timestampMs)) {
    throw new Error(`Ungültiger Frame an Index ${index}: 'timestampMs' muss eine endliche Zahl sein.`);
  }
  if (typeof f.f0Hz !== "number" || !Number.isFinite(f.f0Hz)) {
    throw new Error(`Ungültiger Frame an Index ${index}: 'f0Hz' muss eine endliche Zahl sein.`);
  }
  if (typeof f.midiValue !== "number" || !Number.isFinite(f.midiValue)) {
    throw new Error(`Ungültiger Frame an Index ${index}: 'midiValue' muss eine endliche Zahl sein.`);
  }
  if (typeof f.isVoiced !== "boolean") {
    throw new Error(`Ungültiger Frame an Index ${index}: 'isVoiced' muss ein Boolean sein.`);
  }
  if (typeof f.confidence !== "number" || !Number.isFinite(f.confidence)) {
    throw new Error(`Ungültiger Frame an Index ${index}: 'confidence' muss eine endliche Zahl sein.`);
  }

  return {
    timestampMs: f.timestampMs,
    f0Hz: f.f0Hz,
    midiValue: f.midiValue,
    isVoiced: f.isVoiced,
    confidence: f.confidence,
  };
}
