/**
 * @vitest-environment jsdom
 */

/**
 * Unit-Tests für Beat-Detektor-Worker Message-Handling
 *
 * Testet: Worker-Instanziierung, Fortschritts-Updates, Fehlerbehandlung,
 * Message-Protokoll (Request/Response-Typen)
 *
 * Der Worker empfängt bereits gefiltertes Audio (Bandpass-Filter wird im
 * Main-Thread angewendet) und führt nur die reine Berechnung durch
 * (FFT, Spectral Flux, Peak-Detection, BPM).
 *
 * Anforderungen: 2.2, 2.3, 2.7
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type {
  BeatDetektorRequest,
  BeatDetektorResponse,
} from "@/types/beat-detection";

// Collect messages posted by the worker
let postedMessages: BeatDetektorResponse[] = [];

// Helper to generate a simple test signal with periodic peaks
function generateTestSignal(length: number): Float32Array {
  const signal = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    // Create a signal with periodic energy bursts every ~22050 samples (0.5s at 44100Hz)
    const period = 22050;
    const pos = i % period;
    if (pos < 512) {
      signal[i] = Math.sin((2 * Math.PI * pos) / 512) * 0.8;
    } else {
      signal[i] = (Math.random() - 0.5) * 0.01;
    }
  }
  return signal;
}

describe("Beat-Detektor-Worker Message-Handling", () => {
  let originalPostMessage: typeof self.postMessage;

  beforeEach(() => {
    postedMessages = [];
    originalPostMessage = self.postMessage;

    // Mock self.postMessage to capture messages
    self.postMessage = vi.fn((msg: BeatDetektorResponse) => {
      postedMessages.push(msg);
    }) as any;
  });

  afterEach(() => {
    self.postMessage = originalPostMessage;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  // --- Requirement 2.2: Worker processes ANALYSE requests ---

  it("sends FORTSCHRITT updates during analysis", async () => {
    const testSignal = generateTestSignal(44100 * 2); // 2 seconds

    await import("@/lib/beat-detection/beat-detektor-worker");

    const request: BeatDetektorRequest = {
      type: "ANALYSE",
      audioBuffer: testSignal,
      sampleRate: 44100,
      frequenzUntergrenze: 60,
      frequenzObergrenze: 200,
    };

    await (self as any).onmessage({ data: request });

    const fortschrittMessages = postedMessages.filter(
      (m) => m.type === "FORTSCHRITT",
    );
    expect(fortschrittMessages.length).toBeGreaterThanOrEqual(3);

    const fortschrittWerte = fortschrittMessages.map((m) => m.fortschritt);
    expect(fortschrittWerte).toContain(10);
    expect(fortschrittWerte).toContain(30);
    expect(fortschrittWerte).toContain(50);
  });

  it("sends ERGEBNIS message with bpm, konfidenz, and beatPositionenMs", async () => {
    const testSignal = generateTestSignal(44100 * 2);

    vi.resetModules();
    await import("@/lib/beat-detection/beat-detektor-worker");

    const request: BeatDetektorRequest = {
      type: "ANALYSE",
      audioBuffer: testSignal,
      sampleRate: 44100,
      frequenzUntergrenze: 60,
      frequenzObergrenze: 200,
    };

    await (self as any).onmessage({ data: request });

    const ergebnisMessages = postedMessages.filter(
      (m) => m.type === "ERGEBNIS",
    );
    expect(ergebnisMessages.length).toBe(1);

    const ergebnis = ergebnisMessages[0].ergebnis;
    expect(ergebnis).toBeDefined();
    expect(typeof ergebnis!.bpm).toBe("number");
    expect(ergebnis!.bpm).toBeGreaterThanOrEqual(40);
    expect(ergebnis!.bpm).toBeLessThanOrEqual(240);
    expect(typeof ergebnis!.konfidenz).toBe("number");
    expect(ergebnis!.konfidenz).toBeGreaterThanOrEqual(0);
    expect(ergebnis!.konfidenz).toBeLessThanOrEqual(100);
    expect(Array.isArray(ergebnis!.beatPositionenMs)).toBe(true);
  });

  // --- Requirement 2.7: Error handling ---

  it("sends FEHLER message for unknown request type", async () => {
    vi.resetModules();
    await import("@/lib/beat-detection/beat-detektor-worker");

    await (self as any).onmessage({
      data: { type: "UNKNOWN_TYPE" },
    });

    const fehlerMessages = postedMessages.filter((m) => m.type === "FEHLER");
    expect(fehlerMessages.length).toBe(1);
    expect(fehlerMessages[0].fehler).toContain("Unbekannter Request-Typ");
  });

  // --- Requirement 2.3: Progress indicator values ---

  it("sends progress values in ascending order", async () => {
    const testSignal = generateTestSignal(44100 * 2);

    vi.resetModules();
    await import("@/lib/beat-detection/beat-detektor-worker");

    const request: BeatDetektorRequest = {
      type: "ANALYSE",
      audioBuffer: testSignal,
      sampleRate: 44100,
      frequenzUntergrenze: 60,
      frequenzObergrenze: 200,
    };

    await (self as any).onmessage({ data: request });

    const fortschrittWerte = postedMessages
      .filter((m) => m.type === "FORTSCHRITT")
      .map((m) => m.fortschritt!);

    for (let i = 1; i < fortschrittWerte.length; i++) {
      expect(fortschrittWerte[i]).toBeGreaterThanOrEqual(fortschrittWerte[i - 1]);
    }
  });

  it("message sequence ends with ERGEBNIS on successful analysis", async () => {
    const testSignal = generateTestSignal(44100 * 2);

    vi.resetModules();
    await import("@/lib/beat-detection/beat-detektor-worker");

    const request: BeatDetektorRequest = {
      type: "ANALYSE",
      audioBuffer: testSignal,
      sampleRate: 44100,
      frequenzUntergrenze: 60,
      frequenzObergrenze: 200,
    };

    await (self as any).onmessage({ data: request });

    const lastMessage = postedMessages[postedMessages.length - 1];
    expect(lastMessage.type).toBe("ERGEBNIS");
  });

  it("handles empty audio buffer gracefully", async () => {
    const emptySignal = new Float32Array(0);

    vi.resetModules();
    await import("@/lib/beat-detection/beat-detektor-worker");

    const request: BeatDetektorRequest = {
      type: "ANALYSE",
      audioBuffer: emptySignal,
      sampleRate: 44100,
      frequenzUntergrenze: 60,
      frequenzObergrenze: 200,
    };

    await (self as any).onmessage({ data: request });

    const lastMessage = postedMessages[postedMessages.length - 1];
    expect(["ERGEBNIS", "FEHLER"]).toContain(lastMessage.type);
  });
});
