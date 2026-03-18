/**
 * @vitest-environment jsdom
 */
/**
 * Property 5: Responsive Grid-Spalten
 *
 * Grid-Container hat die korrekten Tailwind-Klassen für 1/2/3/4 Spalten,
 * unabhängig von der Anzahl der übergebenen Songs.
 *
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
 */

import { describe, it, expect, vi } from "vitest";
import fc from "fast-check";
import React from "react";
import { render } from "@testing-library/react";

// Mock next/link to render a plain anchor
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...props
  }: {
    children?: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => React.createElement("a", { href, ...props }, children),
}));

// Mock StatusPunkt to avoid importing gamification internals
vi.mock("@/components/gamification/status-punkt", () => ({
  StatusPunkt: ({ fortschritt }: { fortschritt: number }) =>
    React.createElement("span", { "data-testid": "status-punkt", "data-fortschritt": fortschritt }),
}));

// Mock ProgressBar to avoid side-effects
vi.mock("@/components/songs/progress-bar", () => ({
  ProgressBar: ({ value }: { value: number }) =>
    React.createElement("div", { "data-testid": "progress-bar", "data-value": value }),
}));

import { SongCardGrid } from "@/components/songs/song-card-grid";
import type { SongWithProgress } from "@/types/song";

const PBT_CONFIG = { numRuns: 80 };

/** Generator for a single SongWithProgress */
const songArb: fc.Arbitrary<SongWithProgress> = fc
  .record({
    id: fc.uuid(),
    titel: fc.string({ minLength: 1, maxLength: 60 }),
    kuenstler: fc.option(fc.string({ minLength: 1, maxLength: 60 }), { nil: null }),
    progress: fc.double({ min: 0, max: 100, noNaN: true }),
  })
  .map(({ id, titel, kuenstler, progress }) => ({
    id,
    titel,
    kuenstler,
    sprache: null,
    emotionsTags: [],
    coverUrl: null,
    progress,
    sessionCount: 0,
    status: (progress <= 0 ? "neu" : progress >= 100 ? "gelernt" : "aktiv") as SongWithProgress["status"],
  }));

/** Generator for an array of 0–20 songs */
const songsArb = fc.array(songArb, { minLength: 0, maxLength: 20 });

const EXPECTED_GRID_CLASSES = [
  "grid",
  "grid-cols-1",
  "sm:grid-cols-2",
  "md:grid-cols-3",
  "lg:grid-cols-4",
  "gap-4",
];

describe("Property 5: Responsive Grid-Spalten", () => {
  it("grid container always has all responsive Tailwind column classes regardless of song count", () => {
    fc.assert(
      fc.property(songsArb, (songs) => {
        const { container } = render(
          React.createElement(SongCardGrid, { songs }),
        );
        const grid = container.firstElementChild as HTMLElement;
        expect(grid).not.toBeNull();

        for (const cls of EXPECTED_GRID_CLASSES) {
          expect(grid.classList.contains(cls)).toBe(true);
        }
      }),
      PBT_CONFIG,
    );
  });

  it("grid renders exactly one SongCard per song", () => {
    fc.assert(
      fc.property(songsArb, (songs) => {
        const { container } = render(
          React.createElement(SongCardGrid, { songs }),
        );
        const grid = container.firstElementChild as HTMLElement;
        // Each SongCard renders as an <a> tag (mocked Link)
        const cards = grid.querySelectorAll(":scope > a");
        expect(cards.length).toBe(songs.length);
      }),
      PBT_CONFIG,
    );
  });
});
