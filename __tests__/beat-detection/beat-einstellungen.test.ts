/**
 * @vitest-environment jsdom
 */

/**
 * Unit-Tests für Beat-Einstellungen-Komponenten
 *
 * Testen: Modi-Anzeige, Controls-Wechsel, Hinweise, Fortschrittsindikator
 *
 * Anforderungen: 1.1, 1.4, 1.5, 2.3, 2.5
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import BeatEinstellungen from "@/components/songs/beat-einstellungen";
import type { AudioQuelleResponse } from "@/types/audio";
import type { BeatErgebnisResponse } from "@/types/beat-detection";

afterEach(() => {
  cleanup();
});

// --- Test data ---

const instrumentalQuelle: AudioQuelleResponse = {
  id: "aq-1",
  url: "https://example.com/instrumental.mp3",
  typ: "MP3" as never,
  label: "Instrumental",
  orderIndex: 0,
  rolle: "INSTRUMENTAL" as never,
};

const standardQuelle: AudioQuelleResponse = {
  id: "aq-2",
  url: "https://example.com/standard.mp3",
  typ: "MP3" as never,
  label: "Standard",
  orderIndex: 1,
  rolle: "STANDARD" as never,
};

const sampleBeatErgebnis: BeatErgebnisResponse = {
  id: "beat-1",
  songId: "song-1",
  bpm: 120,
  methode: "AUTOMATISCH",
  konfidenz: 85,
  beatPositionenMs: [0, 500, 1000, 1500],
  frequenzUntergrenze: 60,
  frequenzObergrenze: 200,
};

// Mock fetch globally
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ beatErgebnis: null }),
  }));
});

describe("BeatEinstellungen", () => {
  // --- Requirement 1.1: Collapsible section with two modes ---

  it("renders as a collapsible section with 'Beat-Einstellungen' title", () => {
    render(
      React.createElement(BeatEinstellungen, {
        songId: "song-1",
        audioQuellen: [instrumentalQuelle],
        initialBeatErgebnis: null,
      }),
    );

    expect(screen.getByText("Beat-Einstellungen")).toBeTruthy();
    // Content should be hidden initially
    expect(screen.queryByText("Erkennungsmodus")).toBeNull();
  });

  it("expands when clicked and shows mode selection", () => {
    render(
      React.createElement(BeatEinstellungen, {
        songId: "song-1",
        audioQuellen: [instrumentalQuelle],
        initialBeatErgebnis: null,
      }),
    );

    fireEvent.click(screen.getByText("Beat-Einstellungen"));
    expect(screen.getByText("Erkennungsmodus")).toBeTruthy();
    expect(screen.getByText("Automatisch erkennen")).toBeTruthy();
    expect(screen.getByText("Manuell eingeben")).toBeTruthy();
  });

  // --- Requirement 1.4: Disable automatic mode when no instrumental ---

  it("disables automatic mode when no instrumental track is available", () => {
    render(
      React.createElement(BeatEinstellungen, {
        songId: "song-1",
        audioQuellen: [standardQuelle],
        initialBeatErgebnis: null,
      }),
    );

    fireEvent.click(screen.getByText("Beat-Einstellungen"));

    const autoButton = screen.getByText("Automatisch erkennen");
    expect(autoButton.hasAttribute("disabled")).toBe(true);
  });

  it("shows hint text when no instrumental track is available", () => {
    render(
      React.createElement(BeatEinstellungen, {
        songId: "song-1",
        audioQuellen: [standardQuelle],
        initialBeatErgebnis: null,
      }),
    );

    fireEvent.click(screen.getByText("Beat-Einstellungen"));

    expect(
      screen.getByText(/Für die automatische Erkennung wird eine Instrumental-Spur benötigt/),
    ).toBeTruthy();
  });

  // --- Requirement 1.5: Mode switching shows/hides controls ---

  it("shows frequency controls in automatic mode", () => {
    render(
      React.createElement(BeatEinstellungen, {
        songId: "song-1",
        audioQuellen: [instrumentalQuelle],
        initialBeatErgebnis: null,
      }),
    );

    fireEvent.click(screen.getByText("Beat-Einstellungen"));

    // Default mode should be AUTOMATISCH when instrumental is available
    expect(screen.getByText("Frequenzbereich (Hz)")).toBeTruthy();
  });

  it("shows BPM input in manual mode", () => {
    render(
      React.createElement(BeatEinstellungen, {
        songId: "song-1",
        audioQuellen: [instrumentalQuelle],
        initialBeatErgebnis: null,
      }),
    );

    fireEvent.click(screen.getByText("Beat-Einstellungen"));
    fireEvent.click(screen.getByText("Manuell eingeben"));

    expect(screen.getByText("BPM-Wert")).toBeTruthy();
    expect(screen.queryByText("Frequenzbereich (Hz)")).toBeNull();
  });

  it("switches back to frequency controls when switching to automatic mode", () => {
    render(
      React.createElement(BeatEinstellungen, {
        songId: "song-1",
        audioQuellen: [instrumentalQuelle],
        initialBeatErgebnis: null,
      }),
    );

    fireEvent.click(screen.getByText("Beat-Einstellungen"));
    fireEvent.click(screen.getByText("Manuell eingeben"));
    fireEvent.click(screen.getByText("Automatisch erkennen"));

    expect(screen.getByText("Frequenzbereich (Hz)")).toBeTruthy();
    expect(screen.queryByText("BPM-Wert")).toBeNull();
  });

  // --- Requirement 2.5: Show existing result ---

  it("displays existing beat result when available", () => {
    render(
      React.createElement(BeatEinstellungen, {
        songId: "song-1",
        audioQuellen: [instrumentalQuelle],
        initialBeatErgebnis: sampleBeatErgebnis,
      }),
    );

    fireEvent.click(screen.getByText("Beat-Einstellungen"));

    expect(screen.getByText("120 BPM")).toBeTruthy();
    expect(screen.getByText("Automatisch")).toBeTruthy();
    expect(screen.getByText("Konfidenz: 85%")).toBeTruthy();
  });

  // --- Requirement 2.3: Progress indicator ---

  it("shows 'Erneut erkennen' button when result already exists", () => {
    render(
      React.createElement(BeatEinstellungen, {
        songId: "song-1",
        audioQuellen: [instrumentalQuelle],
        initialBeatErgebnis: sampleBeatErgebnis,
      }),
    );

    fireEvent.click(screen.getByText("Beat-Einstellungen"));

    expect(screen.getByText("Erneut erkennen")).toBeTruthy();
  });

  it("defaults to MANUELL mode when no instrumental track", () => {
    render(
      React.createElement(BeatEinstellungen, {
        songId: "song-1",
        audioQuellen: [standardQuelle],
        initialBeatErgebnis: null,
      }),
    );

    fireEvent.click(screen.getByText("Beat-Einstellungen"));

    // Should show BPM input since default is MANUELL
    expect(screen.getByText("BPM-Wert")).toBeTruthy();
  });
});
