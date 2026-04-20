/**
 * @vitest-environment jsdom
 */

/**
 * Unit-Tests für Frequenzbereich-Regler-Komponente
 *
 * Testen: Slider-Rendering, Initialwerte, numerische Anzeige
 *
 * Anforderungen: 3.1, 3.3, 3.6
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import FrequenzbereichRegler from "@/components/songs/frequenzbereich-regler";

afterEach(() => {
  cleanup();
});

describe("FrequenzbereichRegler", () => {
  // --- Requirement 3.1: Two sliders for frequency range ---

  it("renders two range sliders for Untergrenze and Obergrenze", () => {
    const onUntergrenzeChange = vi.fn();
    const onObergrenzeChange = vi.fn();

    render(
      React.createElement(FrequenzbereichRegler, {
        untergrenze: 60,
        obergrenze: 200,
        onUntergrenzeChange,
        onObergrenzeChange,
      }),
    );

    const ugSlider = screen.getByLabelText("Frequenz-Untergrenze") as HTMLInputElement;
    const ogSlider = screen.getByLabelText("Frequenz-Obergrenze") as HTMLInputElement;

    expect(ugSlider).toBeTruthy();
    expect(ogSlider).toBeTruthy();
    expect(ugSlider.type).toBe("range");
    expect(ogSlider.type).toBe("range");
  });

  it("renders the 'Frequenzbereich (Hz)' heading", () => {
    render(
      React.createElement(FrequenzbereichRegler, {
        untergrenze: 60,
        obergrenze: 200,
        onUntergrenzeChange: vi.fn(),
        onObergrenzeChange: vi.fn(),
      }),
    );

    expect(screen.getByText("Frequenzbereich (Hz)")).toBeTruthy();
  });

  // --- Requirement 3.3: Initial values 60 Hz / 200 Hz ---

  it("displays initial values correctly", () => {
    render(
      React.createElement(FrequenzbereichRegler, {
        untergrenze: 60,
        obergrenze: 200,
        onUntergrenzeChange: vi.fn(),
        onObergrenzeChange: vi.fn(),
      }),
    );

    const ugSlider = screen.getByLabelText("Frequenz-Untergrenze") as HTMLInputElement;
    const ogSlider = screen.getByLabelText("Frequenz-Obergrenze") as HTMLInputElement;

    expect(ugSlider.value).toBe("60");
    expect(ogSlider.value).toBe("200");
  });

  // --- Requirement 3.6: Numeric display of current values ---

  it("displays current values in Hz next to sliders", () => {
    render(
      React.createElement(FrequenzbereichRegler, {
        untergrenze: 60,
        obergrenze: 200,
        onUntergrenzeChange: vi.fn(),
        onObergrenzeChange: vi.fn(),
      }),
    );

    expect(screen.getByText("60 Hz")).toBeTruthy();
    expect(screen.getByText("200 Hz")).toBeTruthy();
  });

  it("displays updated values when props change", () => {
    const { rerender } = render(
      React.createElement(FrequenzbereichRegler, {
        untergrenze: 60,
        obergrenze: 200,
        onUntergrenzeChange: vi.fn(),
        onObergrenzeChange: vi.fn(),
      }),
    );

    rerender(
      React.createElement(FrequenzbereichRegler, {
        untergrenze: 100,
        obergrenze: 500,
        onUntergrenzeChange: vi.fn(),
        onObergrenzeChange: vi.fn(),
      }),
    );

    expect(screen.getByText("100 Hz")).toBeTruthy();
    expect(screen.getByText("500 Hz")).toBeTruthy();
  });

  // --- Slider interaction ---

  it("calls onUntergrenzeChange when lower slider changes", () => {
    const onUntergrenzeChange = vi.fn();
    const onObergrenzeChange = vi.fn();

    render(
      React.createElement(FrequenzbereichRegler, {
        untergrenze: 60,
        obergrenze: 200,
        onUntergrenzeChange,
        onObergrenzeChange,
      }),
    );

    const ugSlider = screen.getByLabelText("Frequenz-Untergrenze");
    fireEvent.change(ugSlider, { target: { value: "80" } });

    expect(onUntergrenzeChange).toHaveBeenCalledWith(80);
  });

  it("calls onObergrenzeChange when upper slider changes", () => {
    const onUntergrenzeChange = vi.fn();
    const onObergrenzeChange = vi.fn();

    render(
      React.createElement(FrequenzbereichRegler, {
        untergrenze: 60,
        obergrenze: 200,
        onUntergrenzeChange,
        onObergrenzeChange,
      }),
    );

    const ogSlider = screen.getByLabelText("Frequenz-Obergrenze");
    fireEvent.change(ogSlider, { target: { value: "300" } });

    expect(onObergrenzeChange).toHaveBeenCalledWith(300);
  });

  it("slider range is 20 to 20000", () => {
    render(
      React.createElement(FrequenzbereichRegler, {
        untergrenze: 60,
        obergrenze: 200,
        onUntergrenzeChange: vi.fn(),
        onObergrenzeChange: vi.fn(),
      }),
    );

    const ugSlider = screen.getByLabelText("Frequenz-Untergrenze") as HTMLInputElement;
    const ogSlider = screen.getByLabelText("Frequenz-Obergrenze") as HTMLInputElement;

    expect(ugSlider.min).toBe("20");
    expect(ugSlider.max).toBe("20000");
    expect(ogSlider.min).toBe("20");
    expect(ogSlider.max).toBe("20000");
  });
});
