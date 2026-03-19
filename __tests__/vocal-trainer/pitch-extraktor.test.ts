import { describe, it, expect } from "vitest";
import { extrahierePitch } from "@/lib/vocal-trainer/pitch-extraktor";

/**
 * Generate a sine wave at a given frequency.
 */
function generateSine(
  freq: number,
  sampleRate: number,
  durationMs: number,
  amplitude = 0.5,
): Float32Array {
  const numSamples = Math.round((durationMs / 1000) * sampleRate);
  const buffer = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    buffer[i] = amplitude * Math.sin(2 * Math.PI * freq * (i / sampleRate));
  }
  return buffer;
}

/**
 * Generate silence (all zeros).
 */
function generateSilence(sampleRate: number, durationMs: number): Float32Array {
  return new Float32Array(Math.round((durationMs / 1000) * sampleRate));
}

describe("extrahierePitch", () => {
  const sampleRate = 44100;

  it("should return empty array for empty buffer", () => {
    const result = extrahierePitch(new Float32Array(0), sampleRate);
    expect(result).toEqual([]);
  });

  it("should mark silence frames as unvoiced via noise gate", () => {
    const silence = generateSilence(sampleRate, 100);
    const frames = extrahierePitch(silence, sampleRate);
    expect(frames.length).toBeGreaterThan(0);
    for (const frame of frames) {
      expect(frame.isVoiced).toBe(false);
      expect(frame.f0Hz).toBe(0);
    }
  });

  it("should detect a 440 Hz sine wave (A4)", () => {
    const sine = generateSine(440, sampleRate, 200);
    const frames = extrahierePitch(sine, sampleRate);
    const voicedFrames = frames.filter((f) => f.isVoiced);
    expect(voicedFrames.length).toBeGreaterThan(0);

    for (const frame of voicedFrames) {
      // Allow ±5 Hz tolerance for YIN on a clean sine
      expect(frame.f0Hz).toBeGreaterThan(430);
      expect(frame.f0Hz).toBeLessThan(450);
      // MIDI value for A4 is 69
      expect(frame.midiValue).toBeGreaterThan(68);
      expect(frame.midiValue).toBeLessThan(70);
      expect(frame.confidence).toBeGreaterThanOrEqual(0.5);
    }
  });

  it("should detect a 220 Hz sine wave (A3)", () => {
    const sine = generateSine(220, sampleRate, 200);
    const frames = extrahierePitch(sine, sampleRate);
    const voicedFrames = frames.filter((f) => f.isVoiced);
    expect(voicedFrames.length).toBeGreaterThan(0);

    for (const frame of voicedFrames) {
      expect(frame.f0Hz).toBeGreaterThan(210);
      expect(frame.f0Hz).toBeLessThan(230);
    }
  });

  it("should return frames with increasing timestamps", () => {
    const sine = generateSine(440, sampleRate, 200);
    const frames = extrahierePitch(sine, sampleRate);
    for (let i = 1; i < frames.length; i++) {
      expect(frames[i].timestampMs).toBeGreaterThan(frames[i - 1].timestampMs);
    }
  });

  it("should mark very low amplitude signals as unvoiced (noise gate)", () => {
    const quietSine = generateSine(440, sampleRate, 200, 0.001);
    const frames = extrahierePitch(quietSine, sampleRate);
    for (const frame of frames) {
      expect(frame.isVoiced).toBe(false);
    }
  });

  it("should mark frequencies outside 50-1000 Hz as unvoiced", () => {
    // 30 Hz is below the 50 Hz minimum
    const lowSine = generateSine(30, sampleRate, 200);
    const frames = extrahierePitch(lowSine, sampleRate);
    for (const frame of frames) {
      expect(frame.isVoiced).toBe(false);
    }
  });

  it("should respect custom window size configuration", () => {
    const sine = generateSine(440, sampleRate, 200);
    const frames20ms = extrahierePitch(sine, sampleRate, { windowMs: 20 });
    const frames40ms = extrahierePitch(sine, sampleRate, { windowMs: 40 });
    // Smaller window → more frames
    expect(frames20ms.length).toBeGreaterThan(frames40ms.length);
  });

  it("should clamp window size to 20-40 ms range", () => {
    const sine = generateSine(440, sampleRate, 200);
    // windowMs: 10 should be clamped to 20
    const framesClamped = extrahierePitch(sine, sampleRate, { windowMs: 10 });
    const frames20 = extrahierePitch(sine, sampleRate, { windowMs: 20 });
    expect(framesClamped.length).toBe(frames20.length);
  });

  it("should have confidence values between 0 and 1", () => {
    const sine = generateSine(440, sampleRate, 200);
    const frames = extrahierePitch(sine, sampleRate);
    for (const frame of frames) {
      expect(frame.confidence).toBeGreaterThanOrEqual(0);
      expect(frame.confidence).toBeLessThanOrEqual(1);
    }
  });

  it("should produce PitchFrame objects with all required fields", () => {
    const sine = generateSine(440, sampleRate, 100);
    const frames = extrahierePitch(sine, sampleRate);
    expect(frames.length).toBeGreaterThan(0);
    for (const frame of frames) {
      expect(frame).toHaveProperty("timestampMs");
      expect(frame).toHaveProperty("f0Hz");
      expect(frame).toHaveProperty("midiValue");
      expect(frame).toHaveProperty("isVoiced");
      expect(frame).toHaveProperty("confidence");
      expect(typeof frame.timestampMs).toBe("number");
      expect(typeof frame.f0Hz).toBe("number");
      expect(typeof frame.midiValue).toBe("number");
      expect(typeof frame.isVoiced).toBe("boolean");
      expect(typeof frame.confidence).toBe("number");
    }
  });
});
