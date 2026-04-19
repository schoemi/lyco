/**
 * @vitest-environment jsdom
 */

/**
 * Unit tests for StrophenAuswahl component
 * (src/components/phrase-trainer/strophen-auswahl.tsx)
 *
 * Tests: rendering of all stanzas, checkbox interaction, disabled state
 * for stanzas without timecodes, start button activation, select/deselect all,
 * empty stanzas list.
 *
 * Validates: Requirements 1.1, 1.2, 1.5
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { StrophenAuswahl } from "@/components/phrase-trainer/strophen-auswahl";
import type { StropheDetail, MarkupResponse } from "@/types/song";

afterEach(() => {
  cleanup();
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

function makeStrophe(
  overrides: Partial<StropheDetail> & { id: string; name: string; orderIndex: number },
): StropheDetail {
  return {
    progress: 0,
    notiz: null,
    analyse: null,
    istInstrumental: false,
    zeilen: [],
    markups: [],
    ...overrides,
  };
}

/** A strophe with a valid timecode (selectable) */
function makeSelectableStrophe(id: string, name: string, orderIndex: number, timecodeMs = 0): StropheDetail {
  return makeStrophe({
    id,
    name,
    orderIndex,
    markups: [makeTimecodeMarkup(timecodeMs)],
  });
}

/** A strophe without a timecode (not selectable) */
function makeUnselectableStrophe(id: string, name: string, orderIndex: number): StropheDetail {
  return makeStrophe({ id, name, orderIndex, markups: [] });
}

function renderComponent(props?: Partial<{
  strophen: StropheDetail[];
  ausgewaehlteIds: Set<string>;
  onAuswahlAendern: (ids: Set<string>) => void;
  onStarten: () => void;
}>) {
  const defaultProps = {
    strophen: [],
    ausgewaehlteIds: new Set<string>(),
    onAuswahlAendern: vi.fn(),
    onStarten: vi.fn(),
    ...props,
  };
  return {
    ...render(React.createElement(StrophenAuswahl, defaultProps)),
    onAuswahlAendern: defaultProps.onAuswahlAendern,
    onStarten: defaultProps.onStarten,
  };
}

// --- Tests ---

