/**
 * @vitest-environment jsdom
 */

/**
 * Unit tests for Karaoke PitchDisplay integration
 *
 * Tests that PitchDisplay does not render when referenzDaten is undefined,
 * that the toggle button shows/hides the PitchDisplay, and that PitchDisplay
 * receives currentTimeMs from audio time updates.
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, cleanup } from "@testing-library/react";
import fs from "fs";
import path from "path";

// --- Read component source for structural analysis ---
const COMPONENT_PATH = path.resolve(
  process.cwd(),
  "src/components/karaoke/karaoke-view.tsx",
);
const source = fs.readFileSync(COMPONENT_PATH, "utf-8");

// --- Mock browser APIs required by KaraokeView ---

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

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", MockResizeObserver);
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(performance.now());
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// --- Test fixtures ---

import type { SongDetail } from "@/types/song";
import type { FlatLine } from "@/types/karaoke";
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
  audioQuellen: [
    {
      id: "aq-1",
      url: "https://example.com/test.mp3",
      typ: "MP3" as const,
      label: "Test MP3",
      orderIndex: 0,
      rolle: "STANDARD" as const,
    },
  ],
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

const testFlatLines: FlatLine[] = [
  {
    zeileId: "zeile-1",
    text: "Hello world",
    rawText: "Hello world",
    stropheId: "strophe-1",
    stropheName: "Strophe 1",
    globalIndex: 0,
    indexInStrophe: 0,
    stropheLineCount: 2,
  },
  {
    zeileId: "zeile-2",
    text: "Second line",
    rawText: "Second line",
    stropheId: "strophe-1",
    stropheName: "Strophe 1",
    globalIndex: 1,
    indexInStrophe: 1,
    stropheLineCount: 2,
  },
];

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

/** Default props for KaraokeView (without referenzDaten) */
const defaultProps = {
  song: testSong,
  flatLines: testFlatLines,
  activeLineIndex: 0,
  displayMode: "einzelzeile" as const,
  isAutoScrolling: false,
  scrollSpeed: 5,
  activeAudioQuelleId: "aq-1",
  onNext: vi.fn(),
  onPrev: vi.fn(),
  onNextStrophe: vi.fn(),
  onPrevStrophe: vi.fn(),
  onToggleAutoScroll: vi.fn(),
  onModeChange: vi.fn(),
  onOpenSettings: vi.fn(),
  onBack: vi.fn(),
  onAudioTimeUpdate: vi.fn(),
};

// ============================================================
// Part 1: Source-code structural analysis (Req 6.1, 6.2, 6.3, 6.4)
// ============================================================

