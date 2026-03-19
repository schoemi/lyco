/**
 * Serialisierung und Deserialisierung von Referenz-Daten (Vocal Stem JSON).
 *
 * Anforderungen: 11.1, 11.2, 11.3
 */

import type { ReferenzDaten, ReferenzFrame } from "@/types/vocal-trainer";

/**
 * Serialisiert ein ReferenzDaten-Objekt zu einem JSON-String.
 */
export function serializeReferenzDaten(data: ReferenzDaten): string {
  return JSON.stringify(data);
}

/**
 * Deserialisiert einen JSON-String zu einem ReferenzDaten-Objekt.
 * Wirft einen beschreibenden Fehler bei ungültigem JSON oder fehlenden/falschen Feldern.
 */
export function deserializeReferenzDaten(json: string): ReferenzDaten {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Ungültiges JSON: Der String konnte nicht geparst werden.");
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Ungültige Referenz-Daten: Erwartet wird ein Objekt.");
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj.songId !== "string") {
    throw new Error("Ungültige Referenz-Daten: 'songId' muss ein String sein.");
  }
  if (typeof obj.sampleRate !== "number" || !Number.isFinite(obj.sampleRate)) {
    throw new Error("Ungültige Referenz-Daten: 'sampleRate' muss eine endliche Zahl sein.");
  }
  if (typeof obj.windowSize !== "number" || !Number.isFinite(obj.windowSize)) {
    throw new Error("Ungültige Referenz-Daten: 'windowSize' muss eine endliche Zahl sein.");
  }
  if (!Array.isArray(obj.frames)) {
    throw new Error("Ungültige Referenz-Daten: 'frames' muss ein Array sein.");
  }

  const frames = obj.frames.map((frame: unknown, index: number) =>
    validateReferenzFrame(frame, index)
  );

  return {
    songId: obj.songId,
    sampleRate: obj.sampleRate,
    windowSize: obj.windowSize,
    frames,
  };
}

function validateReferenzFrame(frame: unknown, index: number): ReferenzFrame {
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
  if (typeof f.isOnset !== "boolean") {
    throw new Error(`Ungültiger Frame an Index ${index}: 'isOnset' muss ein Boolean sein.`);
  }

  return {
    timestampMs: f.timestampMs,
    f0Hz: f.f0Hz,
    midiValue: f.midiValue,
    isVoiced: f.isVoiced,
    isOnset: f.isOnset,
  };
}
