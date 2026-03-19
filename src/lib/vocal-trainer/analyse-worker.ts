/**
 * Web Worker für die Vocal-Trainer-Analyse-Pipeline.
 *
 * Empfängt eine WorkerRequest-Nachricht und führt die Pipeline aus:
 * 1. Latenz-Kompensation
 * 2. Pitch-Extraktion (YIN)
 * 3. DTW-Alignment
 * 4. Score-Berechnung
 *
 * Sendet Fortschritts-Updates und das Ergebnis via postMessage zurück.
 *
 * Anforderungen: 7.8, 8.1, 8.3, 8.4, 8.5
 */

import { kompensiere } from "./latenz";
import { extrahierePitch } from "./pitch-extraktor";
import { dtw } from "./dtw";
import {
  berechnePitchScore,
  berechneTimingScore,
  berechneGesamtScore,
} from "./scoring";
import { centsDiff, midiToHz } from "./frequenz-utils";

import type {
  WorkerRequest,
  WorkerResponse,
  ReferenzDaten,
  AnalyseErgebnis,
  PitchFrame,
} from "../../types/vocal-trainer";

function sendFortschritt(fortschritt: number): void {
  const msg: WorkerResponse = { type: "FORTSCHRITT", fortschritt };
  self.postMessage(msg);
}

function sendErgebnis(ergebnis: AnalyseErgebnis): void {
  const msg: WorkerResponse = { type: "ERGEBNIS", ergebnis };
  self.postMessage(msg);
}

function sendFehler(fehler: string): void {
  const msg: WorkerResponse = { type: "FEHLER", fehler };
  self.postMessage(msg);
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  if (request.type !== "ANALYSE") {
    sendFehler(`Unbekannter Request-Typ: ${(request as any).type}`);
    return;
  }

  try {
    const { audioBuffer, sampleRate, referenzDaten, latenzMs } = request;

    // 1. Start
    sendFortschritt(10);

    // 2. Latenz-Kompensation
    const kompensierterBuffer = kompensiere(audioBuffer, latenzMs, sampleRate);
    sendFortschritt(20);

    // 3. Pitch-Extraktion
    const nutzerFrames = extrahierePitch(kompensierterBuffer, sampleRate);
    sendFortschritt(50);

    // 4. DTW-Alignment
    const referenzMidi = referenzDaten.frames
      .filter((f) => f.isVoiced && f.f0Hz > 0)
      .map((f) => f.midiValue);

    const nutzerMidi = nutzerFrames
      .filter((f) => f.isVoiced && f.confidence >= 0.5 && f.f0Hz > 0)
      .map((f) => f.midiValue);

    const dtwResult = dtw(referenzMidi, nutzerMidi);
    sendFortschritt(70);

    // 5. Score-Berechnung
    const referenzOnsets = referenzDaten.frames
      .filter((f) => f.isOnset)
      .map((f) => f.timestampMs);

    const nutzerVoicedFrames = nutzerFrames.filter(
      (f) => f.isVoiced && f.confidence >= 0.5 && f.f0Hz > 0
    );

    // Detect onsets from user frames: first voiced frame and frames after unvoiced gaps
    const nutzerOnsets = detectOnsets(nutzerFrames);

    const pitchScore = berechnePitchScore(nutzerFrames, referenzDaten.frames);
    const timingScore = berechneTimingScore(nutzerOnsets, referenzOnsets);
    const gesamtScore = berechneGesamtScore(pitchScore, timingScore);
    sendFortschritt(90);

    // 6. Build result curves
    const referenzKurve = referenzDaten.frames
      .filter((f) => f.isVoiced && f.f0Hz > 0)
      .map((f) => ({
        timestampMs: f.timestampMs,
        midiValue: f.midiValue,
      }));

    const nutzerKurve = nutzerVoicedFrames.map((f) => {
      // Find closest reference frame by DTW path for cents deviation
      const abweichungCents = berechneAbweichungFuerFrame(
        f,
        referenzDaten,
        dtwResult.path,
        nutzerVoicedFrames,
        referenzDaten.frames.filter((rf) => rf.isVoiced && rf.f0Hz > 0)
      );

      return {
        timestampMs: f.timestampMs,
        midiValue: f.midiValue,
        abweichungCents,
      };
    });

    const ergebnis: AnalyseErgebnis = {
      pitchScore,
      timingScore,
      gesamtScore,
      referenzKurve,
      nutzerKurve,
    };

    sendFortschritt(100);
    sendErgebnis(ergebnis);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unbekannter Fehler bei der Analyse";
    sendFehler(message);
  }
};

/**
 * Detects onset timestamps from user pitch frames.
 * An onset is the first voiced frame, or a voiced frame that follows an unvoiced frame.
 */
function detectOnsets(frames: PitchFrame[]): number[] {
  const onsets: number[] = [];
  let previousVoiced = false;

  for (const frame of frames) {
    const isVoiced = frame.isVoiced && frame.confidence >= 0.5 && frame.f0Hz > 0;
    if (isVoiced && !previousVoiced) {
      onsets.push(frame.timestampMs);
    }
    previousVoiced = isVoiced;
  }

  return onsets;
}

/**
 * Calculates the cents deviation for a user frame using the DTW alignment path.
 */
function berechneAbweichungFuerFrame(
  nutzerFrame: PitchFrame,
  referenzDaten: ReferenzDaten,
  dtwPath: [number, number][],
  nutzerVoiced: PitchFrame[],
  referenzVoiced: { f0Hz: number; midiValue: number }[]
): number {
  // Find the index of this frame in the voiced array
  const nutzerIdx = nutzerVoiced.indexOf(nutzerFrame);
  if (nutzerIdx === -1) return 0;

  // Find the corresponding reference index via DTW path
  for (const [refIdx, userIdx] of dtwPath) {
    if (userIdx === nutzerIdx && refIdx < referenzVoiced.length) {
      const refHz = referenzVoiced[refIdx].f0Hz;
      if (refHz > 0 && nutzerFrame.f0Hz > 0) {
        return centsDiff(nutzerFrame.f0Hz, refHz);
      }
    }
  }

  // Fallback: no DTW match found
  return 0;
}
