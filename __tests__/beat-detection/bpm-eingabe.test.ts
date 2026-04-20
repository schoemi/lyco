/**
 * @vitest-environment jsdom
 */

/**
 * Unit-Tests für BPM-Eingabe-Komponente
 *
 * Testen: Eingabefeld-Verhalten, Fehlermeldungen, Bestätigungs-Button
 *
 * Anforderungen: 4.1, 4.2, 4.3
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import BpmEingabe from "@/components/songs/bpm-eingabe";

afterEach(() => {
  cleanup();
});

describe("BpmEingabe", () => {
  // --- Requirement 4.1: Numeric input field ---

  it("renders a numeric input field with label 'BPM-Wert'", () => {
    const onBpmBestaetigt = vi.fn();
    render(React.createElement(BpmEingabe, { onBpmBestaetigt }));

    expect(screen.getByLabelText("BPM-Wert")).toBeTruthy();
    const input = screen.getByLabelText("BPM-Wert") as HTMLInputElement;
    expect(input.type).toBe("number");
  });

  it("renders a 'Bestätigen' button", () => {
    const onBpmBestaetigt = vi.fn();
    render(React.createElement(BpmEingabe, { onBpmBestaetigt }));

    expect(screen.getByText("Bestätigen")).toBeTruthy();
  });

  it("shows initial BPM value when provided", () => {
    const onBpmBestaetigt = vi.fn();
    render(
      React.createElement(BpmEingabe, { onBpmBestaetigt, initialBpm: 120 }),
    );

    const input = screen.getByLabelText("BPM-Wert") as HTMLInputElement;
    expect(input.value).toBe("120");
  });

  // --- Requirement 4.2: Valid range [20, 300] ---

  it("calls onBpmBestaetigt with valid BPM value", () => {
    const onBpmBestaetigt = vi.fn();
    render(React.createElement(BpmEingabe, { onBpmBestaetigt }));

    const input = screen.getByLabelText("BPM-Wert");
    fireEvent.change(input, { target: { value: "120" } });
    fireEvent.click(screen.getByText("Bestätigen"));

    expect(onBpmBestaetigt).toHaveBeenCalledWith(120);
  });

  it("calls onBpmBestaetigt on Enter key", () => {
    const onBpmBestaetigt = vi.fn();
    render(React.createElement(BpmEingabe, { onBpmBestaetigt }));

    const input = screen.getByLabelText("BPM-Wert");
    fireEvent.change(input, { target: { value: "100" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onBpmBestaetigt).toHaveBeenCalledWith(100);
  });

  // --- Requirement 4.3: Error message for invalid values ---

  it("shows error for empty input", () => {
    const onBpmBestaetigt = vi.fn();
    render(React.createElement(BpmEingabe, { onBpmBestaetigt }));

    fireEvent.click(screen.getByText("Bestätigen"));

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText("Bitte einen BPM-Wert eingeben")).toBeTruthy();
    expect(onBpmBestaetigt).not.toHaveBeenCalled();
  });

  it("shows error for value below 20", () => {
    const onBpmBestaetigt = vi.fn();
    render(React.createElement(BpmEingabe, { onBpmBestaetigt }));

    const input = screen.getByLabelText("BPM-Wert");
    fireEvent.change(input, { target: { value: "10" } });
    fireEvent.click(screen.getByText("Bestätigen"));

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(
      screen.getByText("BPM muss eine Ganzzahl zwischen 20 und 300 sein"),
    ).toBeTruthy();
    expect(onBpmBestaetigt).not.toHaveBeenCalled();
  });

  it("shows error for value above 300", () => {
    const onBpmBestaetigt = vi.fn();
    render(React.createElement(BpmEingabe, { onBpmBestaetigt }));

    const input = screen.getByLabelText("BPM-Wert");
    fireEvent.change(input, { target: { value: "500" } });
    fireEvent.click(screen.getByText("Bestätigen"));

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(onBpmBestaetigt).not.toHaveBeenCalled();
  });

  it("shows error for non-integer value", () => {
    const onBpmBestaetigt = vi.fn();
    render(React.createElement(BpmEingabe, { onBpmBestaetigt }));

    const input = screen.getByLabelText("BPM-Wert");
    fireEvent.change(input, { target: { value: "120.5" } });
    fireEvent.click(screen.getByText("Bestätigen"));

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(onBpmBestaetigt).not.toHaveBeenCalled();
  });

  it("clears error when user types again", () => {
    const onBpmBestaetigt = vi.fn();
    render(React.createElement(BpmEingabe, { onBpmBestaetigt }));

    // Trigger error
    fireEvent.click(screen.getByText("Bestätigen"));
    expect(screen.getByRole("alert")).toBeTruthy();

    // Type again — error should clear
    const input = screen.getByLabelText("BPM-Wert");
    fireEvent.change(input, { target: { value: "1" } });
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
