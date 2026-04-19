/**
 * @vitest-environment jsdom
 */

/**
 * Unit tests for WiedergabeMixer component
 * (src/components/phrase-trainer/wiedergabe-mixer.tsx)
 *
 * Tests: initial volume values, panning reset on reference deactivation,
 * playback range constraints, reference vocal toggle behavior
 *
 * Validates: Requirements 4.2, 5.3, 6.4, 7.5
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, act, waitFor } from "@testing-library/react";

// --- Mock child components to isolate WiedergabeMixer logic ---

vi.mock("@/components/ui/iconify-icon", () => ({
  AppIcon: ({ icon, ...props }: { icon: string; [key: string]: unknown }) =>
    React.createElement("span", { "data-testid": `icon-${icon}`, ...props }),
}));

// --- Web Audio API mocks ---

/** Track all created GainNodes and StereoPannerNodes for assertions */
let createdGainNodes: Array<{ gain: { value: number }; connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }>;
let createdPannerNodes: Array<{ pan: { value: number }; connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }>;
let createdBufferSources: Array<{
  buffer: unknown;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
}>;

/** Mock Audio elements created via `new Audio()` */
let mockAudioElements: Array<{
  src: string;
  crossOrigin: string | null;
  currentTime: number;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  removeAttribute: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
}>;

let mockAudioContext: {
  state: string;
  destination: object;
  createGain: ReturnType<typeof vi.fn>;
  createStereoPanner: ReturnType<typeof vi.fn>;
  createMediaElementSource: ReturnType<typeof vi.fn>;
  createBuffer: ReturnType<typeof vi.fn>;
  createBufferSource: ReturnType<typeof vi.fn>;
  resume: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  createdGainNodes = [];
  createdPannerNodes = [];
  createdBufferSources = [];
  mockAudioElements = [];

  function createMockGainNode() {
    const node = {
      gain: { value: 1 },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    createdGainNodes.push(node);
    return node;
  }

  function createMockPannerNode() {
    const node = {
      pan: { value: 0 },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    createdPannerNodes.push(node);
    return node;
  }

  function createMockBufferSource() {
    const node = {
      buffer: null as unknown,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    createdBufferSources.push(node);
    return node;
  }

  mockAudioContext = {
    state: "running",
    destination: {},
    createGain: vi.fn(() => createMockGainNode()),
    createStereoPanner: vi.fn(() => createMockPannerNode()),
    createMediaElementSource: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
    })),
    createBuffer: vi.fn((_channels: number, length: number, sampleRate: number) => ({
      length,
      sampleRate,
      getChannelData: vi.fn(() => new Float32Array(length)),
    })),
    createBufferSource: vi.fn(() => createMockBufferSource()),
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  };

  vi.stubGlobal(
    "AudioContext",
    class MockAudioContext {
      state = mockAudioContext.state;
      destination = mockAudioContext.destination;
      createGain = mockAudioContext.createGain;
      createStereoPanner = mockAudioContext.createStereoPanner;
      createMediaElementSource = mockAudioContext.createMediaElementSource;
      createBuffer = mockAudioContext.createBuffer;
      createBufferSource = mockAudioContext.createBufferSource;
      resume = mockAudioContext.resume;
      close = mockAudioContext.close;
    },
  );

  vi.stubGlobal(
    "Audio",
    class MockAudio {
      src: string;
      crossOrigin: string | null = null;
      currentTime = 0;
      play = vi.fn().mockResolvedValue(undefined);
      pause = vi.fn();
      removeAttribute = vi.fn();
      addEventListener = vi.fn();
      removeEventListener = vi.fn();

      constructor(src?: string) {
        this.src = src ?? "";
        mockAudioElements.push(this);
        return this as unknown as HTMLAudioElement;
      }
    },
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// --- Test helpers ---

const defaultProps = {
  aufnahmeBuffer: new Float32Array([0.1, 0.2, 0.3, 0.4]),
  aufnahmeSampleRate: 44100,
  instrumentalUrl: "https://example.com/instrumental.mp3",
  referenzVokalUrl: "https://example.com/referenz.mp3",
  startTimeMs: 5000,
  endTimeMs: 30000,
  onNeueAufnahme: vi.fn(),
  onZurueckZurAuswahl: vi.fn(),
};

async function renderMixer(overrides?: Partial<typeof defaultProps>) {
  const { WiedergabeMixer } = await import(
    "@/components/phrase-trainer/wiedergabe-mixer"
  );

  const props = { ...defaultProps, ...overrides };

  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(React.createElement(WiedergabeMixer, props));
  });

  return { ...result!, props };
}

