/**
 * Web Worker für die Beat-Erkennung.
 *
 * Empfängt eine BeatDetektorRequest-Nachricht mit bereits gefiltertem Audio-Signal
 * (Bandpass-Filter wird im Main-Thread angewendet) und führt die Pipeline aus:
 * 1. Onset-Detection via Energy-Differenz
 * 2. Autocorrelation-basierte BPM-Schätzung
 * 3. Beat-Positionen aus Onset-Peaks ableiten
 *
 * Sendet Fortschritts-Updates und das Ergebnis via postMessage zurück.
 *
 * Anforderungen: 2.1, 2.2, 2.3, 2.6, 2.7
 */

import {
  berechneBpm,
  berechneKonfidenz,
} from "./beat-algorithmus";

import type {
  BeatDetektorRequest,
  BeatDetektorResponse,
  BeatErgebnisLokal,
} from "../../types/beat-detection";

function sendFortschritt(fortschritt: number): void {
  const msg: BeatDetektorResponse = { type: "FORTSCHRITT", fortschritt };
  self.postMessage(msg);
}

function sendErgebnis(ergebnis: BeatErgebnisLokal): void {
  const msg: BeatDetektorResponse = { type: "ERGEBNIS", ergebnis };
  self.postMessage(msg);
}

function sendFehler(fehler: string): void {
  const msg: BeatDetektorResponse = { type: "FEHLER", fehler };
  self.postMessage(msg);
}

/**
 * Compute short-time energy for each frame.
 * Uses a Hann window to reduce spectral leakage.
 */
function berechneEnergieFrames(
  signal: Float32Array,
  frameSize: number,
  hopSize: number,
): number[] {
  const energien: number[] = [];
  // Pre-compute Hann window
  const window = new Float32Array(frameSize);
  for (let i = 0; i < frameSize; i++) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (frameSize - 1)));
  }

  for (let offset = 0; offset + frameSize <= signal.length; offset += hopSize) {
    let energie = 0;
    for (let i = 0; i < frameSize; i++) {
      const windowed = signal[offset + i] * window[i];
      energie += windowed * windowed;
    }
    energien.push(energie);
  }
  return energien;
}

/**
 * Compute onset detection function from energy frames.
 * Uses half-wave rectified first-order difference.
 */
function berechneOnsetFunktion(energien: number[]): number[] {
  if (energien.length < 2) return [];
  const onset: number[] = [];
  for (let i = 1; i < energien.length; i++) {
    const diff = energien[i] - energien[i - 1];
    onset.push(diff > 0 ? diff : 0);
  }
  return onset;
}

/**
 * Normalize an array to [0, 1] range.
 */
function normalisiere(werte: number[]): number[] {
  if (werte.length === 0) return [];
  const max = Math.max(...werte);
  if (max <= 0) return werte.map(() => 0);
  return werte.map((v) => v / max);
}

/**
 * Autocorrelation-based BPM estimation.
 * Computes autocorrelation of the onset function and finds the dominant
 * periodicity in the BPM range [40, 240].
 */
function berechneBpmAutocorrelation(
  onset: number[],
  sampleRate: number,
  hopSize: number,
): number {
  if (onset.length < 2) return 120;

  const framesPerSecond = sampleRate / hopSize;

  // BPM range [40, 240] → period in frames
  const minLag = Math.floor(framesPerSecond * (60 / 240)); // 240 BPM → shortest period
  const maxLag = Math.ceil(framesPerSecond * (60 / 40));   // 40 BPM → longest period

  const effectiveMaxLag = Math.min(maxLag, onset.length - 1);
  if (minLag >= effectiveMaxLag) return 120;

  // Compute autocorrelation for each lag in the BPM range
  let bestLag = minLag;
  let bestCorr = -Infinity;

  for (let lag = minLag; lag <= effectiveMaxLag; lag++) {
    let corr = 0;
    let count = 0;
    for (let i = 0; i < onset.length - lag; i++) {
      corr += onset[i] * onset[i + lag];
      count++;
    }
    if (count > 0) {
      corr /= count;
    }

    // Slight preference for shorter periods (higher BPM) to avoid half-tempo detection
    // by weighting with a gentle decay
    const weight = 1.0 - 0.0001 * (lag - minLag);
    corr *= weight;

    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }

  // Convert lag in frames to BPM
  const periodSeconds = bestLag / framesPerSecond;
  const bpm = 60 / periodSeconds;

  return Math.min(240, Math.max(40, Math.round(bpm)));
}

