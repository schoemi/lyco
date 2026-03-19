import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for the analyse-worker pipeline.
 *
 * Since the worker uses `self.onmessage` and `self.postMessage`,
 * we mock the global `self` to simulate the worker environment,
 * then import the worker module to register the handler.
 */

// Collect messages posted by the worker
const postedMessages: any[] = [];

// Create a mock self object that mimics the Worker global scope
const mockSelf: any = {
  postMessage: (msg: any) => {
    postedMessages.push(msg);
  },
  onmessage: null,
};

// Stub self globally before importing the worker
vi.stubGlobal("self", mockSelf);
vi.stubGlobal("postMessage", mockSelf.postMessage);

// Import after mocking
import type { WorkerRequest, WorkerResponse, ReferenzDaten } from "@/types/vocal-trainer";

describe("analyse-worker", () => {
  let onmessageHandler: ((event: MessageEvent) => void) | null = null;

  beforeEach(async () => {
    postedMessages.length = 0;
    mockSelf.onmessage = null;

    // Reset module cache so the worker re-registers its handler
    vi.resetModules();

    // Re-stub after resetModules
    vi.stubGlobal("self", mockSelf);
    vi.stubGlobal("postMessage", mockSelf.postMessage);

    await import("@/lib/vocal-trainer/analyse-worker");
    onmessageHandler = mockSelf.onmessage;
  });

  function createReferenzDaten(frameCount: number): ReferenzDaten {
    const frames = [];
    for (let i = 0; i < frameCount; i++) {
      frames.push({
        timestampMs: i * 23, // ~43 fps
        f0Hz: 220 + Math.sin(i * 0.1) * 20, // A3 with slight vibrato
        midiValue: 57 + Math.sin(i * 0.1) * 0.5,
        isVoiced: true,
        isOnset: i % 20 === 0, // onset every ~460ms
      });
    }
    return {
      songId: "test-song",
      sampleRate: 44100,
      windowSize: 1024,
      frames,
    };
  }

  function createSineBuffer(
    sampleRate: number,
    durationMs: number,
    freqHz: number
  ): Float32Array {
    const numSamples = Math.round((durationMs / 1000) * sampleRate);
    const buffer = new Float32Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      // Amplitude of 0.5 to be well above noise gate
      buffer[i] = 0.5 * Math.sin((2 * Math.PI * freqHz * i) / sampleRate);
    }
    return buffer;
  }

  it("sends FEHLER for unknown request type", () => {
    if (!onmessageHandler) throw new Error("Handler not registered");

    onmessageHandler(
      new MessageEvent("message", {
        data: { type: "UNKNOWN" },
      })
    );

    expect(postedMessages.length).toBeGreaterThanOrEqual(1);
    const fehler = postedMessages.find((m) => m.type === "FEHLER");
    expect(fehler).toBeDefined();
    expect(fehler.fehler).toContain("Unbekannter Request-Typ");
  });

  it("sends progress updates in correct order", () => {
    if (!onmessageHandler) throw new Error("Handler not registered");

    const sampleRate = 44100;
    const durationMs = 500; // short clip for speed
    const audioBuffer = createSineBuffer(sampleRate, durationMs, 220);
    const referenzDaten = createReferenzDaten(20);

    const request: WorkerRequest = {
      type: "ANALYSE",
      audioBuffer,
      sampleRate,
      referenzDaten,
      latenzMs: 0,
    };

    onmessageHandler(
      new MessageEvent("message", { data: request })
    );

    const fortschrittMessages = postedMessages.filter(
      (m) => m.type === "FORTSCHRITT"
    );
    const fortschrittValues = fortschrittMessages.map(
      (m: WorkerResponse) => m.fortschritt
    );

    // Should have progress updates at 10, 20, 50, 70, 90, 100
    expect(fortschrittValues).toEqual([10, 20, 50, 70, 90, 100]);
  });

  it("sends ERGEBNIS with valid scores", () => {
    if (!onmessageHandler) throw new Error("Handler not registered");

    const sampleRate = 44100;
    const durationMs = 500;
    const audioBuffer = createSineBuffer(sampleRate, durationMs, 220);
    const referenzDaten = createReferenzDaten(20);

    const request: WorkerRequest = {
      type: "ANALYSE",
      audioBuffer,
      sampleRate,
      referenzDaten,
      latenzMs: 0,
    };

    onmessageHandler(
      new MessageEvent("message", { data: request })
    );

    const ergebnis = postedMessages.find((m) => m.type === "ERGEBNIS");
    expect(ergebnis).toBeDefined();
    expect(ergebnis.ergebnis).toBeDefined();

    const result = ergebnis.ergebnis;
    expect(result.pitchScore).toBeGreaterThanOrEqual(0);
    expect(result.pitchScore).toBeLessThanOrEqual(100);
    expect(result.timingScore).toBeGreaterThanOrEqual(0);
    expect(result.timingScore).toBeLessThanOrEqual(100);
    expect(result.gesamtScore).toBeGreaterThanOrEqual(0);
    expect(result.gesamtScore).toBeLessThanOrEqual(100);
    expect(Array.isArray(result.referenzKurve)).toBe(true);
    expect(Array.isArray(result.nutzerKurve)).toBe(true);
  });

  it("sends ERGEBNIS with nutzerKurve containing abweichungCents", () => {
    if (!onmessageHandler) throw new Error("Handler not registered");

    const sampleRate = 44100;
    const durationMs = 500;
    const audioBuffer = createSineBuffer(sampleRate, durationMs, 220);
    const referenzDaten = createReferenzDaten(20);

    const request: WorkerRequest = {
      type: "ANALYSE",
      audioBuffer,
      sampleRate,
      referenzDaten,
      latenzMs: 0,
    };

    onmessageHandler(
      new MessageEvent("message", { data: request })
    );

    const ergebnis = postedMessages.find((m) => m.type === "ERGEBNIS");
    expect(ergebnis).toBeDefined();

    // Each nutzerKurve entry should have abweichungCents
    for (const punkt of ergebnis.ergebnis.nutzerKurve) {
      expect(punkt).toHaveProperty("timestampMs");
      expect(punkt).toHaveProperty("midiValue");
      expect(punkt).toHaveProperty("abweichungCents");
      expect(typeof punkt.abweichungCents).toBe("number");
    }
  });

  it("handles latency compensation", () => {
    if (!onmessageHandler) throw new Error("Handler not registered");

    const sampleRate = 44100;
    const durationMs = 500;
    const audioBuffer = createSineBuffer(sampleRate, durationMs, 220);
    const referenzDaten = createReferenzDaten(20);

    const request: WorkerRequest = {
      type: "ANALYSE",
      audioBuffer,
      sampleRate,
      referenzDaten,
      latenzMs: 50, // 50ms latency
    };

    onmessageHandler(
      new MessageEvent("message", { data: request })
    );

    const ergebnis = postedMessages.find((m) => m.type === "ERGEBNIS");
    expect(ergebnis).toBeDefined();
    // Should still produce a valid result even with latency compensation
    expect(ergebnis.ergebnis.gesamtScore).toBeGreaterThanOrEqual(0);
  });

  it("sends FEHLER when an exception occurs", () => {
    if (!onmessageHandler) throw new Error("Handler not registered");

    // Pass null audioBuffer to trigger an error
    const request = {
      type: "ANALYSE",
      audioBuffer: null as any,
      sampleRate: 44100,
      referenzDaten: createReferenzDaten(5),
      latenzMs: 0,
    };

    onmessageHandler(
      new MessageEvent("message", { data: request })
    );

    const fehler = postedMessages.find((m) => m.type === "FEHLER");
    expect(fehler).toBeDefined();
    expect(typeof fehler.fehler).toBe("string");
  });
});