// --- Tests ---

describe("WiedergabeMixer — Initial Volume Values (Req 6.4)", () => {
  it("sets instrumental GainNode to 1.0 (100%) on mount", async () => {
    await renderMixer();

    // The component creates GainNodes in order: instrumental, recording, reference
    // Instrumental gain is the first one created
    expect(createdGainNodes.length).toBeGreaterThanOrEqual(1);
    expect(createdGainNodes[0].gain.value).toBe(1.0);
  });

  it("sets recording GainNode to 1.0 (100%) on mount", async () => {
    await renderMixer();

    // Recording gain is the second GainNode created
    expect(createdGainNodes.length).toBeGreaterThanOrEqual(2);
    expect(createdGainNodes[1].gain.value).toBe(1.0);
  });

  it("stores reference volume at 0.7 (70%) but mutes GainNode when reference is initially inactive", async () => {
    await renderMixer();

    // Reference gain is the third GainNode created
    expect(createdGainNodes.length).toBeGreaterThanOrEqual(3);
    // Reference is initially inactive, so GainNode is muted (0)
    expect(createdGainNodes[2].gain.value).toBe(0);

    // Activate reference — gain should become 0.7
    const toggle = screen.getByLabelText(/Referenz-Vokal aktivieren/i);
    await act(async () => {
      fireEvent.click(toggle);
    });

    expect(createdGainNodes[2].gain.value).toBe(0.7);
  });

  it("renders volume sliders with correct initial labels", async () => {
    await renderMixer();

    // Instrumental slider at 100%
    expect(screen.getByLabelText(/Instrumental Lautstärke: 100 Prozent/i)).toBeDefined();
    // Recording slider at 100%
    expect(screen.getByLabelText(/Aufnahme Lautstärke: 100 Prozent/i)).toBeDefined();
    // Reference slider at 70%
    expect(screen.getByLabelText(/Referenz-Vokal Lautstärke: 70 Prozent/i)).toBeDefined();
  });
});

describe("WiedergabeMixer — Reference Vocal Toggle (Req 5.3)", () => {
  it("shows reference toggle when referenzVokalUrl is provided", async () => {
    await renderMixer();

    const toggle = screen.getByLabelText(/Referenz-Vokal aktivieren/i);
    expect(toggle).toBeDefined();
  });

  it("hides reference toggle when referenzVokalUrl is null", async () => {
    await renderMixer({ referenzVokalUrl: null });

    expect(screen.queryByLabelText(/Referenz-Vokal aktivieren/i)).toBeNull();
  });

  it("reference is initially deactivated (unchecked)", async () => {
    await renderMixer();

    const toggle = screen.getByLabelText(/Referenz-Vokal aktivieren/i) as HTMLInputElement;
    expect(toggle.checked).toBe(false);
  });

  it("activating reference does not affect instrumental or recording gain", async () => {
    await renderMixer();

    const instrumentalGain = createdGainNodes[0];
    const recordingGain = createdGainNodes[1];

    // Record initial values
    const initialInstGain = instrumentalGain.gain.value;
    const initialRecGain = recordingGain.gain.value;

    // Toggle reference on
    const toggle = screen.getByLabelText(/Referenz-Vokal aktivieren/i);
    await act(async () => {
      fireEvent.click(toggle);
    });

    // Instrumental and recording gains should remain unchanged
    expect(instrumentalGain.gain.value).toBe(initialInstGain);
    expect(recordingGain.gain.value).toBe(initialRecGain);
  });

  it("deactivating reference mutes reference gain to 0 without affecting other tracks (Req 5.3)", async () => {
    await renderMixer();

    const instrumentalGain = createdGainNodes[0];
    const recordingGain = createdGainNodes[1];
    const referenzGain = createdGainNodes[2];

    // Toggle reference on
    const toggle = screen.getByLabelText(/Referenz-Vokal aktivieren/i);
    await act(async () => {
      fireEvent.click(toggle);
    });

    // Reference gain should now reflect the 0.7 value (active)
    expect(referenzGain.gain.value).toBe(0.7);

    // Record instrumental and recording gains
    const instGainBefore = instrumentalGain.gain.value;
    const recGainBefore = recordingGain.gain.value;

    // Toggle reference off
    await act(async () => {
      fireEvent.click(toggle);
    });

    // Reference gain should be muted (0)
    expect(referenzGain.gain.value).toBe(0);

    // Other tracks should be unaffected
    expect(instrumentalGain.gain.value).toBe(instGainBefore);
    expect(recordingGain.gain.value).toBe(recGainBefore);
  });
});

