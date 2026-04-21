/**
 * @vitest-environment jsdom
 */

/**
 * Unit-Tests für ExportDialog
 *
 * Prüft Rendering, Format-Auswahl (Radio-Verhalten), Toggle-Defaults,
 * Button-Deaktivierung und open/close-Verhalten.
 *
 * Requirements: 1.1, 1.2, 1.3, 2.1, 2.2
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import ExportDialog from "@/components/songs/export-dialog";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const DEFAULT_PROPS = {
  open: true,
  songId: "song-123",
  songTitel: "Bohemian Rhapsody",
  songKuenstler: "Queen",
  onClose: vi.fn(),
};

function renderDialog(overrides?: Partial<typeof DEFAULT_PROPS>) {
  return render(
    React.createElement(ExportDialog, { ...DEFAULT_PROPS, ...overrides })
  );
}

describe("ExportDialog Unit-Tests", () => {
  // -----------------------------------------------------------------------
  // Rendering: open / close
  // -----------------------------------------------------------------------

  it("does not render when open=false", () => {
    const { container } = renderDialog({ open: false });
    expect(container.innerHTML).toBe("");
  });

  it("renders the dialog when open=true", () => {
    renderDialog();
    expect(screen.getByRole("dialog")).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // Rendering: 4 format options (Requirement 1.1)
  // -----------------------------------------------------------------------

  it("renders all 4 format options as radio buttons", () => {
    renderDialog();

    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(4);

    expect(screen.getByText("PDF")).toBeDefined();
    expect(screen.getByText("ChordPro")).toBeDefined();
    expect(screen.getByText("OnSong")).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // Rendering: 3 toggle switches (Requirement 2.1)
  // -----------------------------------------------------------------------

  it("renders 2 toggle switches initially (Kommentare only visible for PDF)", () => {
    renderDialog();

    // Switches are only visible after selecting a non-lyco format
    const chordProRadio = screen.getByText("ChordPro").closest("[role='radio']")!;
    fireEvent.click(chordProRadio);

    const switches = screen.getAllByRole("switch");
    expect(switches).toHaveLength(2);

    expect(screen.getByText("Vocal-Tags")).toBeDefined();
    expect(screen.getByText("Instrumental-Sektionen")).toBeDefined();
  });

  it("renders Kommentare and Übersetzungen toggles when PDF format is selected", () => {
    renderDialog();

    // Select PDF format
    const pdfRadio = screen.getByText("PDF").closest("[role='radio']")!;
    fireEvent.click(pdfRadio);

    const switches = screen.getAllByRole("switch");
    expect(switches).toHaveLength(4);
    expect(screen.getByText(/Kommentare/)).toBeDefined();
    expect(screen.getByText(/Übersetzungen/)).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // Toggle defaults: all enabled (Requirement 2.2)
  // -----------------------------------------------------------------------

  it("has all toggles checked by default", () => {
    renderDialog();

    // Select a format first to make toggles visible
    const chordProRadio = screen.getByText("ChordPro").closest("[role='radio']")!;
    fireEvent.click(chordProRadio);

    const switches = screen.getAllByRole("switch");
    for (const sw of switches) {
      expect(sw.getAttribute("aria-checked")).toBe("true");
    }
  });

  // -----------------------------------------------------------------------
  // Export button disabled without format selection (Requirement 1.3)
  // -----------------------------------------------------------------------

  it("disables the export button when no format is selected", () => {
    renderDialog();

    const exportBtn = screen.getByRole("button", { name: "Exportieren" });
    expect(exportBtn.hasAttribute("disabled")).toBe(true);
  });

  // -----------------------------------------------------------------------
  // Radio selection: clicking a format selects it (Requirement 1.2)
  // -----------------------------------------------------------------------

  it("selects a format when clicked", () => {
    renderDialog();

    const pdfRadio = screen.getByText("PDF").closest("[role='radio']")!;
    fireEvent.click(pdfRadio);

    expect(pdfRadio.getAttribute("aria-checked")).toBe("true");
  });

  // -----------------------------------------------------------------------
  // Radio behavior: only one format active at a time (Requirement 1.2)
  // -----------------------------------------------------------------------

  it("allows only one format to be selected at a time", () => {
    renderDialog();

    const radios = screen.getAllByRole("radio");

    // Select first format (PDF)
    fireEvent.click(radios[0]);
    expect(radios[0].getAttribute("aria-checked")).toBe("true");
    expect(radios[1].getAttribute("aria-checked")).toBe("false");
    expect(radios[2].getAttribute("aria-checked")).toBe("false");
    expect(radios[3].getAttribute("aria-checked")).toBe("false");

    // Select third format (OnSong)
    fireEvent.click(radios[2]);
    expect(radios[0].getAttribute("aria-checked")).toBe("false");
    expect(radios[1].getAttribute("aria-checked")).toBe("false");
    expect(radios[2].getAttribute("aria-checked")).toBe("true");
    expect(radios[3].getAttribute("aria-checked")).toBe("false");
  });

  // -----------------------------------------------------------------------
  // Export button enabled after format selection
  // -----------------------------------------------------------------------

  it("enables the export button after selecting a format", () => {
    renderDialog();

    const exportBtn = screen.getByRole("button", { name: "Exportieren" });
    expect(exportBtn.hasAttribute("disabled")).toBe(true);

    const pdfRadio = screen.getByText("PDF").closest("[role='radio']")!;
    fireEvent.click(pdfRadio);

    expect(exportBtn.hasAttribute("disabled")).toBe(false);
  });

  // -----------------------------------------------------------------------
  // Toggle interaction
  // -----------------------------------------------------------------------

  it("toggles a switch off when clicked", () => {
    renderDialog();

    // Select a format first to make toggles visible
    const chordProRadio = screen.getByText("ChordPro").closest("[role='radio']")!;
    fireEvent.click(chordProRadio);

    const switches = screen.getAllByRole("switch");
    const vocalTagSwitch = switches[0];

    expect(vocalTagSwitch.getAttribute("aria-checked")).toBe("true");

    fireEvent.click(vocalTagSwitch);

    expect(vocalTagSwitch.getAttribute("aria-checked")).toBe("false");
  });

  // -----------------------------------------------------------------------
  // No format selected initially
  // -----------------------------------------------------------------------

  it("has no format selected initially", () => {
    renderDialog();

    const radios = screen.getAllByRole("radio");
    for (const radio of radios) {
      expect(radio.getAttribute("aria-checked")).toBe("false");
    }
  });
});
