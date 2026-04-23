/**
 * @vitest-environment jsdom
 */

/**
 * Unit-Tests für Akkord-Toggle im StropheEditor
 *
 * Testen: Toggle-Button vorhanden, Standard aus, Ein-/Ausschalten,
 * aria-pressed Attribut, showChords wird an ZeileEditor weitergegeben
 *
 * Anforderungen: 7.1, 7.2, 7.3, 7.4
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

// --- Mock child components to isolate StropheEditor logic ---

vi.mock("@/components/ui/iconify-icon", () => ({
  AppIcon: ({ icon, ...props }: { icon: string; [key: string]: unknown }) =>
    React.createElement("span", { "data-testid": `icon-${icon}`, ...props }),
}));

// Track showChords prop passed to ZeileEditor
let capturedZeileEditorProps: Array<Record<string, unknown>> = [];

vi.mock("@/components/songs/zeile-editor", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    capturedZeileEditorProps.push(props);
    return React.createElement("div", { "data-testid": "zeile-editor" });
  },
}));

vi.mock("@/components/songs/timecode-eingabe", () => ({
  __esModule: true,
  default: () => React.createElement("div", { "data-testid": "timecode-eingabe" }),
}));

vi.mock("@/components/songs/strophen-view-toggle", () => ({
  StrophenViewToggle: () => React.createElement("div", { "data-testid": "view-toggle" }),
}));

vi.mock("@/components/songs/zeile-markup-view", () => ({
  ZeileMarkupView: ({ text }: { text: string }) => React.createElement("span", null, text),
}));

vi.mock("@/lib/vocal-tag/chordpro-parser", () => ({
  stripChordPro: (text: string) => text,
}));

import StropheEditor from "@/components/songs/strophe-editor";
import type { StropheDetail } from "@/types/song";

afterEach(() => {
  cleanup();
  capturedZeileEditorProps = [];
});

// Mock fetch globally
beforeEach(() => {
  capturedZeileEditorProps = [];
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    }),
  );
});

// --- Test data ---

const sampleStrophe: StropheDetail = {
  id: "strophe-1",
  name: "Verse 1",
  orderIndex: 0,
  progress: 0,
  notiz: null,
  analyse: null,
  istInstrumental: false,
  startTakt: null,
  endTakt: null,
  zeilen: [
    {
      id: "zeile-1",
      text: "[Am]Hello [G]World",
      uebersetzung: null,
      orderIndex: 0,
      istKommentar: false,
      startTakt: null,
      endTakt: null,
      markups: [],
    },
  ],
  markups: [],
};

function renderStropheEditor(
  props?: Partial<{
    strophen: StropheDetail[];
    editing: boolean;
    onStrophenChanged: (strophen: StropheDetail[]) => void;
  }>,
) {
  const defaultProps = {
    songId: "song-1",
    strophen: [sampleStrophe],
    onStrophenChanged: vi.fn(),
    editing: true,
    ...props,
  };
  return render(React.createElement(StropheEditor, defaultProps));
}

describe("Akkord-Toggle im StropheEditor", () => {
  // --- Requirement 7.1: Toggle button exists ---

  it("renders an 'Akkorde' toggle button in edit mode", () => {
    renderStropheEditor();

    const toggleButton = screen.getByLabelText("Akkordanzeige umschalten");
    expect(toggleButton).toBeDefined();
    expect(toggleButton.textContent).toContain("Akkorde");
  });

  // --- Requirement 7.2: Default off ---

  it("has the toggle defaulting to off (aria-pressed=false)", () => {
    renderStropheEditor();

    const toggleButton = screen.getByLabelText("Akkordanzeige umschalten");
    expect(toggleButton.getAttribute("aria-pressed")).toBe("false");
  });

  it("passes showChords=false to ZeileEditor by default", () => {
    renderStropheEditor();

    // At least one ZeileEditor should have been rendered
    expect(capturedZeileEditorProps.length).toBeGreaterThan(0);
    expect(capturedZeileEditorProps[0].showChords).toBe(false);
  });

  // --- Requirement 7.3: Toggle on ---

  it("toggles to on when clicked (aria-pressed=true)", () => {
    renderStropheEditor();

    const toggleButton = screen.getByLabelText("Akkordanzeige umschalten");
    fireEvent.click(toggleButton);

    expect(toggleButton.getAttribute("aria-pressed")).toBe("true");
  });

  it("passes showChords=true to ZeileEditor after toggling on", () => {
    renderStropheEditor();

    const toggleButton = screen.getByLabelText("Akkordanzeige umschalten");
    fireEvent.click(toggleButton);

    // Find the most recent ZeileEditor render
    const lastProps = capturedZeileEditorProps[capturedZeileEditorProps.length - 1];
    expect(lastProps.showChords).toBe(true);
  });

  // --- Requirement 7.4: Toggle off again ---

  it("toggles back to off when clicked twice (aria-pressed=false)", () => {
    renderStropheEditor();

    const toggleButton = screen.getByLabelText("Akkordanzeige umschalten");
    fireEvent.click(toggleButton); // on
    fireEvent.click(toggleButton); // off

    expect(toggleButton.getAttribute("aria-pressed")).toBe("false");
  });

  it("passes showChords=false to ZeileEditor after toggling off", () => {
    renderStropheEditor();

    const toggleButton = screen.getByLabelText("Akkordanzeige umschalten");
    fireEvent.click(toggleButton); // on
    fireEvent.click(toggleButton); // off

    const lastProps = capturedZeileEditorProps[capturedZeileEditorProps.length - 1];
    expect(lastProps.showChords).toBe(false);
  });

  // --- Toggle does not appear in read-only mode ---

  it("does not render the toggle button in read-only mode", () => {
    renderStropheEditor({ editing: false });

    const toggleButton = screen.queryByLabelText("Akkordanzeige umschalten");
    expect(toggleButton).toBeNull();
  });

  // --- Toggle applies active styling when on ---

  it("applies active styling class when toggled on", () => {
    renderStropheEditor();

    const toggleButton = screen.getByLabelText("Akkordanzeige umschalten");
    fireEvent.click(toggleButton);

    // When active, the button should have the newsong-100 background class
    expect(toggleButton.className).toContain("bg-newsong-100");
  });

  it("does not have active styling when toggled off", () => {
    renderStropheEditor();

    const toggleButton = screen.getByLabelText("Akkordanzeige umschalten");

    // Default off — should not have active styling
    expect(toggleButton.className).not.toContain("bg-newsong-100");
  });
});