describe("WiedergabeMixer — Panning Reset on Reference Deactivation (Req 7.5)", () => {
  it("hides panning slider when reference is not active", async () => {
    await renderMixer();

    // Reference is initially inactive, so panning slider should be hidden
    expect(screen.queryByLabelText(/Stereo-Trennung/i)).toBeNull();
  });

  it("shows panning slider when reference is activated", async () => {
    await renderMixer();

    const toggle = screen.getByLabelText(/Referenz-Vokal aktivieren/i);
    await act(async () => {
      fireEvent.click(toggle);
    });

    expect(screen.getByLabelText(/Stereo-Trennung/i)).toBeDefined();
  });

  it("resets recording pan to center (0) when reference is deactivated (Req 7.5)", async () => {
    await renderMixer();

    // The recording panner is the first StereoPannerNode created
    const recordingPanner = createdPannerNodes[0];

    // Toggle reference on
    const toggle = screen.getByLabelText(/Referenz-Vokal aktivieren/i);
    await act(async () => {
      fireEvent.click(toggle);
    });

    // With reference active and panning at 0.5, recording pan should be -0.5
    expect(recordingPanner.pan.value).toBe(-0.5);

    // Toggle reference off
    await act(async () => {
      fireEvent.click(toggle);
    });

    // Recording pan should reset to center (0)
    expect(recordingPanner.pan.value).toBe(0);
  });

  it("hides panning slider after reference deactivation (Req 7.5)", async () => {
    await renderMixer();

    const toggle = screen.getByLabelText(/Referenz-Vokal aktivieren/i);

    // Activate reference
    await act(async () => {
      fireEvent.click(toggle);
    });
    expect(screen.getByLabelText(/Stereo-Trennung/i)).toBeDefined();

    // Deactivate reference
    await act(async () => {
      fireEvent.click(toggle);
    });
    expect(screen.queryByLabelText(/Stereo-Trennung/i)).toBeNull();
  });
});

describe("WiedergabeMixer — Playback Range Constraints (Req 4.2)", () => {
  it("seeks instrumental to startTimeMs when playback starts", async () => {
    await renderMixer({ startTimeMs: 10000 });

    const playBtn = screen.getByLabelText(/Abspielen/i);
    await act(async () => {
      fireEvent.click(playBtn);
    });

    // The instrumental audio element should be seeked to 10s
    const instAudio = mockAudioElements[0];
    expect(instAudio.currentTime).toBe(10); // 10000ms = 10s
  });

  it("auto-stops playback when instrumental currentTime reaches endTimeMs (Req 4.2)", async () => {
    vi.useFakeTimers();

    await renderMixer({ startTimeMs: 5000, endTimeMs: 30000 });

    const playBtn = screen.getByLabelText(/Abspielen/i);
    await act(async () => {
      fireEvent.click(playBtn);
    });

    // Verify playback started
    expect(screen.getByLabelText(/Pause/i)).toBeDefined();

    // Simulate time passing — set currentTime past endTimeMs
    const instAudio = mockAudioElements[0];
    instAudio.currentTime = 30.1; // past 30s end

    // Advance timers to trigger the polling interval (100ms)
    await act(async () => {
      vi.advanceTimersByTime(150);
    });

    // Playback should have auto-stopped
    expect(screen.getByLabelText(/Abspielen/i)).toBeDefined();

    vi.useRealTimers();
  });

  it("does not auto-stop when currentTime is within range", async () => {
    vi.useFakeTimers();

    await renderMixer({ startTimeMs: 5000, endTimeMs: 30000 });

    const playBtn = screen.getByLabelText(/Abspielen/i);
    await act(async () => {
      fireEvent.click(playBtn);
    });

    // Set currentTime within range
    const instAudio = mockAudioElements[0];
    instAudio.currentTime = 15.0; // 15s, within 5s–30s range

    // Advance timers
    await act(async () => {
      vi.advanceTimersByTime(150);
    });

    // Playback should still be active
    expect(screen.getByLabelText(/Pause/i)).toBeDefined();

    vi.useRealTimers();
  });

  it("pauses instrumental and recording on manual stop", async () => {
    await renderMixer();

    // Start playback
    const playBtn = screen.getByLabelText(/Abspielen/i);
    await act(async () => {
      fireEvent.click(playBtn);
    });

    // Stop playback
    const stopBtn = screen.getByLabelText(/Stopp/i);
    await act(async () => {
      fireEvent.click(stopBtn);
    });

    // Instrumental should be paused
    const instAudio = mockAudioElements[0];
    expect(instAudio.pause).toHaveBeenCalled();

    // Should show play button again
    expect(screen.getByLabelText(/Abspielen/i)).toBeDefined();
  });
});

