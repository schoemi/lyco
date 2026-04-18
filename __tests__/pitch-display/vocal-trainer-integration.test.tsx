/**
 * @vitest-environment jsdom
 */

/**
 * Unit tests for Vocal Trainer PitchDisplay integration
 *
 * Tests that PitchDisplay renders when zustand === "AUFNAHME" and does not
 * render in BEREIT / ERGEBNIS states. Also verifies TextAnzeige still renders
 * alongside PitchDisplay.
 *
 * Validates: Requirements 5.1, 5.3, 5.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, cleanup } from "@testing-library/react";
import fs from "fs";
import path from "path";

// --- Read component source for structural analysis ---
const COMPONENT_PATH = path.resolve(
  process.cwd(),
  "src/components/vocal-trainer/vocal-trainer-view.tsx",
);
const source = fs.readFileSync(COMPONENT_PATH, "utf-8");

// --- Mock browser APIs required by VocalTrainerView ---

class MockResizeObserver {
  callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    this.callback(
      [
        {
          target,
          contentRect: { width: 800, height: 120 } as DOMRectReadOnly,
          borderBoxSize: [],
          contentBoxSize: [],
          devicePixelContentBoxSize: [],
        } as ResizeObserverEntry,
      ],
      this as unknown as ResizeObserver,
    );
  }
  unobserve() {}
  disconnect() {}
}

// Mock navigator.mediaDevices
const mockGetUserMedia = vi.fn().mockRejectedValue(new Error("not available"));
const mockEnumerateDevices = vi.fn().mockResolvedValue([]);

// Mock Audio constructor
class MockAudio {
  crossOrigin = "";
  currentTime = 0;
  pause = vi.fn();
  play = vi.fn().mockRejectedValue(new Error("not available"));
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
}

// Mock Worker
class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
}

// Mock AudioContext
class MockAudioContext {
  state = "running";
  sampleRate = 44100;
  createMediaStreamSource = vi.fn().mockReturnValue({
    connect: vi.fn(),
    disconnect: vi.fn(),
  });
  createGain = vi.fn().mockReturnValue({
    gain: { value: 1 },
    connect: vi.fn(),
    disconnect: vi.fn(),
  });
  createScriptProcessor = vi.fn().mockReturnValue({
    onaudioprocess: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
  });
  createAnalyser = vi.fn().mockReturnValue({
    fftSize: 256,
    smoothingTimeConstant: 0.8,
    connect: vi.fn(),
    disconnect: vi.fn(),
  });
  close = vi.fn();
  destination = {};
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", MockResizeObserver);
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(performance.now());
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.stubGlobal("Audio", MockAudio);
  vi.stubGlobal("Worker", MockWorker);
  vi.stubGlobal("AudioContext", MockAudioContext);

  // Mock fetch for tag definitions
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ definitions: [] }),
    }),
  );

  // Mock navigator.mediaDevices
  Object.defineProperty(navigator, "mediaDevices", {
    value: {
      getUserMedia: mockGetUserMedia,
      enumerateDevices: mockEnumerateDevices,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// --- Test fixtures ---

import type { SongDetail } from "@/types/song";
import type { ReferenzDaten } from "@/types/vocal-trainer";

const testSong: SongDetail = {
  id: "song-1",
  titel: "Test Song",
  kuenstler: "Test Artist",
  sprache: "de",
  emotionsTags: [],
  coverUrl: null,
  progress: 0,
  sessionCount: 0,
  analyse: null,
  coachTipp: null,
  audioQuellen: [],
  sets: [],
  strophen: [
    {
      id: "strophe-1",
      name: "Strophe 1",
      orderIndex: 0,
      progress: 0,
      notiz: null,
      analyse: null,
      istInstrumental: false,
      zeilen: [
        {
          id: "zeile-1",
          text: "Hello world",
          uebersetzung: null,
          orderIndex: 0,
          istKommentar: false,
          markups: [],
        },
        {
          id: "zeile-2",
          text: "Second line",
          uebersetzung: null,
          orderIndex: 1,
          istKommentar: false,
          markups: [],
        },
      ],
      markups: [],
    },
  ],
};

const testReferenzDaten: ReferenzDaten = {
  songId: "song-1",
  sampleRate: 44100,
  windowSize: 2048,
  frames: [
    { timestampMs: 0, f0Hz: 261.63, midiValue: 60, isVoiced: true, isOnset: true },
    { timestampMs: 50, f0Hz: 261.63, midiValue: 60, isVoiced: true, isOnset: false },
    { timestampMs: 100, f0Hz: 0, midiValue: 0, isVoiced: false, isOnset: false },
    { timestampMs: 150, f0Hz: 329.63, midiValue: 64, isVoiced: true, isOnset: true },
    { timestampMs: 200, f0Hz: 329.63, midiValue: 64, isVoiced: true, isOnset: false },
  ],
};

// ============================================================
// Part 1: Source-code structural analysis (Req 5.1, 5.3, 5.4)
// ============================================================

describe("VocalTrainerView source — PitchDisplay integration structure", () => {
  it("imports PitchDisplay component (Req 5.1)", () => {
    expect(source).toContain(
      'import { PitchDisplay } from "@/components/pitch-display/pitch-display"',
    );
  });

  it("imports aggregiereFramesZuBalken for frame-to-bar conversion (Req 5.2)", () => {
    expect(source).toContain(
      'import { aggregiereFramesZuBalken } from "@/lib/pitch-display/pitch-balken"',
    );
  });

  it("computes pitchBalken via useMemo from referenzDaten.frames (Req 5.2)", () => {
    expect(source).toContain("aggregiereFramesZuBalken(referenzDaten.frames)");
    // Wrapped in useMemo
    expect(source).toMatch(/useMemo\(\s*\(\)\s*=>\s*aggregiereFramesZuBalken/);
  });

  it('renders PitchDisplay only inside the AUFNAHME conditional block (Req 5.1, 5.3)', () => {
    // PitchDisplay is rendered inside the zustand === "AUFNAHME" block
    expect(source).toContain('zustand === "AUFNAHME"');
    expect(source).toContain("<PitchDisplay");

    // Verify PitchDisplay is NOT rendered in the BEREIT block
    // The BEREIT block is between {zustand === "BEREIT" && ( and the closing )}
    const bereitMatch = source.match(
      /\{zustand === "BEREIT" && \(([\s\S]*?)\n        \)\}/,
    );
    expect(bereitMatch).not.toBeNull();
    const bereitBlock = bereitMatch![1];
    expect(bereitBlock).not.toContain("<PitchDisplay");

    // Verify PitchDisplay is NOT rendered in the ERGEBNIS block
    const ergebnisMatch = source.match(
      /\{zustand === "ERGEBNIS" && ergebnis && \(([\s\S]*?)\n        \)\}/,
    );
    expect(ergebnisMatch).not.toBeNull();
    const ergebnisBlock = ergebnisMatch![1];
    expect(ergebnisBlock).not.toContain("<PitchDisplay");
  });

  it("renders TextAnzeige alongside PitchDisplay in AUFNAHME block (Req 5.4)", () => {
    // Find the AUFNAHME block
    const aufnahmeMatch = source.match(
      /\{zustand === "AUFNAHME" && \(([\s\S]*?)\n        \)\}/,
    );
    expect(aufnahmeMatch).not.toBeNull();
    const aufnahmeBlock = aufnahmeMatch![1];

    // Both PitchDisplay and TextAnzeige should be in the AUFNAHME block
    expect(aufnahmeBlock).toContain("<PitchDisplay");
    expect(aufnahmeBlock).toContain("<TextAnzeige");
  });

  it("passes correct props to PitchDisplay (Req 5.1, 5.2)", () => {
    // PitchDisplay should receive balken, currentTimeMs, isPlaying, and height
    expect(source).toContain("balken={pitchBalken}");
    expect(source).toContain("currentTimeMs={currentTimeMs}");
    expect(source).toContain('isPlaying={zustand === "AUFNAHME"}');
  });

  it("tracks currentTimeMs state for PitchDisplay synchronization (Req 5.1)", () => {
    expect(source).toContain("setCurrentTimeMs");
    expect(source).toContain("currentTimeMs");
  });

  it('does not render PitchDisplay in ANALYSE state (Req 5.3)', () => {
    const analyseMatch = source.match(
      /\{zustand === "ANALYSE" && \(([\s\S]*?)\n        \)\}/,
    );
    expect(analyseMatch).not.toBeNull();
    const analyseBlock = analyseMatch![1];
    expect(analyseBlock).not.toContain("<PitchDisplay");
  });
});

// ============================================================
// Part 2: Render tests — BEREIT state (initial, no PitchDisplay)
// ============================================================

describe("VocalTrainerView render — BEREIT state (Req 5.3)", () => {
  // Lazy import to avoid module-level side effects before mocks are set up
  let VocalTrainerView: typeof import("@/components/vocal-trainer/vocal-trainer-view").VocalTrainerView;

  beforeEach(async () => {
    const mod = await import(
      "@/components/vocal-trainer/vocal-trainer-view"
    );
    VocalTrainerView = mod.VocalTrainerView;
  });

  it("does not render PitchDisplay SVG in initial BEREIT state", () => {
    const { container } = render(
      React.createElement(VocalTrainerView, {
        song: testSong,
        instrumentalUrl: "/test-instrumental.mp3",
        referenzDaten: testReferenzDaten,
        onZurueck: vi.fn(),
      }),
    );

    // In BEREIT state, there should be no SVG with role="img" (PitchDisplay)
    const pitchSvg = container.querySelector('svg[role="img"]');
    expect(pitchSvg).toBeNull();
  });

  it("shows Vocal Trainer heading in BEREIT state", () => {
    const { container } = render(
      React.createElement(VocalTrainerView, {
        song: testSong,
        instrumentalUrl: "/test-instrumental.mp3",
        referenzDaten: testReferenzDaten,
        onZurueck: vi.fn(),
      }),
    );

    // The BEREIT state shows "Vocal Trainer" heading
    const heading = container.querySelector("h1");
    expect(heading).not.toBeNull();
    expect(heading!.textContent).toContain("Vocal Trainer");
  });

  it("announces BEREIT state via aria-live region", () => {
    const { container } = render(
      React.createElement(VocalTrainerView, {
        song: testSong,
        instrumentalUrl: "/test-instrumental.mp3",
        referenzDaten: testReferenzDaten,
        onZurueck: vi.fn(),
      }),
    );

    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).not.toBeNull();
    expect(liveRegion!.textContent).toContain("Bereit");
  });
});
