/**
 * @vitest-environment jsdom
 */

/**
 * Unit tests for PitchDisplay component rendering
 *
 * Tests: SVG role/aria-label, empty balken, cursor position, keyboard interaction
 *
 * Validates: Requirements 9.1, 9.2, 9.3, 7.1, 7.2, 7.3
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { PitchDisplay } from "@/components/pitch-display/pitch-display";
import type { PitchBalken } from "@/lib/pitch-display/pitch-balken";

// --- Mock ResizeObserver (not available in jsdom) ---
class MockResizeObserver {
  callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    // Immediately fire with a mock contentRect
    this.callback(
      [
        {
          target,
          contentRect: { width: 800, height: 120 } as DOMRectReadOnly,
          borderBoxSize: [],
          contentBoxSize: [],
          devicePixelContentBoxSize: [],
        } as ResizeObserverEntry,
      ],
      this as unknown as ResizeObserver,
    );
  }
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", MockResizeObserver);
  // Mock requestAnimationFrame to call callback synchronously with a timestamp
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(performance.now());
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** Helper to create a PitchBalken */
function makeBalken(
  startMs: number,
  endMs: number,
  midiValue: number,
): PitchBalken {
  return { startMs, endMs, midiValue, durationMs: endMs - startMs };
}

describe("PitchDisplay", () => {
  // --- Requirement 9.1: role="img" and aria-label ---

  it('renders SVG with role="img" (Req 9.1)', () => {
    const balken = [makeBalken(0, 500, 60), makeBalken(600, 1200, 64)];
    const { container } = render(
      React.createElement(PitchDisplay, {
        balken,
        currentTimeMs: 0,
        isPlaying: false,
      }),
    );

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute("role")).toBe("img");
  });

  it("renders SVG with descriptive aria-label including bar count and pitch range (Req 9.1)", () => {
    // MIDI 60 = C4, MIDI 67 = G4 (octave = floor(midi/12) - 1)
    const balken = [makeBalken(0, 500, 60), makeBalken(600, 1200, 67)];
    const { container } = render(
      React.createElement(PitchDisplay, {
        balken,
        currentTimeMs: 0,
        isPlaying: false,
      }),
    );

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    const ariaLabel = svg!.getAttribute("aria-label");
    expect(ariaLabel).toBeDefined();
    // Should mention bar count
    expect(ariaLabel).toContain("2");
    // Should mention note names (C4 for midi 60, G4 for midi 67)
    expect(ariaLabel).toContain("C4");
    expect(ariaLabel).toContain("G4");
  });

  it("renders aria-label for empty balken indicating no bars (Req 9.1)", () => {
    const { container } = render(
      React.createElement(PitchDisplay, {
        balken: [],
        currentTimeMs: 0,
        isPlaying: false,
      }),
    );

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    const ariaLabel = svg!.getAttribute("aria-label");
    expect(ariaLabel).toBeDefined();
    expect(ariaLabel).toContain("Keine");
  });

  // --- Requirement 7.1, 7.2, 7.3: Visual bar rendering ---

  it("renders no rect bars when given empty balken array (Req 7.1)", () => {
    const { container } = render(
      React.createElement(PitchDisplay, {
        balken: [],
        currentTimeMs: 0,
        isPlaying: false,
      }),
    );

    // The SVG should exist but have no pitch bar rects
    // There will be a cursor <line> but no <rect> elements for bars
    const rects = container.querySelectorAll("svg rect");
    expect(rects.length).toBe(0);
  });

  it("renders rect elements for visible balken (Req 7.1, 7.2)", () => {
    // Create bars within the default viewport window (cursor at 0, window 15s)
    const balken = [
      makeBalken(0, 500, 60),
      makeBalken(1000, 2000, 64),
      makeBalken(3000, 4000, 67),
    ];
    const { container } = render(
      React.createElement(PitchDisplay, {
        balken,
        currentTimeMs: 2000,
        isPlaying: false,
      }),
    );

    const rects = container.querySelectorAll("svg rect");
    expect(rects.length).toBeGreaterThan(0);
  });

  it("renders bars with rounded corners (rx/ry attributes) (Req 7.1)", () => {
    const balken = [makeBalken(0, 500, 60)];
    const { container } = render(
      React.createElement(PitchDisplay, {
        balken,
        currentTimeMs: 0,
        isPlaying: false,
      }),
    );

    const rect = container.querySelector("svg rect");
    expect(rect).not.toBeNull();
    const rx = rect!.getAttribute("rx");
    const ry = rect!.getAttribute("ry");
    expect(Number(rx)).toBeGreaterThan(0);
    expect(Number(ry)).toBeGreaterThan(0);
  });

  it("renders bars with semi-transparent violet fill (Req 7.3)", () => {
    const balken = [makeBalken(0, 500, 60)];
    const { container } = render(
      React.createElement(PitchDisplay, {
        balken,
        currentTimeMs: 0,
        isPlaying: false,
      }),
    );

    const rect = container.querySelector("svg rect");
    expect(rect).not.toBeNull();
    const fill = rect!.getAttribute("fill");
    expect(fill).toContain("139");
    expect(fill).toContain("92");
    expect(fill).toContain("246");
  });

  // --- Cursor rendering ---

  it("renders a cursor line element (Req 3.2)", () => {
    const { container } = render(
      React.createElement(PitchDisplay, {
        balken: [makeBalken(0, 500, 60)],
        currentTimeMs: 1000,
        isPlaying: false,
      }),
    );

    // The cursor is a <line> element in the SVG
    const lines = container.querySelectorAll("svg line");
    // There should be at least one line (the cursor) — guide lines are also <line> elements
    expect(lines.length).toBeGreaterThan(0);

    // Find the cursor line (vertical: x1 === x2, spans full height)
    const cursorLine = Array.from(lines).find(
      (l) => l.getAttribute("x1") === l.getAttribute("x2"),
    );
    expect(cursorLine).toBeDefined();
  });

  it("cursor is always positioned in the left third of the viewport (Req 3.1, 4.2)", () => {
    // The viewport is computed so the cursor sits at the left-third position.
    // Verify the cursor x-coordinate is at approximately 1/3 of the plot width.
    const balken = [makeBalken(0, 30000, 60)];
    const { container } = render(
      React.createElement(PitchDisplay, {
        balken,
        currentTimeMs: 10000,
        isPlaying: false,
      }),
    );

    const svg = container.querySelector("svg")!;
    const svgWidth = Number(svg.getAttribute("viewBox")!.split(" ")[2]);
    const SCALE_MARGIN = 36; // from component
    const plotWidth = svgWidth - SCALE_MARGIN;

    // Find the cursor line (vertical: x1 === x2)
    const lines = svg.querySelectorAll("line");
    const cursorLine = Array.from(lines).find(
      (l) => l.getAttribute("x1") === l.getAttribute("x2"),
    );
    expect(cursorLine).toBeDefined();

    const cursorX = Number(cursorLine!.getAttribute("x1"));
    // Cursor should be at SCALE_MARGIN + plotWidth/3 (left third)
    const expectedX = SCALE_MARGIN + plotWidth / 3;
    expect(cursorX).toBeCloseTo(expectedX, 0);
  });

  it("different currentTimeMs values change which bars are visible (Req 3.1, 4.3)", () => {
    // Place bars far apart so different currentTimeMs values show different bars
    const balken = [
      makeBalken(0, 500, 60),       // early bar
      makeBalken(50000, 51000, 64), // late bar (well outside 15s window from 0)
    ];

    // At time 0, only the early bar should be visible (viewport ~[-5000, 10000])
    const { container: container1 } = render(
      React.createElement(PitchDisplay, {
        balken,
        currentTimeMs: 0,
        isPlaying: false,
      }),
    );
    const rects1 = container1.querySelectorAll("svg rect");

    // At time 50000, only the late bar should be visible (viewport ~[45000, 60000])
    const { container: container2 } = render(
      React.createElement(PitchDisplay, {
        balken,
        currentTimeMs: 50000,
        isPlaying: false,
      }),
    );
    const rects2 = container2.querySelectorAll("svg rect");

    // Each viewport should show exactly 1 bar (different bars from the array)
    expect(rects1.length).toBe(1);
    expect(rects2.length).toBe(1);
  });

  // --- Requirement 9.2: aria-live region ---

  it("includes an aria-live polite region for time announcements (Req 9.2)", () => {
    const { container } = render(
      React.createElement(PitchDisplay, {
        balken: [makeBalken(0, 500, 60)],
        currentTimeMs: 0,
        isPlaying: false,
      }),
    );

    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).not.toBeNull();
  });

  // --- Requirement 9.3: Keyboard focusable and arrow key interaction ---

  it("SVG is keyboard-focusable with tabIndex=0 (Req 9.3)", () => {
    const { container } = render(
      React.createElement(PitchDisplay, {
        balken: [makeBalken(0, 500, 60)],
        currentTimeMs: 0,
        isPlaying: false,
      }),
    );

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute("tabindex")).toBe("0");
  });

  it("ArrowRight key shifts viewport forward, moving bars left (Req 9.3)", () => {
    // Create a bar that's visible in the viewport
    const balken = [makeBalken(5000, 8000, 60)];
    const { container } = render(
      React.createElement(PitchDisplay, {
        balken,
        currentTimeMs: 5000,
        isPlaying: false,
      }),
    );

    const svg = container.querySelector("svg")!;

    // Get bar x-position before keypress
    const getBarX = () => {
      const rect = container.querySelector("svg rect");
      return rect ? Number(rect.getAttribute("x")) : null;
    };

    const xBefore = getBarX();
    expect(xBefore).not.toBeNull();

    // Press ArrowRight to shift viewport forward (effectiveTimeMs increases)
    // This moves the viewport window to the right, so bars shift left
    fireEvent.keyDown(svg, { key: "ArrowRight" });

    const xAfter = getBarX();
    expect(xAfter).not.toBeNull();
    expect(xAfter).not.toBe(xBefore);
    // Bar should move left (smaller x) as viewport shifts right
    expect(xAfter!).toBeLessThan(xBefore!);
  });

  it("ArrowLeft key shifts viewport backward, moving bars right (Req 9.3)", () => {
    const balken = [makeBalken(5000, 8000, 60)];
    const { container } = render(
      React.createElement(PitchDisplay, {
        balken,
        currentTimeMs: 5000,
        isPlaying: false,
      }),
    );

    const svg = container.querySelector("svg")!;

    const getBarX = () => {
      const rect = container.querySelector("svg rect");
      return rect ? Number(rect.getAttribute("x")) : null;
    };

    const xBefore = getBarX();
    expect(xBefore).not.toBeNull();

    // Press ArrowLeft to shift viewport backward (effectiveTimeMs decreases)
    // This moves the viewport window to the left, so bars shift right
    fireEvent.keyDown(svg, { key: "ArrowLeft" });

    const xAfter = getBarX();
    expect(xAfter).not.toBeNull();
    expect(xAfter).not.toBe(xBefore);
    // Bar should move right (larger x) as viewport shifts left
    expect(xAfter!).toBeGreaterThan(xBefore!);
  });

  it("ArrowLeft and ArrowRight shift in opposite directions (Req 9.3)", () => {
    const balken = [makeBalken(5000, 8000, 60)];
    const { container } = render(
      React.createElement(PitchDisplay, {
        balken,
        currentTimeMs: 5000,
        isPlaying: false,
      }),
    );

    const svg = container.querySelector("svg")!;

    const getBarX = () => {
      const rect = container.querySelector("svg rect");
      return rect ? Number(rect.getAttribute("x")) : null;
    };

    const xInitial = getBarX();
    expect(xInitial).not.toBeNull();

    fireEvent.keyDown(svg, { key: "ArrowRight" });
    const xAfterRight = getBarX();

    fireEvent.keyDown(svg, { key: "ArrowLeft" });
    const xAfterLeftBack = getBarX();

    // ArrowRight then ArrowLeft should return to original position
    expect(xAfterLeftBack).toBeCloseTo(xInitial!, 5);
    // ArrowRight should have moved the bar
    expect(xAfterRight).not.toBe(xInitial);
  });

  // --- Height prop ---

  it("respects custom height prop", () => {
    const { container } = render(
      React.createElement(PitchDisplay, {
        balken: [],
        currentTimeMs: 0,
        isPlaying: false,
        height: 160,
      }),
    );

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute("height")).toBe("160");
  });

  it("clamps height to valid range (80-200)", () => {
    const { container } = render(
      React.createElement(PitchDisplay, {
        balken: [],
        currentTimeMs: 0,
        isPlaying: false,
        height: 50,
      }),
    );

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    // Height should be clamped to minimum 80
    expect(Number(svg!.getAttribute("height"))).toBe(80);
  });
});
