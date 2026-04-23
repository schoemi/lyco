/**
 * @vitest-environment jsdom
 */

/**
 * Unit tests for AufnahmeBereich component
 * (src/components/phrase-trainer/aufnahme-bereich.tsx)
 *
 * Tests: mic error handling (NotAllowedError, NotFoundError), auto-stop behavior
 *
 * Validates: Requirements 2.2, 2.6, 2.7
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, act, waitFor } from "@testing-library/react";
import type { SongDetail, StropheDetail, MarkupResponse } from "@/types/song";

// --- Mock child components to isolate AufnahmeBereich logic ---

vi.mock("@/components/karaoke/text-anzeige", () => ({
  TextAnzeige: () => React.createElement("div", { "data-testid": "text-anzeige" }),
}));

vi.mock("@/components/karaoke/strophen-titel", () => ({
  StrophenTitel: ({ name }: { name: string }) =>
    React.createElement("div", { "data-testid": "strophen-titel" }, name),
}));

vi.mock("@/components/vocal-trainer/vu-meter", () => ({
  VuMeter: () => React.createElement("div", { "data-testid": "vu-meter" }),
}));

vi.mock("@/lib/vocal-trainer/latenz", () => ({
  messeLatenz: vi.fn().mockResolvedValue(0),
  kompensiere: vi.fn((buf: Float32Array) => buf),
}));

// --- Web Audio API & Media mocks ---

/** Captured event listeners from the Audio element */
let audioEventListeners: Record<string, (() => void)[]>;
/** The mock Audio element returned by `new Audio()` */
let mockAudioElement: Record<string, unknown>;
let mockAudioPlay: ReturnType<typeof vi.fn>;

function createMockGainNode() {
  return { gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() };
}

