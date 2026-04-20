/**
 * @vitest-environment jsdom
 */

/**
 * Feature: player-beat-counter, Property 2: Bedingte Anzeige basierend auf Beat-Daten
 * Feature: player-beat-counter, Property 3: Aria-Label stimmt mit angezeigtem Wert überein
 *
 * Property-based tests for the BeatCounter component rendering behaviour.
 *
 * **Validates: Requirements 1.1, 1.2, 1.5, 4.1, 4.2**
 */
import { describe, it, expect, afterEach } from "vitest";
import * as fc from "fast-check";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { BeatCounter } from "@/components/songs/beat-counter";
import { berechneBeatPosition } from "@/hooks/use-beat-position";

afterEach(() => {
  cleanup();
});

/**
 * Generator for sorted arrays of beat positions (non-negative, strictly increasing).
 */
const sortedBeatPositions = (minLength = 1) =>
  fc
    .array(fc.nat({ max: 600_000 }), {
      minLength,
      maxLength: 200,
    })
    .map((arr) => [...new Set(arr)].sort((a, b) => a - b))
    .filter((arr) => arr.length >= minLength);

describe("Feature: player-beat-counter, Property 2: Bedingte Anzeige basierend auf Beat-Daten", () => {
  it("shows takt/schlag display iff beatPositionenMs is non-empty AND currentTimeMs ≥ first beat", () => {
    fc.assert(
      fc.property(
        sortedBeatPositions(),
        fc.integer({ min: 1, max: 16 }),
        fc.nat({ max: 600_000 }),
        (beatPositionenMs, taktZaehler, currentTimeMs) => {
          cleanup();

          const { container } = render(
            React.createElement(BeatCounter, {
              beatPositionenMs,
              currentTimeMs,
              taktZaehler,
            }),
          );

          const firstBeat = beatPositionenMs[0];
          const shouldShowBeat = currentTimeMs >= firstBeat;

          const el = container.firstElementChild!;
          const ariaLabel = el.getAttribute("aria-label") ?? "";

          if (shouldShowBeat) {
            // Should show takt/schlag, not placeholder
            expect(ariaLabel).toMatch(/^Takt \d+, Schlag \d+$/);
            expect(el.textContent).not.toBe("—");
          } else {
            // Should show placeholder
            expect(ariaLabel).toBe("Kein aktiver Takt");
            expect(el.textContent).toBe("—");
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("shows placeholder when beatPositionenMs is empty", () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 600_000 }),
        (currentTimeMs) => {
          cleanup();

          const { container } = render(
            React.createElement(BeatCounter, {
              beatPositionenMs: [],
              currentTimeMs,
            }),
          );

          const el = container.firstElementChild!;
          expect(el.getAttribute("aria-label")).toBe("Kein aktiver Takt");
          expect(el.textContent).toBe("—");
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe("Feature: player-beat-counter, Property 3: Aria-Label stimmt mit angezeigtem Wert überein", () => {
  it("aria-label matches displayed takt.schlag value when active", () => {
    fc.assert(
      fc.property(
        sortedBeatPositions(),
        fc.integer({ min: 1, max: 16 }),
        (beatPositionenMs, taktZaehler) => {
          cleanup();

          // Use the last beat to guarantee an active position
          const currentTimeMs = beatPositionenMs[beatPositionenMs.length - 1];

          const { container } = render(
            React.createElement(BeatCounter, {
              beatPositionenMs,
              currentTimeMs,
              taktZaehler,
            }),
          );

          const position = berechneBeatPosition(
            beatPositionenMs,
            currentTimeMs,
            taktZaehler,
          );
          expect(position).not.toBeNull();
          if (!position) return;

          const el = container.firstElementChild!;
          const ariaLabel = el.getAttribute("aria-label");
          const displayedText = el.textContent;

          // Aria-label should be "Takt X, Schlag Y"
          expect(ariaLabel).toBe(
            `Takt ${position.taktNummer}, Schlag ${position.schlagImTakt}`,
          );

          // Displayed text should be "X.Y"
          expect(displayedText).toBe(
            `${position.taktNummer}.${position.schlagImTakt}`,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it("aria-label is 'Kein aktiver Takt' when placeholder is shown", () => {
    fc.assert(
      fc.property(
        sortedBeatPositions(),
        (beatPositionenMs) => {
          cleanup();

          // Use a time before the first beat
          const currentTimeMs = beatPositionenMs[0] - 1;

          const { container } = render(
            React.createElement(BeatCounter, {
              beatPositionenMs,
              currentTimeMs,
            }),
          );

          const el = container.firstElementChild!;
          expect(el.getAttribute("aria-label")).toBe("Kein aktiver Takt");
          expect(el.textContent).toBe("—");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("aria-label consistency holds for dark variant too", () => {
    fc.assert(
      fc.property(
        sortedBeatPositions(),
        fc.integer({ min: 1, max: 16 }),
        (beatPositionenMs, taktZaehler) => {
          cleanup();

          const currentTimeMs = beatPositionenMs[beatPositionenMs.length - 1];

          const { container } = render(
            React.createElement(BeatCounter, {
              beatPositionenMs,
              currentTimeMs,
              taktZaehler,
              variant: "dark",
            }),
          );

          const position = berechneBeatPosition(
            beatPositionenMs,
            currentTimeMs,
            taktZaehler,
          );
          expect(position).not.toBeNull();
          if (!position) return;

          const el = container.firstElementChild!;
          expect(el.getAttribute("aria-label")).toBe(
            `Takt ${position.taktNummer}, Schlag ${position.schlagImTakt}`,
          );
          expect(el.textContent).toBe(
            `${position.taktNummer}.${position.schlagImTakt}`,
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
