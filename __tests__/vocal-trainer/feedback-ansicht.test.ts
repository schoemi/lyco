/**
 * @vitest-environment jsdom
 */

/**
 * Unit-Tests für FeedbackAnsicht
 *
 * Testen: Score-Anzeige, aria-labels, VergleichsGraph-Einbindung, Buttons
 *
 * Anforderungen: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 14.4
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { FeedbackAnsicht } from "@/components/vocal-trainer/feedback-ansicht";
import type { AnalyseErgebnis } from "@/types/vocal-trainer";

afterEach(() => {
  cleanup();
});

function makeErgebnis(overrides?: Partial<AnalyseErgebnis>): AnalyseErgebnis {
  return {
    pitchScore: 85,
    timingScore: 72,
    gesamtScore: 80,
    referenzKurve: [
      { timestampMs: 0, midiValue: 60 },
      { timestampMs: 100, midiValue: 62 },
    ],
    nutzerKurve: [
      { timestampMs: 0, midiValue: 60, abweichungCents: 10 },
      { timestampMs: 100, midiValue: 63, abweichungCents: 80 },
    ],
    ...overrides,
  };
}

describe("FeedbackAnsicht", () => {
  it("displays Gesamt-Score prominently with aria-label", () => {
    const ergebnis = makeErgebnis({ gesamtScore: 80 });
    render(
      React.createElement(FeedbackAnsicht, {
        ergebnis,
        onNeueAufnahme: vi.fn(),
        onZurueck: vi.fn(),
      }),
    );

    const gesamtEl = screen.getByLabelText("Gesamt-Score: 80 Prozent");
    expect(gesamtEl).toBeDefined();
    expect(gesamtEl.textContent).toBe("80%");
  });

  it("displays Pitch-Score with aria-label", () => {
    const ergebnis = makeErgebnis({ pitchScore: 85 });
    render(
      React.createElement(FeedbackAnsicht, {
        ergebnis,
        onNeueAufnahme: vi.fn(),
        onZurueck: vi.fn(),
      }),
    );

    const pitchEl = screen.getByLabelText("Pitch-Score: 85 Prozent");
    expect(pitchEl).toBeDefined();
    expect(pitchEl.textContent).toBe("85%");
  });

  it("displays Timing-Score with aria-label", () => {
    const ergebnis = makeErgebnis({ timingScore: 72 });
    render(
      React.createElement(FeedbackAnsicht, {
        ergebnis,
        onNeueAufnahme: vi.fn(),
        onZurueck: vi.fn(),
      }),
    );

    const timingEl = screen.getByLabelText("Timing-Score: 72 Prozent");
    expect(timingEl).toBeDefined();
    expect(timingEl.textContent).toBe("72%");
  });

  it("rounds score values to integers", () => {
    const ergebnis = makeErgebnis({
      pitchScore: 85.7,
      timingScore: 72.3,
      gesamtScore: 79.9,
    });
    render(
      React.createElement(FeedbackAnsicht, {
        ergebnis,
        onNeueAufnahme: vi.fn(),
        onZurueck: vi.fn(),
      }),
    );

    expect(screen.getByLabelText("Gesamt-Score: 80 Prozent").textContent).toBe("80%");
    expect(screen.getByLabelText("Pitch-Score: 86 Prozent").textContent).toBe("86%");
    expect(screen.getByLabelText("Timing-Score: 72 Prozent").textContent).toBe("72%");
  });

  it("embeds VergleichsGraph with referenzKurve and nutzerKurve", () => {
    const ergebnis = makeErgebnis();
    const { container } = render(
      React.createElement(FeedbackAnsicht, {
        ergebnis,
        onNeueAufnahme: vi.fn(),
        onZurueck: vi.fn(),
      }),
    );

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute("role")).toBe("img");
    expect(svg!.getAttribute("aria-label")).toContain("Pitch-Vergleich");
  });

  it("renders 'Neue Aufnahme' button that calls onNeueAufnahme", () => {
    const onNeueAufnahme = vi.fn();
    render(
      React.createElement(FeedbackAnsicht, {
        ergebnis: makeErgebnis(),
        onNeueAufnahme,
        onZurueck: vi.fn(),
      }),
    );

    const btn = screen.getByText("Neue Aufnahme");
    expect(btn).toBeDefined();
    fireEvent.click(btn);
    expect(onNeueAufnahme).toHaveBeenCalledOnce();
  });

  it("renders 'Zurück zur Song-Seite' button that calls onZurueck", () => {
    const onZurueck = vi.fn();
    render(
      React.createElement(FeedbackAnsicht, {
        ergebnis: makeErgebnis(),
        onNeueAufnahme: vi.fn(),
        onZurueck,
      }),
    );

    const btn = screen.getByText("Zurück zur Song-Seite");
    expect(btn).toBeDefined();
    fireEvent.click(btn);
    expect(onZurueck).toHaveBeenCalledOnce();
  });

  it("buttons have minimum 44x44px touch target", () => {
    const { container } = render(
      React.createElement(FeedbackAnsicht, {
        ergebnis: makeErgebnis(),
        onNeueAufnahme: vi.fn(),
        onZurueck: vi.fn(),
      }),
    );

    const buttons = container.querySelectorAll("button");
    expect(buttons.length).toBe(2);
    for (const btn of buttons) {
      expect(btn.className).toContain("min-h-[44px]");
      expect(btn.className).toContain("min-w-[44px]");
    }
  });
});