function createMockAnalyserNode() {
  return {
    fftSize: 256,
    smoothingTimeConstant: 0.8,
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
}

function createMockScriptProcessorNode() {
  return {
    onaudioprocess: null as ((event: unknown) => void) | null,
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
}

beforeEach(() => {
  audioEventListeners = {};
  mockAudioPlay = vi.fn().mockResolvedValue(undefined);

  mockAudioElement = {
    play: mockAudioPlay,
    pause: vi.fn(),
    currentTime: 0,
    crossOrigin: null,
    src: "",
    addEventListener: vi.fn((event: string, handler: () => void) => {
      if (!audioEventListeners[event]) audioEventListeners[event] = [];
      audioEventListeners[event].push(handler);
    }),
    removeEventListener: vi.fn(),
    removeAttribute: vi.fn(),
  };

  // Mock Audio constructor as a class
  vi.stubGlobal(
    "Audio",
    class MockAudio {
      constructor(src?: string) {
        if (src) (mockAudioElement as Record<string, unknown>).src = src;
        return mockAudioElement as unknown as HTMLAudioElement;
      }
    },
  );

  // Mock AudioContext as a class
  vi.stubGlobal(
    "AudioContext",
    class MockAudioContext {
      sampleRate = 44100;
      state = "running";
      destination = {};
      createGain = vi.fn(() => createMockGainNode());
      createAnalyser = vi.fn(() => createMockAnalyserNode());
      createScriptProcessor = vi.fn(() => createMockScriptProcessorNode());
      createMediaStreamSource = vi.fn(() => ({
        connect: vi.fn(),
        disconnect: vi.fn(),
      }));
      close = vi.fn().mockResolvedValue(undefined);
    },
  );

  // Default: getUserMedia succeeds
  const mockStream = {
    getTracks: vi.fn(() => [{ stop: vi.fn() }]),
  };
  Object.defineProperty(navigator, "mediaDevices", {
    value: {
      getUserMedia: vi.fn().mockResolvedValue(mockStream),
    },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// --- Test helpers ---

function makeTimecodeMarkup(ms: number): MarkupResponse {
  return {
    id: `markup-tc-${ms}`,
    typ: "TIMECODE" as const,
    ziel: "STROPHE" as const,
    wert: null,
    timecodeMs: ms,
    wortIndex: null,
  };
}

function makeZeile(id: string, text: string, orderIndex: number) {
  return {
    id,
    text,
    uebersetzung: null,
    orderIndex,
    istKommentar: false,
    markups: [] as MarkupResponse[],
  };
}

function makeStrophe(
  id: string,
  name: string,
  orderIndex: number,
  timecodeMs?: number,
): StropheDetail {
  return {
    id,
    name,
    orderIndex,
    progress: 0,
    notiz: null,
    analyse: null,
    istInstrumental: false,
    zeilen: [makeZeile(`${id}-z1`, `Zeile 1 von ${name}`, 0)],
    markups: timecodeMs != null ? [makeTimecodeMarkup(timecodeMs)] : [],
  };
}

function makeSong(strophen: StropheDetail[]): SongDetail {
  return {
    id: "song-1",
    titel: "Test Song",
    kuenstler: "Test Artist",
    sprache: "de",
    emotionsTags: [],
    coverUrl: null,
    tonart: null,
    progress: 0,
    sessionCount: 0,
    analyse: null,
    coachTipp: null,
    strophen,
    audioQuellen: [],
    sets: [],
    beatErgebnis: null,
  };
}

const defaultStrophen = [
  makeStrophe("s1", "Strophe 1", 0, 0),
  makeStrophe("s2", "Strophe 2", 1, 30000),
];

async function renderAufnahmeBereich(overrides?: Partial<{
  song: SongDetail;
  ausgewaehlteStrophenIds: Set<string>;
  instrumentalUrl: string;
  selectedDeviceId: string;
  gainWert: number;
  onAufnahmeAbgeschlossen: (buffer: Float32Array, sampleRate: number) => void;
  onAbbrechen: () => void;
}>) {
  // Dynamic import to ensure mocks are in place
  const { AufnahmeBereich } = await import(
    "@/components/phrase-trainer/aufnahme-bereich"
  );

  const defaultProps = {
    song: makeSong(defaultStrophen),
    ausgewaehlteStrophenIds: new Set(["s1"]),
    instrumentalUrl: "https://example.com/instrumental.mp3",
    selectedDeviceId: "device-1",
    gainWert: 1.0,
    onAufnahmeAbgeschlossen: vi.fn(),
    onAbbrechen: vi.fn(),
    ...overrides,
  };

  const result = render(React.createElement(AufnahmeBereich, defaultProps));

  return {
    ...result,
    onAufnahmeAbgeschlossen: defaultProps.onAufnahmeAbgeschlossen,
    onAbbrechen: defaultProps.onAbbrechen,
  };
}

/** Click "Aufnahme starten" and wait for the async recording setup to complete */
async function startRecording() {
  const startBtn = screen.getByRole("button", { name: /Aufnahme starten/i });
  await act(async () => {
    fireEvent.click(startBtn);
  });
}

// --- Tests ---

describe("AufnahmeBereich — Mic Error Handling", () => {
  // Req 2.6: NotAllowedError shows appropriate error message
  it("shows permission denied error when getUserMedia throws NotAllowedError (Req 2.6)", async () => {
    const notAllowedError = new DOMException(
      "Permission denied",
      "NotAllowedError",
    );
    (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      notAllowedError,
    );

    await renderAufnahmeBereich();
    await startRecording();

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain(
      "Mikrofon-Berechtigung wurde verweigert",
    );
    expect(alert.textContent).toContain("Browser-Einstellungen");
  });

  // Req 2.7: NotFoundError shows appropriate error message
  it("shows no microphone error when getUserMedia throws NotFoundError (Req 2.7)", async () => {
    const notFoundError = new DOMException(
      "Requested device not found",
      "NotFoundError",
    );
    (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      notFoundError,
    );

    await renderAufnahmeBereich();
    await startRecording();

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Kein Mikrofon gefunden");
    expect(alert.textContent).toContain("Mikrofon an");
  });

  // Generic error fallback
  it("shows generic error for unknown mic errors", async () => {
    const genericError = new DOMException("Unknown error", "AbortError");
    (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      genericError,
    );

    await renderAufnahmeBereich();
    await startRecording();

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Fehler beim Zugriff auf das Mikrofon");
  });

  // No error displayed initially
  it("does not show error alert before recording attempt", async () => {
    await renderAufnahmeBereich();

    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("AufnahmeBereich — Auto-Stop Behavior", () => {
  // Req 2.2: Auto-stop when instrumental "ended" event fires
  it("calls onAufnahmeAbgeschlossen when instrumental ends (auto-stop)", async () => {
    const onAufnahmeAbgeschlossen = vi.fn();

    await renderAufnahmeBereich({ onAufnahmeAbgeschlossen });
    await startRecording();

    // The component should have registered an "ended" listener on the Audio element
    expect(audioEventListeners["ended"]).toBeDefined();
    expect(audioEventListeners["ended"].length).toBeGreaterThan(0);

    // Simulate the instrumental audio element firing "ended" event
    await act(async () => {
      audioEventListeners["ended"].forEach((handler) => handler());
    });

    expect(onAufnahmeAbgeschlossen).toHaveBeenCalledTimes(1);
    // Verify it was called with a Float32Array and sample rate
    const [buffer, sampleRate] = onAufnahmeAbgeschlossen.mock.calls[0];
    expect(buffer).toBeInstanceOf(Float32Array);
    expect(sampleRate).toBe(44100);
  });

  // Req 2.2: Auto-stop via interval when currentTime reaches end timecode
  it("auto-stops via interval when currentTime reaches end timecode (Req 2.2)", async () => {
    const strophen = [
      makeStrophe("s1", "Strophe 1", 0, 0),
      makeStrophe("s2", "Strophe 2", 1, 30000),
      makeStrophe("s3", "Strophe 3", 2, 60000),
    ];
    const song = makeSong(strophen);

    // Select only s1 → end timecode should be s2's timecode (30000ms = 30s)
    const onAufnahmeAbgeschlossen = vi.fn();

    await renderAufnahmeBereich({
      song,
      ausgewaehlteStrophenIds: new Set(["s1"]),
      onAufnahmeAbgeschlossen,
    });

    await startRecording();

    // Simulate reaching the end timecode (30s) — the component polls every 100ms
    mockAudioElement.currentTime = 30.1; // past 30s end

    // Wait for the interval to fire and detect the end timecode
    await waitFor(
      () => {
        expect(onAufnahmeAbgeschlossen).toHaveBeenCalledTimes(1);
      },
      { timeout: 500 },
    );
  });

  it("stops recording and delivers buffer on manual stop", async () => {
    const onAufnahmeAbgeschlossen = vi.fn();

    await renderAufnahmeBereich({ onAufnahmeAbgeschlossen });
    await startRecording();

    // After starting, the component should show "Aufnahme stoppen"
    const stopBtn = screen.getByRole("button", { name: /Aufnahme stoppen/i });
    await act(async () => {
      fireEvent.click(stopBtn);
    });

    expect(onAufnahmeAbgeschlossen).toHaveBeenCalledTimes(1);
  });

  it("calls onAbbrechen and discards buffer on cancel", async () => {
    const onAbbrechen = vi.fn();
    const onAufnahmeAbgeschlossen = vi.fn();

    await renderAufnahmeBereich({ onAbbrechen, onAufnahmeAbgeschlossen });
    await startRecording();

    // After starting, the component should show "Abbrechen"
    const cancelBtn = screen.getByRole("button", { name: /Aufnahme abbrechen/i });
    await act(async () => {
      fireEvent.click(cancelBtn);
    });

    expect(onAbbrechen).toHaveBeenCalledTimes(1);
    expect(onAufnahmeAbgeschlossen).not.toHaveBeenCalled();
  });
});

describe("AufnahmeBereich — Recording Setup", () => {
  it("requests mic with correct constraints (mono, 44.1kHz, no processing)", async () => {
    await renderAufnahmeBereich({ selectedDeviceId: "mic-42" });
    await startRecording();

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      audio: expect.objectContaining({
        channelCount: 1,
        sampleRate: 44100,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        deviceId: { exact: "mic-42" },
      }),
    });
  });

  it("shows instrumental play error when audio.play() fails", async () => {
    mockAudioPlay.mockRejectedValueOnce(new Error("Play failed"));

    await renderAufnahmeBereich();
    await startRecording();

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Fehler beim Abspielen des Instrumentals");
  });
});
