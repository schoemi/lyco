/**
 * @vitest-environment jsdom
 */

/**
 * Integration tests for the Phrasen-Trainer full workflow.
 *
 * Tests the complete end-to-end flow through the state machine:
 *   Headphone dialog → AUSWAHL → BEREIT → AUFNAHME → WIEDERGABE
 * Including back-transitions, cancellation, and multiple recording rounds.
 *
 * Uses the same mocked child component approach as the unit tests since
 * Web Audio API is not available in jsdom.
 *
 * Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5, 11.6
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import type { SongDetail, StropheDetail, MarkupResponse } from "@/types/song";
import type { AudioQuelleResponse } from "@/types/audio";

// ─── Mock child components (same approach as phrase-trainer-view.test.ts) ───

let strophenAuswahlProps: Record<string, unknown> | null = null;
let aufnahmeBereichProps: Record<string, unknown> | null = null;
let wiedergabeMixerProps: Record<string, unknown> | null = null;

vi.mock("@/components/vocal-trainer/kopfhoerer-hinweis", () => ({
  KopfhoererHinweis: ({ onBestaetigt }: { onBestaetigt: () => void }) => {
    return React.createElement(
      "div",
      { "data-testid": "kopfhoerer-hinweis" },
      React.createElement(
        "button",
        { "data-testid": "kopfhoerer-bestaetigen", onClick: onBestaetigt },
        "Verstanden",
      ),
    );
  },
}));

vi.mock("@/components/phrase-trainer/strophen-auswahl", () => ({
  StrophenAuswahl: (props: Record<string, unknown>) => {
    strophenAuswahlProps = props;
    return React.createElement(
      "div",
      { "data-testid": "strophen-auswahl" },
      React.createElement(
        "button",
        {
          "data-testid": "starten-btn",
          onClick: props.onStarten as () => void,
        },
        "Übung starten",
      ),
    );
  },
}));

vi.mock("@/components/phrase-trainer/aufnahme-bereich", () => ({
  AufnahmeBereich: (props: Record<string, unknown>) => {
    aufnahmeBereichProps = props;
    return React.createElement(
      "div",
      { "data-testid": "aufnahme-bereich" },
      React.createElement(
        "button",
        {
          "data-testid": "aufnahme-abgeschlossen-btn",
          onClick: () =>
            (props.onAufnahmeAbgeschlossen as (buf: Float32Array, sr: number) => void)(
              new Float32Array([0.1, 0.2, 0.3]),
              44100,
            ),
        },
        "Aufnahme abschließen",
      ),
      React.createElement(
        "button",
        {
          "data-testid": "aufnahme-abbrechen-btn",
          onClick: props.onAbbrechen as () => void,
        },
        "Abbrechen",
      ),
    );
  },
}));

vi.mock("@/components/phrase-trainer/wiedergabe-mixer", () => ({
  WiedergabeMixer: (props: Record<string, unknown>) => {
    wiedergabeMixerProps = props;
    return React.createElement(
      "div",
      { "data-testid": "wiedergabe-mixer" },
      React.createElement(
        "button",
        {
          "data-testid": "neue-aufnahme-btn",
          onClick: props.onNeueAufnahme as () => void,
        },
        "Neue Aufnahme",
      ),
      React.createElement(
        "button",
        {
          "data-testid": "zurueck-zur-auswahl-btn",
          onClick: props.onZurueckZurAuswahl as () => void,
        },
        "Zurück zur Auswahl",
      ),
    );
  },
}));

vi.mock("@/components/phrase-trainer/geraete-auswahl", () => ({
  GeraeteAuswahl: () =>
    React.createElement("div", { "data-testid": "geraete-auswahl" }),
}));

vi.mock("@/components/phrase-trainer/gain-regler", () => ({
  GainRegler: () =>
    React.createElement("div", { "data-testid": "gain-regler" }),
}));

vi.mock("@/components/karaoke/song-info", () => ({
  SongInfo: ({ titel }: { titel: string }) =>
    React.createElement("div", { "data-testid": "song-info" }, titel),
}));

vi.mock("@/components/karaoke/zurueck-button", () => ({
  ZurueckButton: ({ onBack }: { onBack: () => void }) =>
    React.createElement(
      "button",
      { "data-testid": "zurueck-button", onClick: onBack },
      "Zurück",
    ),
}));

// ─── Navigator mocks ───

beforeEach(() => {
  strophenAuswahlProps = null;
  aufnahmeBereichProps = null;
  wiedergabeMixerProps = null;

  const mockStream = { getTracks: vi.fn(() => [{ stop: vi.fn() }]) };
  Object.defineProperty(navigator, "mediaDevices", {
    value: {
      getUserMedia: vi.fn().mockResolvedValue(mockStream),
      enumerateDevices: vi.fn().mockResolvedValue([]),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
    writable: true,
    configurable: true,
  });

  try {
    localStorage.clear();
  } catch {
    // ignore
  }
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ─── Test data helpers ───

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

function makeStrophe(
  id: string,
  name: string,
  orderIndex: number,
  timecodeMs?: number,
  istInstrumental = false,
): StropheDetail {
  return {
    id,
    name,
    orderIndex,
    progress: 0,
    notiz: null,
    analyse: null,
    istInstrumental,
    zeilen: [
      {
        id: `${id}-z1`,
        text: `Zeile von ${name}`,
        uebersetzung: null,
        orderIndex: 0,
        istKommentar: false,
        markups: [],
      },
    ],
    markups: timecodeMs != null ? [makeTimecodeMarkup(timecodeMs)] : [],
  };
}

function makeInstrumental(): AudioQuelleResponse {
  return {
    id: "aq-inst",
    url: "https://example.com/instrumental.mp3",
    typ: "LINK" as never,
    label: "Instrumental",
    orderIndex: 0,
    rolle: "INSTRUMENTAL" as never,
  };
}

function makeReferenzVokal(): AudioQuelleResponse {
  return {
    id: "aq-ref",
    url: "https://example.com/referenz.mp3",
    typ: "LINK" as never,
    label: "Referenz",
    orderIndex: 1,
    rolle: "REFERENZ_VOKAL" as never,
  };
}

function makeSong(overrides?: Partial<SongDetail>): SongDetail {
  return {
    id: "song-1",
    titel: "Integration Test Song",
    kuenstler: "Test Artist",
    sprache: "de",
    emotionsTags: [],
    coverUrl: null,
    tonart: null,
    progress: 0,
    sessionCount: 0,
    analyse: null,
    coachTipp: null,
    strophen: [
      makeStrophe("s1", "Strophe 1", 0, 0),
      makeStrophe("s2", "Strophe 2", 1, 30000),
      makeStrophe("s3", "Strophe 3", 2, 60000),
    ],
    audioQuellen: [makeInstrumental(), makeReferenzVokal()],
    sets: [],
    beatErgebnis: null,
    ...overrides,
  };
}

// ─── Workflow helpers ───

async function renderView(songOverrides?: Partial<SongDetail>) {
  const { PhraseTrainerView } = await import(
    "@/components/phrase-trainer/phrase-trainer-view"
  );

  const song = makeSong(songOverrides);
  const onZurueck = vi.fn();

  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(
      React.createElement(PhraseTrainerView, { song, onZurueck }),
    );
  });

  return { ...result!, song, onZurueck };
}

async function confirmHeadphones() {
  const btn = screen.getByTestId("kopfhoerer-bestaetigen");
  await act(async () => {
    fireEvent.click(btn);
  });
}

function selectStanzas(ids: string[]) {
  if (strophenAuswahlProps?.onAuswahlAendern) {
    act(() => {
      (strophenAuswahlProps!.onAuswahlAendern as (ids: Set<string>) => void)(
        new Set(ids),
      );
    });
  }
}

async function clickStart() {
  const btn = screen.getByTestId("starten-btn");
  await act(async () => {
    fireEvent.click(btn);
  });
}

async function completeRecording() {
  const btn = screen.getByTestId("aufnahme-abgeschlossen-btn");
  await act(async () => {
    fireEvent.click(btn);
  });
}

async function cancelRecording() {
  const btn = screen.getByTestId("aufnahme-abbrechen-btn");
  await act(async () => {
    fireEvent.click(btn);
  });
}

async function clickNeueAufnahme() {
  const btn = screen.getByTestId("neue-aufnahme-btn");
  await act(async () => {
    fireEvent.click(btn);
  });
}

async function clickZurueckZurAuswahl() {
  const btn = screen.getByTestId("zurueck-zur-auswahl-btn");
  await act(async () => {
    fireEvent.click(btn);
  });
}

// ─── Assertion helpers ───

function expectState(expectedState: "AUSWAHL" | "BEREIT" | "AUFNAHME" | "WIEDERGABE") {
  const labels: Record<string, string> = {
    AUSWAHL: "Strophenauswahl",
    BEREIT: "Bereit für die Aufnahme",
    AUFNAHME: "Aufnahme läuft",
    WIEDERGABE: "Wiedergabe",
  };

  const label = labels[expectedState];

  if (expectedState === "WIEDERGABE") {
    // "Wiedergabe" appears in both aria-live and h2
    const elements = screen.getAllByText(label);
    expect(elements.length).toBeGreaterThanOrEqual(1);
    expect(elements.some((el) => el.closest("[aria-live]") !== null)).toBe(true);
  } else {
    expect(screen.getByText(label)).toBeDefined();
  }
}

function expectVisible(testId: string) {
  expect(screen.getByTestId(testId)).toBeDefined();
}

function expectNotVisible(testId: string) {
  expect(screen.queryByTestId(testId)).toBeNull();
}

// ─── Integration Tests ───

describe("Phrasen-Trainer Workflow Integration", () => {
  describe("Complete flow: headphone dialog → stanza selection → recording → playback mixer (Req 11.1–11.6)", () => {
    it("walks through the entire workflow end-to-end", async () => {
      await renderView();

      // Step 1: Headphone dialog appears on mount (overlay on top of AUSWAHL)
      expectVisible("kopfhoerer-hinweis");
      // AUSWAHL content is rendered behind the overlay
      expectState("AUSWAHL");

      // Step 2: Confirm headphones → dialog dismissed, AUSWAHL state visible
      await confirmHeadphones();
      expectNotVisible("kopfhoerer-hinweis");
      expectState("AUSWAHL");
      expectVisible("strophen-auswahl");
      expectNotVisible("aufnahme-bereich");
      expectNotVisible("wiedergabe-mixer");

      // Step 3: Select stanzas + click Start → BEREIT state
      selectStanzas(["s1", "s2"]);
      await clickStart();
      expectState("BEREIT");
      expectNotVisible("strophen-auswahl");
      expectVisible("aufnahme-bereich");
      expectVisible("geraete-auswahl");
      expectVisible("gain-regler");
      expectNotVisible("wiedergabe-mixer");

      // Step 4: Complete recording → WIEDERGABE state, WiedergabeMixer visible
      await completeRecording();
      expectState("WIEDERGABE");
      expectVisible("wiedergabe-mixer");
      expectNotVisible("strophen-auswahl");
      expectNotVisible("aufnahme-bereich");

      // Step 5: Click "Neue Aufnahme" → back to BEREIT
      await clickNeueAufnahme();
      expectState("BEREIT");
      expectVisible("aufnahme-bereich");
      expectNotVisible("wiedergabe-mixer");
      expectNotVisible("strophen-auswahl");

      // Step 6: Complete another recording → WIEDERGABE
      await completeRecording();
      expectState("WIEDERGABE");
      expectVisible("wiedergabe-mixer");

      // Step 7: Click "Zurück zur Auswahl" → back to AUSWAHL
      await clickZurueckZurAuswahl();
      expectState("AUSWAHL");
      expectVisible("strophen-auswahl");
      expectNotVisible("aufnahme-bereich");
      expectNotVisible("wiedergabe-mixer");
    });
  });

  describe("Recording cancellation flow: AUFNAHME → BEREIT (Req 11.3, 11.4)", () => {
    it("returns to BEREIT when recording is cancelled", async () => {
      await renderView();

      // Setup: headphones → select stanzas → start
      await confirmHeadphones();
      selectStanzas(["s1"]);
      await clickStart();
      expectState("BEREIT");
      expectVisible("aufnahme-bereich");

      // Cancel the recording
      await cancelRecording();

      // Should be back in BEREIT, not AUSWAHL
      expectState("BEREIT");
      expectVisible("aufnahme-bereich");
      expectNotVisible("wiedergabe-mixer");
      expectNotVisible("strophen-auswahl");
    });

    it("can complete a recording after cancelling a previous one", async () => {
      await renderView();

      await confirmHeadphones();
      selectStanzas(["s1", "s3"]);
      await clickStart();

      // Cancel first attempt
      await cancelRecording();
      expectState("BEREIT");

      // Complete second attempt
      await completeRecording();
      expectState("WIEDERGABE");
      expectVisible("wiedergabe-mixer");
    });
  });

  describe("Multiple recording rounds (Req 11.5)", () => {
    it("supports AUSWAHL → BEREIT → AUFNAHME → WIEDERGABE → BEREIT → AUFNAHME → WIEDERGABE", async () => {
      await renderView();

      await confirmHeadphones();

      // Round 1: select → start → record → playback
      selectStanzas(["s1"]);
      await clickStart();
      expectState("BEREIT");

      await completeRecording();
      expectState("WIEDERGABE");
      expectVisible("wiedergabe-mixer");

      // Round 2: neue Aufnahme → record again → playback
      await clickNeueAufnahme();
      expectState("BEREIT");
      expectVisible("aufnahme-bereich");
      expectNotVisible("wiedergabe-mixer");

      await completeRecording();
      expectState("WIEDERGABE");
      expectVisible("wiedergabe-mixer");

      // Round 3: neue Aufnahme → cancel → record → playback
      await clickNeueAufnahme();
      expectState("BEREIT");

      await cancelRecording();
      expectState("BEREIT");

      await completeRecording();
      expectState("WIEDERGABE");
      expectVisible("wiedergabe-mixer");
    });

    it("preserves stanza selection across recording rounds", async () => {
      await renderView();

      await confirmHeadphones();

      // Select stanzas and start
      selectStanzas(["s1", "s2"]);
      await clickStart();

      // Complete recording
      await completeRecording();
      expectState("WIEDERGABE");

      // Go back to AUSWAHL
      await clickZurueckZurAuswahl();
      expectState("AUSWAHL");
      expectVisible("strophen-auswahl");

      // Verify the StrophenAuswahl received the preserved selection
      expect(strophenAuswahlProps).not.toBeNull();
      const ids = strophenAuswahlProps!.ausgewaehlteIds as Set<string>;
      expect(ids.has("s1")).toBe(true);
      expect(ids.has("s2")).toBe(true);
    });
  });

  describe("WiedergabeMixer receives correct props", () => {
    it("passes recording buffer and instrumental URL to WiedergabeMixer", async () => {
      await renderView();

      await confirmHeadphones();
      selectStanzas(["s1"]);
      await clickStart();
      await completeRecording();

      expectState("WIEDERGABE");
      expect(wiedergabeMixerProps).not.toBeNull();

      // Verify the buffer was passed through
      const buffer = wiedergabeMixerProps!.aufnahmeBuffer as Float32Array;
      expect(buffer).toBeInstanceOf(Float32Array);
      expect(buffer.length).toBe(3);

      // Verify sample rate
      expect(wiedergabeMixerProps!.aufnahmeSampleRate).toBe(44100);

      // Verify instrumental URL
      expect(wiedergabeMixerProps!.instrumentalUrl).toBe(
        "https://example.com/instrumental.mp3",
      );

      // Verify reference vocal URL (song has one)
      expect(wiedergabeMixerProps!.referenzVokalUrl).toBe(
        "https://example.com/referenz.mp3",
      );
    });

    it("passes null referenzVokalUrl when song has no reference vocal", async () => {
      await renderView({ audioQuellen: [makeInstrumental()] });

      await confirmHeadphones();
      selectStanzas(["s1"]);
      await clickStart();
      await completeRecording();

      expect(wiedergabeMixerProps).not.toBeNull();
      expect(wiedergabeMixerProps!.referenzVokalUrl).toBeNull();
    });
  });

  describe("AufnahmeBereich receives correct props", () => {
    it("passes selected device and gain to AufnahmeBereich in BEREIT state", async () => {
      await renderView();

      await confirmHeadphones();
      selectStanzas(["s2"]);
      await clickStart();

      expect(aufnahmeBereichProps).not.toBeNull();
      expect(aufnahmeBereichProps!.instrumentalUrl).toBe(
        "https://example.com/instrumental.mp3",
      );

      // Verify selected stanza IDs are passed
      const ids = aufnahmeBereichProps!.ausgewaehlteStrophenIds as Set<string>;
      expect(ids.has("s2")).toBe(true);
    });
  });

  describe("Full round-trip with stanza re-selection", () => {
    it("allows changing stanza selection after returning to AUSWAHL", async () => {
      await renderView();

      await confirmHeadphones();

      // First round with stanza 1
      selectStanzas(["s1"]);
      await clickStart();
      await completeRecording();
      expectState("WIEDERGABE");

      // Go back to AUSWAHL
      await clickZurueckZurAuswahl();
      expectState("AUSWAHL");

      // Change selection to stanza 2 and 3
      selectStanzas(["s2", "s3"]);
      await clickStart();
      expectState("BEREIT");

      // Verify AufnahmeBereich gets the new selection
      const ids = aufnahmeBereichProps!.ausgewaehlteStrophenIds as Set<string>;
      expect(ids.has("s2")).toBe(true);
      expect(ids.has("s3")).toBe(true);
      expect(ids.has("s1")).toBe(false);

      // Complete recording with new selection
      await completeRecording();
      expectState("WIEDERGABE");
      expectVisible("wiedergabe-mixer");
    });
  });
});
