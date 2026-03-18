/**
 * @vitest-environment jsdom
 */

/**
 * Unit-Tests für TimecodeEingabe-Komponente
 *
 * Testen: Rendering, Validierung, API-Aufrufe (Create/Update),
 * Callback-Aufruf, Fehleranzeige, Leeren des Timecodes
 *
 * Anforderungen: 3.1, 3.2, 3.3, 6.1, 6.2
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import TimecodeEingabe from "@/components/songs/timecode-eingabe";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const STROPHE_ID = "strophe-123";

function renderEingabe(
  props?: Partial<{
    stropheId: string;
    initialTimecodeMs: number | null;
    onTimecodeChanged: (timecodeMs: number | null) => void;
  }>,
) {
  const defaultProps = {
    stropheId: STROPHE_ID,
    initialTimecodeMs: null,
    onTimecodeChanged: vi.fn(),
    ...props,
  };
  return {
    ...render(React.createElement(TimecodeEingabe, defaultProps)),
    onTimecodeChanged: defaultProps.onTimecodeChanged,
  };
}

describe("TimecodeEingabe Unit-Tests", () => {
  it("renders input with placeholder mm:ss", () => {
    renderEingabe();
    const input = screen.getByPlaceholderText("mm:ss");
    expect(input).toBeDefined();
  });

  it("displays formatted initialTimecodeMs", () => {
    // 90 seconds = 1:30 = [01:30]
    renderEingabe({ initialTimecodeMs: 90000 });
    const input = screen.getByPlaceholderText("mm:ss") as HTMLInputElement;
    expect(input.value).toBe("[01:30]");
  });

  it("displays empty input when initialTimecodeMs is null", () => {
    renderEingabe({ initialTimecodeMs: null });
    const input = screen.getByPlaceholderText("mm:ss") as HTMLInputElement;
    expect(input.value).toBe("");
  });

  it("shows validation error for invalid timecode on blur", async () => {
    renderEingabe();
    const input = screen.getByPlaceholderText("mm:ss");

    fireEvent.change(input, { target: { value: "invalid" } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
      expect(screen.getByText(/Ungültiges Format/)).toBeDefined();
    });
  });

  it("shows validation error for invalid timecode on Enter", async () => {
    renderEingabe();
    const input = screen.getByPlaceholderText("mm:ss");

    fireEvent.change(input, { target: { value: "[99:60]" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
    });
  });

  it("creates new markup via POST on valid timecode", async () => {
    const onTimecodeChanged = vi.fn();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ markup: { id: "markup-1", timecodeMs: 90000 } }),
    });
    global.fetch = mockFetch;

    renderEingabe({ onTimecodeChanged });
    const input = screen.getByPlaceholderText("mm:ss");

    fireEvent.change(input, { target: { value: "[01:30]" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/markups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          typ: "TIMECODE",
          ziel: "STROPHE",
          stropheId: STROPHE_ID,
          timecodeMs: 90000,
        }),
      });
      expect(onTimecodeChanged).toHaveBeenCalledWith(90000, "markup-1");
    });
  });

  it("updates existing markup via PUT after initial create", async () => {
    const onTimecodeChanged = vi.fn();
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ markup: { id: "markup-1", timecodeMs: 90000 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ markup: { id: "markup-1", timecodeMs: 120000 } }),
      });
    global.fetch = mockFetch;

    renderEingabe({ onTimecodeChanged });
    const input = screen.getByPlaceholderText("mm:ss");

    // First save: creates markup
    fireEvent.change(input, { target: { value: "[01:30]" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(onTimecodeChanged).toHaveBeenCalledWith(90000, "markup-1");
    });

    // Second save: updates markup
    fireEvent.change(input, { target: { value: "[02:00]" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/markups/markup-1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timecodeMs: 120000 }),
      });
      expect(onTimecodeChanged).toHaveBeenCalledWith(120000, "markup-1");
    });
  });

  it("calls onTimecodeChanged(null) when input is cleared", async () => {
    const onTimecodeChanged = vi.fn();
    renderEingabe({ initialTimecodeMs: 90000, onTimecodeChanged });
    const input = screen.getByPlaceholderText("mm:ss");

    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(onTimecodeChanged).toHaveBeenCalledWith(null);
    });
  });

  it("shows API error message on failed save", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Zugriff verweigert" }),
    });
    global.fetch = mockFetch;

    renderEingabe();
    const input = screen.getByPlaceholderText("mm:ss");

    fireEvent.change(input, { target: { value: "[01:30]" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(screen.getByText("Zugriff verweigert")).toBeDefined();
    });
  });

  it("shows network error on fetch failure", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
    global.fetch = mockFetch;

    renderEingabe();
    const input = screen.getByPlaceholderText("mm:ss");

    fireEvent.change(input, { target: { value: "[01:30]" } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(screen.getByText("Netzwerkfehler")).toBeDefined();
    });
  });

  it("clears error when user types again", async () => {
    renderEingabe();
    const input = screen.getByPlaceholderText("mm:ss");

    // Trigger error
    fireEvent.change(input, { target: { value: "invalid" } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
    });

    // Type again - error should clear
    fireEvent.change(input, { target: { value: "[01:30]" } });

    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("has accessible label for the input", () => {
    renderEingabe();
    const input = screen.getByLabelText("Timecode");
    expect(input).toBeDefined();
  });
});
