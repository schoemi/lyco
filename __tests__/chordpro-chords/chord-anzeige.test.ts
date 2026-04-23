/**
 * @vitest-environment jsdom
 */

/**
 * Unit-Tests für ChordAnzeige-Komponente
 *
 * Testen: Akkorde korrekt positioniert, keine Akkordzeile bei Text ohne Akkorde,
 * Koexistenz mit Vocal-Tags
 *
 * Anforderungen: 9.1, 9.2, 9.3, 9.4
 */

import { describe, it, expect, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { ChordAnzeige } from "@/components/songs/chord-anzeige";

afterEach(() => {
  cleanup();
});

describe("ChordAnzeige-Komponente", () => {
  // --- Requirement 9.1: Chords positioned above the corresponding character ---

  it("renders a chord line above the text when chords are present", () => {
    const { container } = render(
      React.createElement(ChordAnzeige, { text: "[Am]Hallo [G]Welt" }),
    );

    // There should be a chord line (aria-hidden) and a text line
    const chordLine = container.querySelector("[aria-hidden='true']");
    expect(chordLine).not.toBeNull();

    // Chord names should appear in the chord line
    expect(chordLine!.textContent).toContain("Am");
    expect(chordLine!.textContent).toContain("G");
  });

  it("positions chords at the correct character position using ch units", () => {
    const { container } = render(
      React.createElement(ChordAnzeige, { text: "[Am]Hallo [G]Welt" }),
    );

    const chordLine = container.querySelector("[aria-hidden='true']");
    const chordSpans = chordLine!.querySelectorAll("span");

    // "Am" at position 0 → left: 0ch
    expect(chordSpans[0].textContent).toBe("Am");
    expect(chordSpans[0].style.left).toBe("0ch");

    // "G" at position 6 (after "Hallo ") → left: 6ch
    expect(chordSpans[1].textContent).toBe("G");
    expect(chordSpans[1].style.left).toBe("6ch");
  });

  it("positions a chord at a mid-word position correctly", () => {
    // "[C]Hal[Dm]lo" → plainText "Hallo", C at 0, Dm at 3
    const { container } = render(
      React.createElement(ChordAnzeige, { text: "[C]Hal[Dm]lo" }),
    );

    const chordLine = container.querySelector("[aria-hidden='true']");
    const chordSpans = chordLine!.querySelectorAll("span");

    expect(chordSpans[0].textContent).toBe("C");
    expect(chordSpans[0].style.left).toBe("0ch");

    expect(chordSpans[1].textContent).toBe("Dm");
    expect(chordSpans[1].style.left).toBe("3ch");
  });

  // --- Requirement 9.2: Chords in a separate line above the text ---

  it("renders the plain text without chord notation in the text line", () => {
    render(React.createElement(ChordAnzeige, { text: "[Am]Hallo [G]Welt" }));

    // The plain text "Hallo Welt" should be visible
    expect(screen.getByText("Hallo Welt")).toBeDefined();
  });

  it("renders chord line and text line as separate elements", () => {
    const { container } = render(
      React.createElement(ChordAnzeige, { text: "[Am]Hallo [G]Welt" }),
    );

    // The root div should have two child divs: chord line + text line
    const rootDiv = container.firstElementChild!;
    const children = rootDiv.children;
    expect(children.length).toBe(2);

    // First child is the chord line (aria-hidden)
    expect(children[0].getAttribute("aria-hidden")).toBe("true");

    // Second child is the text line
    expect(children[1].textContent).toBe("Hallo Welt");
  });

  // --- Requirement 9.4: No chord line when no chords present ---

  it("does not render a chord line when text has no chords", () => {
    const { container } = render(
      React.createElement(ChordAnzeige, { text: "Kein Akkord hier" }),
    );

    // No aria-hidden chord line should exist
    const chordLine = container.querySelector("[aria-hidden='true']");
    expect(chordLine).toBeNull();
  });

  it("renders plain text correctly when no chords are present", () => {
    render(React.createElement(ChordAnzeige, { text: "Einfacher Text" }));

    expect(screen.getByText("Einfacher Text")).toBeDefined();
  });

  it("renders only one child div (text line) when no chords are present", () => {
    const { container } = render(
      React.createElement(ChordAnzeige, { text: "Nur Text" }),
    );

    const rootDiv = container.firstElementChild!;
    // Should only have the text span, no chord line
    const ariaHiddenElements = rootDiv.querySelectorAll("[aria-hidden='true']");
    expect(ariaHiddenElements.length).toBe(0);
  });

  // --- Requirement 9.3: Coexistence with vocal tags ---

  it("preserves vocal tag notation in the rendered text", () => {
    // Vocal tags use {tag: wert} notation — ChordAnzeige should not strip them
    render(
      React.createElement(ChordAnzeige, {
        text: "[Am]Hallo {Kopfstimme: Welt}",
      }),
    );

    // The plain text should still contain the vocal tag notation
    expect(screen.getByText("Hallo {Kopfstimme: Welt}")).toBeDefined();
  });

  it("renders chords above text that contains vocal tags", () => {
    const { container } = render(
      React.createElement(ChordAnzeige, {
        text: "[C]Text {Bruststimme: mit} [G]Tags",
      }),
    );

    // Chord line should exist with correct chords
    const chordLine = container.querySelector("[aria-hidden='true']");
    expect(chordLine).not.toBeNull();
    expect(chordLine!.textContent).toContain("C");
    expect(chordLine!.textContent).toContain("G");

    // Plain text should preserve vocal tags
    const textContent = "Text {Bruststimme: mit} Tags";
    expect(screen.getByText(textContent)).toBeDefined();
  });

  it("positions chords correctly even when vocal tags are in the text", () => {
    // "[Am]{tag: value} [G]rest" → plainText "{tag: value} rest"
    // Am at position 0, G at position 13 ("{tag: value} " = 13 chars)
    const { container } = render(
      React.createElement(ChordAnzeige, {
        text: "[Am]{tag: value} [G]rest",
      }),
    );

    const chordLine = container.querySelector("[aria-hidden='true']");
    const chordSpans = chordLine!.querySelectorAll("span");

    expect(chordSpans[0].textContent).toBe("Am");
    expect(chordSpans[0].style.left).toBe("0ch");

    expect(chordSpans[1].textContent).toBe("G");
    expect(chordSpans[1].style.left).toBe("13ch");
  });

  // --- Edge cases ---

  it("renders empty chord placeholder as · (middle dot)", () => {
    const { container } = render(
      React.createElement(ChordAnzeige, { text: "[]Platzhalter" }),
    );

    const chordLine = container.querySelector("[aria-hidden='true']");
    expect(chordLine).not.toBeNull();
    // Empty chord name renders as "·"
    expect(chordLine!.textContent).toContain("·");
  });

  it("handles complex chord names correctly", () => {
    const { container } = render(
      React.createElement(ChordAnzeige, { text: "[Cmaj7#11]Start [Bb/D]End" }),
    );

    const chordLine = container.querySelector("[aria-hidden='true']");
    expect(chordLine!.textContent).toContain("Cmaj7#11");
    expect(chordLine!.textContent).toContain("Bb/D");
  });

  it("handles text with a single chord", () => {
    const { container } = render(
      React.createElement(ChordAnzeige, { text: "[Em]Alleinstehend" }),
    );

    const chordLine = container.querySelector("[aria-hidden='true']");
    const chordSpans = chordLine!.querySelectorAll("span");
    expect(chordSpans.length).toBe(1);
    expect(chordSpans[0].textContent).toBe("Em");
    expect(chordSpans[0].style.left).toBe("0ch");

    expect(screen.getByText("Alleinstehend")).toBeDefined();
  });

  it("handles empty text", () => {
    const { container } = render(
      React.createElement(ChordAnzeige, { text: "" }),
    );

    // No chord line for empty text
    const chordLine = container.querySelector("[aria-hidden='true']");
    expect(chordLine).toBeNull();
  });
});
