/**
 * @vitest-environment jsdom
 */

/**
 * Unit-Tests für Akkord-Eingabe im ZeileEditor
 *
 * Testen: Leer-Akkord-Button, Schnellzugriff-Buttons, Cursorposition,
 * Toolbar-Sichtbarkeit bei showChords=true/false
 *
 * Anforderungen: 8.1, 8.2, 8.3, 8.4
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";

// --- Mock child components to isolate ZeileEditor logic ---

vi.mock("@/components/ui/iconify-icon", () => ({
  AppIcon: ({ icon, ...props }: { icon: string; [key: string]: unknown }) =>
    React.createElement("span", { "data-testid": `icon-${icon}`, ...props }),
}));

vi.mock("@/components/songs/zeile-tag-input", () => ({
  ZeileTagInput: (props: Record<string, unknown>) =>
    React.createElement("input", {
      "data-testid": "zeile-tag-input",
      value: props.value as string,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        (props.onChange as (val: string) => void)?.(e.target.value),
    }),
}));

vi.mock("@/components/songs/zeile-markup-view", () => ({
  ZeileMarkupView: ({ text }: { text: string }) => React.createElement("span", null, text),
}));

vi.mock("@/lib/vocal-tag/chordpro-parser", () => ({
  stripChordPro: (text: string) => text,
}));

import ZeileEditor from "@/components/songs/zeile-editor";
import type { ZeileDetail } from "@/types/song";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// Mock fetch globally — tag definitions return empty so we get plain <input> instead of ZeileTagInput
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    }),
  );
});

// --- Test data ---

const sampleZeilen: ZeileDetail[] = [
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
  {
    id: "zeile-2",
    text: "[C]Second [F]line [Dm]here",
    uebersetzung: null,
    orderIndex: 1,
    istKommentar: false,
    startTakt: null,
    endTakt: null,
    markups: [],
  },
];

const zeilenWithoutChords: ZeileDetail[] = [
  {
    id: "zeile-1",
    text: "Hello World",
    uebersetzung: null,
    orderIndex: 0,
    istKommentar: false,
    startTakt: null,
    endTakt: null,
    markups: [],
  },
];

function renderZeileEditor(
  props?: Partial<{
    zeilen: ZeileDetail[];
    showChords: boolean;
    editing: boolean;
    onZeilenChanged: (zeilen: ZeileDetail[]) => void;
  }>,
) {
  const defaultProps = {
    songId: "song-1",
    stropheId: "strophe-1",
    zeilen: sampleZeilen,
    onZeilenChanged: vi.fn(),
    editing: true,
    showChords: false,
    ...props,
  };
  return render(React.createElement(ZeileEditor, defaultProps));
}

describe("Akkord-Eingabe im ZeileEditor", () => {
  // --- Requirement 8.1: Empty chord button visible when showChords is on ---

  it("does not show chord toolbar when showChords is false", () => {
    renderZeileEditor({ showChords: false });

    // Click edit on first zeile to open edit form
    const editButton = screen.getByLabelText("Zeile 1 bearbeiten");
    fireEvent.click(editButton);

    // No chord toolbar should be visible
    const toolbar = screen.queryByRole("toolbar", { name: "Akkord-Schnellzugriff" });
    expect(toolbar).toBeNull();
  });

  it("shows chord toolbar with 'Leerer Akkord' button when showChords is true and editing a zeile", () => {
    renderZeileEditor({ showChords: true });

    // Click edit on first zeile to open edit form
    const editButton = screen.getByLabelText("Zeile 1 bearbeiten");
    fireEvent.click(editButton);

    // Chord toolbar should be visible
    const toolbar = screen.getByRole("toolbar", { name: "Akkord-Schnellzugriff" });
    expect(toolbar).toBeDefined();

    // "Leerer Akkord" button should exist
    const emptyChordButton = screen.getByLabelText("Leeren Akkord einfügen");
    expect(emptyChordButton).toBeDefined();
    expect(emptyChordButton.textContent).toContain("Leerer Akkord");
  });

  // --- Requirement 8.2: Empty chord button inserts [] ---

  it("inserts [] when 'Leerer Akkord' button is clicked", () => {
    renderZeileEditor({ showChords: true });

    // Click edit on first zeile
    const editButton = screen.getByLabelText("Zeile 1 bearbeiten");
    fireEvent.click(editButton);

    // The edit input should have the zeile text
    const textInput = screen.getByDisplayValue("[Am]Hello [G]World") as HTMLInputElement;
    expect(textInput).toBeDefined();

    // Click the empty chord button
    const emptyChordButton = screen.getByLabelText("Leeren Akkord einfügen");
    fireEvent.click(emptyChordButton);

    // The text should now contain [] inserted at cursor position (end by default)
    expect(textInput.value).toContain("[]");
  });

  // --- Requirement 8.3: Quick-access buttons for recently used chords ---

  it("shows recently used chords as quick-access buttons when showChords is true", () => {
    renderZeileEditor({ showChords: true });

    // Click edit on first zeile
    const editButton = screen.getByLabelText("Zeile 1 bearbeiten");
    fireEvent.click(editButton);

    // The toolbar should contain quick-access buttons for chords found in zeilen
    // sampleZeilen contain: Am, G, C, F, Dm
    const amButton = screen.getByLabelText("Akkord Am einfügen");
    expect(amButton).toBeDefined();
    expect(amButton.textContent).toBe("Am");

    const gButton = screen.getByLabelText("Akkord G einfügen");
    expect(gButton).toBeDefined();

    const cButton = screen.getByLabelText("Akkord C einfügen");
    expect(cButton).toBeDefined();

    const fButton = screen.getByLabelText("Akkord F einfügen");
    expect(fButton).toBeDefined();

    const dmButton = screen.getByLabelText("Akkord Dm einfügen");
    expect(dmButton).toBeDefined();
  });

  it("does not show quick-access buttons when zeilen have no chords", () => {
    renderZeileEditor({ showChords: true, zeilen: zeilenWithoutChords });

    // Click edit on first zeile
    const editButton = screen.getByLabelText("Zeile 1 bearbeiten");
    fireEvent.click(editButton);

    // Toolbar should exist but only have the empty chord button
    const toolbar = screen.getByRole("toolbar", { name: "Akkord-Schnellzugriff" });
    const buttons = within(toolbar).getAllByRole("button");
    // Only the "Leerer Akkord" button
    expect(buttons.length).toBe(1);
    expect(buttons[0].textContent).toContain("Leerer Akkord");
  });

  // --- Requirement 8.4: Quick-access button inserts [Akkordname] ---

  it("inserts [Am] when the Am quick-access button is clicked", () => {
    renderZeileEditor({ showChords: true });

    // Click edit on first zeile
    const editButton = screen.getByLabelText("Zeile 1 bearbeiten");
    fireEvent.click(editButton);

    const textInput = screen.getByDisplayValue("[Am]Hello [G]World") as HTMLInputElement;
    const originalValue = textInput.value;

    // Click the Am quick-access button
    const amButton = screen.getByLabelText("Akkord Am einfügen");
    fireEvent.click(amButton);

    // The text should now contain an additional [Am] inserted
    expect(textInput.value.length).toBeGreaterThan(originalValue.length);
    // The inserted text should include [Am]
    expect(textInput.value).toContain("[Am]");
  });

  // --- Chord toolbar in add form ---

  it("shows chord toolbar in the add zeile form when showChords is true", () => {
    renderZeileEditor({ showChords: true });

    // Click the "+ Zeile hinzufügen" button to open add form
    const addButton = screen.getByText("+ Zeile hinzufügen");
    fireEvent.click(addButton);

    // Chord toolbar should be visible in the add form
    const toolbars = screen.getAllByRole("toolbar", { name: "Akkord-Schnellzugriff" });
    expect(toolbars.length).toBeGreaterThan(0);

    // "Leerer Akkord" button should exist in the add form toolbar
    const emptyChordButton = screen.getByLabelText("Leeren Akkord einfügen");
    expect(emptyChordButton).toBeDefined();
  });

  it("does not show chord toolbar in the add zeile form when showChords is false", () => {
    renderZeileEditor({ showChords: false });

    // Click the "+ Zeile hinzufügen" button to open add form
    const addButton = screen.getByText("+ Zeile hinzufügen");
    fireEvent.click(addButton);

    // No chord toolbar should be visible
    const toolbar = screen.queryByRole("toolbar", { name: "Akkord-Schnellzugriff" });
    expect(toolbar).toBeNull();
  });
});
