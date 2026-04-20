/**
 * @vitest-environment jsdom
 */

/**
 * Unit-Tests für AudioStopButton-Komponente
 *
 * Testet: Viereck-Icon-Rendering, onStop-Callback, disabled-Zustand,
 * Accessibility (aria-label, aria-hidden, Touch-Target).
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2, 6.3, 6.4
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { AudioStopButton } from "@/components/karaoke/audio-stop-button";

afterEach(() => {
  cleanup();
});

describe("AudioStopButton", () => {
  // --- Requirement 1.1: Rendert Viereck-Icon (■) ---

  it("renders a square icon (rect SVG element)", () => {
    const onStop = vi.fn();
    render(React.createElement(AudioStopButton, { onStop }));

    const button = screen.getByRole("button", { name: "Stopp" });
    const svg = button.querySelector("svg");
    expect(svg).toBeTruthy();

    const rect = svg!.querySelector("rect");
    expect(rect).toBeTruthy();
    expect(rect!.getAttribute("x")).toBe("4");
    expect(rect!.getAttribute("y")).toBe("4");
    expect(rect!.getAttribute("width")).toBe("16");
    expect(rect!.getAttribute("height")).toBe("16");
  });

  // --- Requirement 1.4: Ruft onStop bei Klick auf ---

  it("calls onStop when clicked", () => {
    const onStop = vi.fn();
    render(React.createElement(AudioStopButton, { onStop }));

    const button = screen.getByRole("button", { name: "Stopp" });
    fireEvent.click(button);

    expect(onStop).toHaveBeenCalledTimes(1);
  });

  // --- Requirement 1.5: Ignoriert Klick wenn disabled ---

  it("does not call onStop when disabled", () => {
    const onStop = vi.fn();
    render(
      React.createElement(AudioStopButton, { onStop, disabled: true }),
    );

    const button = screen.getByRole("button", { name: "Stopp" });
    fireEvent.click(button);

    expect(onStop).not.toHaveBeenCalled();
  });

  it("sets the disabled attribute when disabled={true}", () => {
    const onStop = vi.fn();
    render(
      React.createElement(AudioStopButton, { onStop, disabled: true }),
    );

    const button = screen.getByRole("button", { name: "Stopp" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  // --- Requirement 6.1: aria-label="Stopp" ---

  it('has aria-label="Stopp"', () => {
    const onStop = vi.fn();
    render(React.createElement(AudioStopButton, { onStop }));

    const button = screen.getByRole("button", { name: "Stopp" });
    expect(button.getAttribute("aria-label")).toBe("Stopp");
  });

  // --- Requirement 6.3: SVG hat aria-hidden="true" ---

  it('has SVG with aria-hidden="true"', () => {
    const onStop = vi.fn();
    render(React.createElement(AudioStopButton, { onStop }));

    const button = screen.getByRole("button", { name: "Stopp" });
    const svg = button.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(svg!.getAttribute("aria-hidden")).toBe("true");
  });

  // --- Requirement 1.3 / 6.2: Touch-Target mindestens 44×44px ---

  it("has min-h-[44px] and min-w-[44px] classes for touch target", () => {
    const onStop = vi.fn();
    render(React.createElement(AudioStopButton, { onStop }));

    const button = screen.getByRole("button", { name: "Stopp" });
    expect(button.className).toContain("min-h-[44px]");
    expect(button.className).toContain("min-w-[44px]");
  });
});