describe("StrophenAuswahl Unit-Tests", () => {
  // --- Rendering (Req 1.1) ---

  it("renders all stanzas with their names (Req 1.1)", () => {
    const strophen = [
      makeSelectableStrophe("s1", "Strophe 1", 0, 0),
      makeSelectableStrophe("s2", "Refrain", 1, 30000),
      makeSelectableStrophe("s3", "Strophe 2", 2, 60000),
    ];

    renderComponent({ strophen });

    expect(screen.getByText("Strophe 1")).toBeDefined();
    expect(screen.getByText("Refrain")).toBeDefined();
    expect(screen.getByText("Strophe 2")).toBeDefined();
  });

  it("renders stanzas sorted by orderIndex", () => {
    const strophen = [
      makeSelectableStrophe("s3", "Third", 2, 60000),
      makeSelectableStrophe("s1", "First", 0, 0),
      makeSelectableStrophe("s2", "Second", 1, 30000),
    ];

    const { container } = renderComponent({ strophen });
    const items = container.querySelectorAll("li");

    expect(within(items[0] as HTMLElement).getByText("First")).toBeDefined();
    expect(within(items[1] as HTMLElement).getByText("Second")).toBeDefined();
    expect(within(items[2] as HTMLElement).getByText("Third")).toBeDefined();
  });

  it("filters out instrumental stanzas", () => {
    const strophen = [
      makeSelectableStrophe("s1", "Verse", 0, 0),
      makeStrophe({ id: "s2", name: "Instrumental Break", orderIndex: 1, istInstrumental: true }),
    ];

    renderComponent({ strophen });

    expect(screen.getByText("Verse")).toBeDefined();
    expect(screen.queryByText("Instrumental Break")).toBeNull();
  });

  it('shows "Keine Texte vorhanden" when stanzas list is empty', () => {
    renderComponent({ strophen: [] });
    expect(screen.getByText("Keine Texte vorhanden")).toBeDefined();
  });

  it('shows "Keine Texte vorhanden" when all stanzas are instrumental', () => {
    const strophen = [
      makeStrophe({ id: "s1", name: "Intro", orderIndex: 0, istInstrumental: true }),
    ];

    renderComponent({ strophen });
    expect(screen.getByText("Keine Texte vorhanden")).toBeDefined();
  });

  // --- Checkbox interaction (Req 1.2) ---

  it("renders checkboxes for each stanza (Req 1.2)", () => {
    const strophen = [
      makeSelectableStrophe("s1", "Strophe 1", 0),
      makeSelectableStrophe("s2", "Strophe 2", 1, 30000),
    ];

    renderComponent({ strophen });

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBe(2);
  });

  it("checks the checkbox for selected stanzas", () => {
    const strophen = [
      makeSelectableStrophe("s1", "Strophe 1", 0),
      makeSelectableStrophe("s2", "Strophe 2", 1, 30000),
    ];

    renderComponent({
      strophen,
      ausgewaehlteIds: new Set(["s1"]),
    });

    const cb1 = screen.getByLabelText("Strophe 1") as HTMLInputElement;
    const cb2 = screen.getByLabelText("Strophe 2") as HTMLInputElement;

    expect(cb1.checked).toBe(true);
    expect(cb2.checked).toBe(false);
  });

  it("calls onAuswahlAendern when a checkbox is toggled (Req 1.2)", () => {
    const strophen = [
      makeSelectableStrophe("s1", "Strophe 1", 0),
      makeSelectableStrophe("s2", "Strophe 2", 1, 30000),
    ];

    const { onAuswahlAendern } = renderComponent({
      strophen,
      ausgewaehlteIds: new Set<string>(),
    });

    const cb1 = screen.getByLabelText("Strophe 1");
    fireEvent.click(cb1);

    expect(onAuswahlAendern).toHaveBeenCalledTimes(1);
    const calledWith = onAuswahlAendern.mock.calls[0][0] as Set<string>;
    expect(calledWith.has("s1")).toBe(true);
  });

  it("calls onAuswahlAendern to deselect when a selected checkbox is toggled", () => {
    const strophen = [
      makeSelectableStrophe("s1", "Strophe 1", 0),
    ];

    const { onAuswahlAendern } = renderComponent({
      strophen,
      ausgewaehlteIds: new Set(["s1"]),
    });

    const cb1 = screen.getByLabelText("Strophe 1");
    fireEvent.click(cb1);

    expect(onAuswahlAendern).toHaveBeenCalledTimes(1);
    const calledWith = onAuswahlAendern.mock.calls[0][0] as Set<string>;
    expect(calledWith.has("s1")).toBe(false);
  });

  // --- Disabled state for stanzas without timecodes (Req 1.5) ---

  it("disables checkbox for stanzas without timecodes (Req 1.5)", () => {
    const strophen = [
      makeSelectableStrophe("s1", "With Timecode", 0),
      makeUnselectableStrophe("s2", "Without Timecode", 1),
    ];

    renderComponent({ strophen });

    const cbWith = screen.getByLabelText("With Timecode") as HTMLInputElement;
    const cbWithout = screen.getByLabelText(/Without Timecode/) as HTMLInputElement;

    expect(cbWith.disabled).toBe(false);
    expect(cbWithout.disabled).toBe(true);
  });

  it('shows "Timecode erforderlich" hint for stanzas without timecodes (Req 1.5)', () => {
    const strophen = [
      makeSelectableStrophe("s1", "Verse 1", 0),
      makeUnselectableStrophe("s2", "Verse 2", 1),
    ];

    renderComponent({ strophen });

    expect(screen.getByText("Timecode erforderlich")).toBeDefined();
  });

  it("includes timecode hint in aria-label for disabled stanzas", () => {
    const strophen = [
      makeUnselectableStrophe("s1", "No TC Strophe", 0),
    ];

    renderComponent({ strophen });

    const cb = screen.getByLabelText("No TC Strophe – Timecode erforderlich");
    expect(cb).toBeDefined();
  });

  // --- Start button ---

  it("disables start button when no stanzas are selected", () => {
    const strophen = [
      makeSelectableStrophe("s1", "Strophe 1", 0),
    ];

    renderComponent({ strophen, ausgewaehlteIds: new Set<string>() });

    const startBtn = screen.getByRole("button", { name: /Übung starten/i });
    expect((startBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it("enables start button when at least one stanza is selected", () => {
    const strophen = [
      makeSelectableStrophe("s1", "Strophe 1", 0),
    ];

    renderComponent({ strophen, ausgewaehlteIds: new Set(["s1"]) });

    const startBtn = screen.getByRole("button", { name: /Übung starten/i });
    expect((startBtn as HTMLButtonElement).disabled).toBe(false);
  });

  it("calls onStarten when start button is clicked", () => {
    const strophen = [
      makeSelectableStrophe("s1", "Strophe 1", 0),
    ];

    const { onStarten } = renderComponent({
      strophen,
      ausgewaehlteIds: new Set(["s1"]),
    });

    const startBtn = screen.getByRole("button", { name: /Übung starten/i });
    fireEvent.click(startBtn);

    expect(onStarten).toHaveBeenCalledTimes(1);
  });

  // --- "Alle auswählen" / "Alle abwählen" buttons ---

  it('"Alle auswählen" selects all stanzas with timecodes', () => {
    const strophen = [
      makeSelectableStrophe("s1", "Verse 1", 0),
      makeSelectableStrophe("s2", "Verse 2", 1, 30000),
      makeUnselectableStrophe("s3", "No TC", 2),
    ];

    const { onAuswahlAendern } = renderComponent({
      strophen,
      ausgewaehlteIds: new Set<string>(),
    });

    const alleBtn = screen.getByRole("button", { name: /Alle auswählen/i });
    fireEvent.click(alleBtn);

    expect(onAuswahlAendern).toHaveBeenCalledTimes(1);
    const calledWith = onAuswahlAendern.mock.calls[0][0] as Set<string>;
    expect(calledWith.has("s1")).toBe(true);
    expect(calledWith.has("s2")).toBe(true);
    expect(calledWith.has("s3")).toBe(false);
  });

  it('"Alle abwählen" deselects all stanzas', () => {
    const strophen = [
      makeSelectableStrophe("s1", "Verse 1", 0),
      makeSelectableStrophe("s2", "Verse 2", 1, 30000),
    ];

    const { onAuswahlAendern } = renderComponent({
      strophen,
      ausgewaehlteIds: new Set(["s1", "s2"]),
    });

    const abwaehlenBtn = screen.getByRole("button", { name: /Alle abwählen/i });
    fireEvent.click(abwaehlenBtn);

    expect(onAuswahlAendern).toHaveBeenCalledTimes(1);
    const calledWith = onAuswahlAendern.mock.calls[0][0] as Set<string>;
    expect(calledWith.size).toBe(0);
  });

  it('"Alle abwählen" is disabled when no stanzas are selected', () => {
    const strophen = [
      makeSelectableStrophe("s1", "Verse 1", 0),
    ];

    renderComponent({ strophen, ausgewaehlteIds: new Set<string>() });

    const abwaehlenBtn = screen.getByRole("button", { name: /Alle abwählen/i });
    expect((abwaehlenBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('"Alle auswählen" is disabled when no stanzas have timecodes', () => {
    const strophen = [
      makeUnselectableStrophe("s1", "No TC 1", 0),
      makeUnselectableStrophe("s2", "No TC 2", 1),
    ];

    renderComponent({ strophen });

    const alleBtn = screen.getByRole("button", { name: /Alle auswählen/i });
    expect((alleBtn as HTMLButtonElement).disabled).toBe(true);
  });
});