/**
 * Find beat positions using adaptive peak picking on the onset function,
 * guided by the estimated BPM.
 */
function findeBeatPositionen(
  onset: number[],
  bpm: number,
  sampleRate: number,
  hopSize: number,
): number[] {
  if (onset.length === 0) return [];

  const framesPerSecond = sampleRate / hopSize;
  const expectedPeriodFrames = framesPerSecond * (60 / bpm);

  // Normalize onset function
  const normOnset = normalisiere(onset);

  // Adaptive peak picking: find peaks near expected beat positions
  const beats: number[] = [];
  const searchRadius = Math.round(expectedPeriodFrames * 0.25); // ±25% tolerance

  // Find the first strong onset as starting point
  let startFrame = 0;
  let maxVal = 0;
  const searchEnd = Math.min(Math.round(expectedPeriodFrames), normOnset.length);
  for (let i = 0; i < searchEnd; i++) {
    if (normOnset[i] > maxVal) {
      maxVal = normOnset[i];
      startFrame = i;
    }
  }

  beats.push(startFrame);

  // Track forward from the first beat
  let expectedNext = startFrame + expectedPeriodFrames;
  while (expectedNext < normOnset.length) {
    const searchStart = Math.max(0, Math.round(expectedNext - searchRadius));
    const searchEndIdx = Math.min(normOnset.length - 1, Math.round(expectedNext + searchRadius));

    let bestFrame = Math.round(expectedNext);
    let bestVal = -1;

    for (let i = searchStart; i <= searchEndIdx; i++) {
      if (normOnset[i] > bestVal) {
        bestVal = normOnset[i];
        bestFrame = i;
      }
    }

    beats.push(bestFrame);
    // Use actual beat position to predict next (reduces drift)
    expectedNext = bestFrame + expectedPeriodFrames;
  }

  // Convert frame indices to milliseconds
  // Note: onset function is offset by 1 frame from energy (due to differencing)
  return beats.map((frame) =>
    Math.round(((frame + 1) * hopSize / sampleRate) * 1000),
  );
}

self.onmessage = async (event: MessageEvent<BeatDetektorRequest>) => {
  const request = event.data;

  if (request.type !== "ANALYSE") {
    sendFehler(`Unbekannter Request-Typ: ${(request as any).type}`);
    return;
  }

  try {
    const { audioBuffer, sampleRate } = request;

    // 1. Start
    sendFortschritt(10);

    // 2. Compute energy frames with Hann windowing
    const frameSize = 1024;
    const hopSize = 512;
    const energien = berechneEnergieFrames(audioBuffer, frameSize, hopSize);
    sendFortschritt(30);

    // 3. Onset detection (half-wave rectified energy difference)
    const onset = berechneOnsetFunktion(energien);
    sendFortschritt(50);

    // 4. Autocorrelation-based BPM estimation
    const bpm = berechneBpmAutocorrelation(onset, sampleRate, hopSize);
    sendFortschritt(70);

    // 5. Find beat positions guided by estimated BPM
    const beatPositionenMs = findeBeatPositionen(onset, bpm, sampleRate, hopSize);
    sendFortschritt(90);

    // 6. Compute confidence from beat regularity
    const konfidenz = berechneKonfidenz(beatPositionenMs);

    const ergebnis: BeatErgebnisLokal = {
      bpm,
      konfidenz,
      beatPositionenMs,
    };

    sendErgebnis(ergebnis);
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Ein unerwarteter Fehler ist aufgetreten.";
    sendFehler(message);
  }
};