describe("KaraokeView source — PitchDisplay integration structure", () => {
  it("imports PitchDisplay component (Req 6.1)", () => {
    expect(source).toContain(
      'import { PitchDisplay } from "@/components/pitch-display/pitch-display"',
    );
  });

  it("imports aggregiereFramesZuBalken for frame-to-bar conversion (Req 6.1)", () => {
    expect(source).toContain(
      'import { aggregiereFramesZuBalken } from "@/lib/pitch-display/pitch-balken"',
    );
  });

  it("computes pitchBalken via useMemo from referenzDaten.frames (Req 6.1)", () => {
    expect(source).toContain("aggregiereFramesZuBalken(referenzDaten.frames)");
    expect(source).toMatch(/useMemo\(\s*\(\)\s*=>\s*\(referenzDaten \? aggregiereFramesZuBalken/);
  });

  it("conditionally renders PitchDisplay based on referenzDaten (Req 6.1, 6.2)", () => {
    // showPitchDisplay depends only on referenzDaten being present
    expect(source).toContain("!!referenzDaten");
    expect(source).toContain("showPitchDisplay");
    expect(source).toContain("<PitchDisplay");
  });

  it("does not render PitchDisplay when referenzDaten is absent (Req 6.2)", () => {
    // The showPitchDisplay guard requires !!referenzDaten
    expect(source).toContain("!!referenzDaten");
    // PitchDisplay is rendered inside {showPitchDisplay && (...)}
    expect(source).toContain("{showPitchDisplay && (");
  });

  it("provides a toggle button for pitch display when referenzDaten is available (Req 6.3)", () => {
    // Toggle button is conditionally rendered when referenzDaten is available
    expect(source).toContain("{!!referenzDaten && (");
    // Toggle button has aria-label for accessibility
    expect(source).toContain("Pitch-Anzeige ausschalten");
    expect(source).toContain("Pitch-Anzeige einschalten");
    // Toggle uses aria-pressed
    expect(source).toContain("aria-pressed={pitchToggle}");
  });

  it("tracks currentTimeMs from onAudioTimeUpdate callback (Req 6.4)", () => {
    // KaraokeView wraps the parent onAudioTimeUpdate to also track currentTimeMs
    expect(source).toContain("setCurrentTimeMs(timeMs)");
    expect(source).toContain("onAudioTimeUpdate?.(timeMs)");
    // Passes currentTimeMs to PitchDisplay
    expect(source).toContain("currentTimeMs={currentTimeMs}");
  });

  it("passes isPlaying={isAudioPlaying} to PitchDisplay (Req 6.1)", () => {
    expect(source).toContain("isPlaying={isAudioPlaying}");
  });

  it("passes balken={pitchBalken} to PitchDisplay (Req 6.1)", () => {
    expect(source).toContain("balken={pitchBalken}");
  });

  it("defaults pitchToggle to true when referenzDaten is available (Req 6.3)", () => {
    expect(source).toContain("useState(!!referenzDaten)");
  });
});

// ============================================================
// Part 2: Render tests — KaraokeView with and without referenzDaten
// ============================================================

describe("KaraokeView render — PitchDisplay integration (Req 6.1, 6.2, 6.3)", () => {
  let KaraokeView: typeof import("@/components/karaoke/karaoke-view").KaraokeView;

  beforeEach(async () => {
    const mod = await import("@/components/karaoke/karaoke-view");
    KaraokeView = mod.KaraokeView;
  });

  it("does not render PitchDisplay SVG when referenzDaten is undefined (Req 6.2)", () => {
    const { container } = render(
      React.createElement(KaraokeView, {
        ...defaultProps,
        referenzDaten: undefined,
      }),
    );

    // No SVG with role="img" should be present (PitchDisplay renders an SVG with role="img")
    const pitchSvg = container.querySelector('svg[role="img"]');
    expect(pitchSvg).toBeNull();
  });

  it("does not render pitch toggle button when referenzDaten is undefined (Req 6.3)", () => {
    const { container } = render(
      React.createElement(KaraokeView, {
        ...defaultProps,
        referenzDaten: undefined,
      }),
    );

    // No button with pitch-related aria-label should exist
    const toggleButton = container.querySelector(
      'button[aria-label*="Pitch-Anzeige"]',
    );
    expect(toggleButton).toBeNull();
  });

  it("renders pitch toggle button when referenzDaten is provided (Req 6.3)", () => {
    const { container } = render(
      React.createElement(KaraokeView, {
        ...defaultProps,
        referenzDaten: testReferenzDaten,
      }),
    );

    // Toggle button should be present with aria-label
    const toggleButton = container.querySelector(
      'button[aria-label*="Pitch-Anzeige"]',
    );
    expect(toggleButton).not.toBeNull();
  });

  it("toggle button has aria-pressed attribute reflecting state (Req 6.3)", () => {
    const { container } = render(
      React.createElement(KaraokeView, {
        ...defaultProps,
        referenzDaten: testReferenzDaten,
      }),
    );

    const toggleButton = container.querySelector(
      'button[aria-label*="Pitch-Anzeige"]',
    );
    expect(toggleButton).not.toBeNull();
    // Default state is true (pitch toggle on)
    expect(toggleButton!.getAttribute("aria-pressed")).toBe("true");
  });

  it("renders PitchDisplay SVG even when audio is not playing (Req 6.1)", () => {
    // PitchDisplay is now visible whenever referenzDaten is present and toggle is on
    const { container } = render(
      React.createElement(KaraokeView, {
        ...defaultProps,
        referenzDaten: testReferenzDaten,
      }),
    );

    // PitchDisplay SVG should be present even without audio playing
    const pitchSvg = container.querySelector('svg[role="img"]');
    expect(pitchSvg).not.toBeNull();
  });
});
