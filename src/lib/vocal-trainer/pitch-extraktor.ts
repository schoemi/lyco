import type { PitchFrame } from "@/types/vocal-trainer";
import { hzToMidi } from "@/lib/vocal-trainer/frequenz-utils";

/** Configuration for pitch extraction */
export interface PitchExtraktorConfig {
  /** Window size in milliseconds (20–40 ms) */
  windowMs: number;
  /** Hop size as fraction of window (0 < hop ≤ 1) */
  hopFactor: number;
  /** RMS threshold for noise gate */
  noiseGateThreshold: number;
  /** YIN threshold for d' minimum */
  yinThreshold: number;
  /** Minimum confidence to mark as voiced */
  minConfidence: number;
  /** Minimum detectable frequency in Hz */
  minFreqHz: number;
  /** Maximum detectable frequency in Hz */
  maxFreqHz: number;
}

const DEFAULT_CONFIG: PitchExtraktorConfig = {
  windowMs: 30,
  hopFactor: 0.5,
  noiseGateThreshold: 0.01,
  yinThreshold: 0.1,
  minConfidence: 0.5,
  minFreqHz: 50,
  maxFreqHz: 1000,
};

/**
 * Compute the RMS (root mean square) of a signal window.
 */
function computeRms(buffer: Float32Array, start: number, length: number): number {
  let sum = 0;
  const end = Math.min(start + length, buffer.length);
  const n = end - start;
  if (n <= 0) return 0;
  for (let i = start; i < end; i++) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / n);
}

/**
 * YIN difference function: d(τ) = Σ (x[j] - x[j+τ])²
 */
function yinDifference(buffer: Float32Array, start: number, windowSize: number): Float32Array {
  const halfWindow = Math.floor(windowSize / 2);
  const d = new Float32Array(halfWindow);
  d[0] = 0;

  for (let tau = 1; tau < halfWindow; tau++) {
    let sum = 0;
    for (let j = 0; j < halfWindow; j++) {
      const delta = buffer[start + j] - buffer[start + j + tau];
      sum += delta * delta;
    }
    d[tau] = sum;
  }
  return d;
}

/**
 * Cumulative mean normalized difference function d'(τ).
 * d'(0) = 1, d'(τ) = d(τ) / ((1/τ) * Σ d(j) for j=1..τ)
 */
function yinCumulativeMeanNormalized(d: Float32Array): Float32Array {
  const dPrime = new Float32Array(d.length);
  dPrime[0] = 1;

  let runningSum = 0;
  for (let tau = 1; tau < d.length; tau++) {
    runningSum += d[tau];
    dPrime[tau] = runningSum === 0 ? 1 : d[tau] / (runningSum / tau);
  }
  return dPrime;
}

/**
 * Find the first tau where d'(tau) dips below the threshold,
 * then pick the local minimum after that dip.
 * Returns -1 if no valid tau found.
 */
function yinAbsoluteThreshold(
  dPrime: Float32Array,
  threshold: number,
  minTau: number,
  maxTau: number,
): number {
  const searchStart = Math.max(2, minTau);
  const searchEnd = Math.min(dPrime.length, maxTau);

  // Find first tau below threshold
  let tau = searchStart;
  while (tau < searchEnd) {
    if (dPrime[tau] < threshold) {
      // Walk to the local minimum
      while (tau + 1 < searchEnd && dPrime[tau + 1] < dPrime[tau]) {
        tau++;
      }
      return tau;
    }
    tau++;
  }
  return -1;
}

/**
 * Parabolic interpolation around the estimated tau for sub-sample accuracy.
 */
function parabolicInterpolation(dPrime: Float32Array, tau: number): number {
  if (tau <= 0 || tau >= dPrime.length - 1) return tau;

  const s0 = dPrime[tau - 1];
  const s1 = dPrime[tau];
  const s2 = dPrime[tau + 1];

  const denominator = 2 * s1 - s2 - s0;
  if (denominator === 0) return tau;

  const adjustment = (s2 - s0) / (2 * denominator);
  return tau + adjustment;
}

/**
 * Extract pitch (F0) from a Float32Array audio buffer using the YIN algorithm.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 15.1, 15.2
 *
 * @param audioBuffer - Mono audio samples as Float32Array
 * @param sampleRate - Sample rate in Hz (e.g. 44100)
 * @param config - Optional configuration overrides
 * @returns Array of PitchFrame objects
 */
export function extrahierePitch(
  audioBuffer: Float32Array,
  sampleRate: number,
  config?: Partial<PitchExtraktorConfig>,
): PitchFrame[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Validate window size is in 20–40 ms range
  const windowMs = Math.max(20, Math.min(40, cfg.windowMs));
  const windowSize = Math.round((windowMs / 1000) * sampleRate);
  const hopSize = Math.max(1, Math.round(windowSize * cfg.hopFactor));

  // Tau range from frequency limits: tau = sampleRate / freq
  const minTau = Math.max(2, Math.floor(sampleRate / cfg.maxFreqHz));
  const maxTau = Math.min(Math.floor(windowSize / 2), Math.ceil(sampleRate / cfg.minFreqHz));

  const frames: PitchFrame[] = [];

  for (let start = 0; start + windowSize <= audioBuffer.length; start += hopSize) {
    const timestampMs = (start / sampleRate) * 1000;

    // Noise gate: check RMS
    const rms = computeRms(audioBuffer, start, windowSize);
    if (rms < cfg.noiseGateThreshold) {
      frames.push({
        timestampMs,
        f0Hz: 0,
        midiValue: 0,
        isVoiced: false,
        confidence: 0,
      });
      continue;
    }

    // YIN algorithm
    const d = yinDifference(audioBuffer, start, windowSize);
    const dPrime = yinCumulativeMeanNormalized(d);
    const tau = yinAbsoluteThreshold(dPrime, cfg.yinThreshold, minTau, maxTau);

    if (tau === -1) {
      // No valid pitch found → unvoiced
      frames.push({
        timestampMs,
        f0Hz: 0,
        midiValue: 0,
        isVoiced: false,
        confidence: 0,
      });
      continue;
    }

    // Confidence: 1 - d'(tau)
    const confidence = 1 - dPrime[tau];

    // Parabolic interpolation for sub-sample accuracy
    const refinedTau = parabolicInterpolation(dPrime, tau);
    const f0Hz = sampleRate / refinedTau;

    // Frequency range check (50–1000 Hz)
    if (f0Hz < cfg.minFreqHz || f0Hz > cfg.maxFreqHz) {
      frames.push({
        timestampMs,
        f0Hz: 0,
        midiValue: 0,
        isVoiced: false,
        confidence,
      });
      continue;
    }

    // Confidence threshold check
    if (confidence < cfg.minConfidence) {
      frames.push({
        timestampMs,
        f0Hz: 0,
        midiValue: 0,
        isVoiced: false,
        confidence,
      });
      continue;
    }

    // Voiced frame
    frames.push({
      timestampMs,
      f0Hz,
      midiValue: hzToMidi(f0Hz),
      isVoiced: true,
      confidence,
    });
  }

  return frames;
}