describe("WiedergabeMixer — Playback Controls", () => {
  it("renders play/pause and stop buttons", async () => {
    await renderMixer();

    expect(screen.getByLabelText(/Abspielen/i)).toBeDefined();
    expect(screen.getByLabelText(/Stopp/i)).toBeDefined();
  });

  it("renders Neue Aufnahme and Zurück zur Auswahl buttons", async () => {
    await renderMixer();

    expect(screen.getByLabelText(/Neue Aufnahme/i)).toBeDefined();
    expect(screen.getByLabelText(/Zurück zur Auswahl/i)).toBeDefined();
  });

  it("calls onNeueAufnahme when Neue Aufnahme button is clicked", async () => {
    const onNeueAufnahme = vi.fn();
    await renderMixer({ onNeueAufnahme });

    const btn = screen.getByLabelText(/Neue Aufnahme/i);
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(onNeueAufnahme).toHaveBeenCalledTimes(1);
  });

  it("calls onZurueckZurAuswahl when Zurück zur Auswahl button is clicked", async () => {
    const onZurueckZurAuswahl = vi.fn();
    await renderMixer({ onZurueckZurAuswahl });

    const btn = screen.getByLabelText(/Zurück zur Auswahl/i);
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(onZurueckZurAuswahl).toHaveBeenCalledTimes(1);
  });

  it("toggles between play and pause states", async () => {
    await renderMixer();

    // Initially shows "Abspielen"
    expect(screen.getByLabelText(/Abspielen/i)).toBeDefined();

    // Click play
    await act(async () => {
      fireEvent.click(screen.getByLabelText(/Abspielen/i));
    });

    // Should now show "Pause"
    expect(screen.getByLabelText(/Pause/i)).toBeDefined();

    // Click pause
    await act(async () => {
      fireEvent.click(screen.getByLabelText(/Pause/i));
    });

    // Should show "Abspielen" again
    expect(screen.getByLabelText(/Abspielen/i)).toBeDefined();
  });
});

describe("WiedergabeMixer — No Reference Vocal", () => {
  it("does not create reference audio chain when referenzVokalUrl is null", async () => {
    await renderMixer({ referenzVokalUrl: null });

    // Only 1 Audio element should be created (instrumental only)
    expect(mockAudioElements.length).toBe(1);
    expect(mockAudioElements[0].src).toBe("https://example.com/instrumental.mp3");

    // Only 2 GainNodes (instrumental + recording, no reference)
    expect(createdGainNodes.length).toBe(2);

    // Only 1 StereoPannerNode (recording only, no reference)
    expect(createdPannerNodes.length).toBe(1);
  });

  it("does not show reference volume slider when referenzVokalUrl is null", async () => {
    await renderMixer({ referenzVokalUrl: null });

    expect(screen.queryByLabelText(/Referenz-Vokal Lautstärke/i)).toBeNull();
  });
});
