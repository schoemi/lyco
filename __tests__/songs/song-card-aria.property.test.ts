/**
 * @vitest-environment jsdom
 */
/**
 * Property 3: aria-label enthält Titel, Künstler und Fortschritt
 *
 * Für jeden Song: `aria-label` enthält den Titel, den Künstler (falls vorhanden)
 * und den Fortschrittsstatus.
 *
 * **Validates: Requirements 4.7**
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

import { SongCard } from "@/components/songs/song-card";
import type { SongWithProgress } from "@/types/song";

const PBT_CONFIG = { numRuns: 100 };

function expectedStatusLabel(progress: number): string {
  if (progress <= 0) return "neu";
  if (progress >= 100) return "gelernt";
  return `${Math.round(progress)}% gelernt`;
}

/** Generator for a SongWithProgress object with arbitrary title, artist, and progress */
const songArb = fc
  .record({
    titel: fc.string({ minLength: 1, maxLength: 80 }),
    kuenstler: fc.option(fc.string({ minLength: 1, maxLength: 80 }), { nil: null }),
    progress: fc.double({ min: -10, max: 110, noNaN: true }),
  })
  .map(({ titel, kuenstler, progress }) => ({
    id: "test-id",
    titel,
    kuenstler,
    sprache: null,
    emotionsTags: [],
    coverUrl: null,
    progress,
    sessionCount: 0,
    status: (progress <= 0 ? "neu" : progress >= 100 ? "gelernt" : "aktiv") as SongWithProgress["status"],
  }));

describe("Property 3: aria-label enthält Titel, Künstler und Fortschritt", () => {
  it("aria-label contains the song title", () => {
    fc.assert(
      fc.property(songArb, (song) => {
        const { container } = render(React.createElement(SongCard, { song }));
        const link = container.querySelector("a");
        expect(link).not.toBeNull();
        const label = link!.getAttribute("aria-label")!;
        expect(label).toContain(song.titel);
      }),
      PBT_CONFIG,
    );
  });

  it("aria-label contains the artist when present", () => {
    const songWithArtist = songArb.filter((s) => s.kuenstler !== null);
    fc.assert(
      fc.property(songWithArtist, (song) => {
        const { container } = render(React.createElement(SongCard, { song }));
        const link = container.querySelector("a");
        const label = link!.getAttribute("aria-label")!;
        expect(label).toContain(song.kuenstler!);
      }),
      PBT_CONFIG,
    );
  });

  it("aria-label does NOT contain a comma-separated artist section when artist is null", () => {
    const songWithoutArtist = songArb.filter((s) => s.kuenstler === null);
    fc.assert(
      fc.property(songWithoutArtist, (song) => {
        const { container } = render(React.createElement(SongCard, { song }));
        const link = container.querySelector("a");
        const label = link!.getAttribute("aria-label")!;
        // Should be "titel – statusLabel" without ", " before " – "
        const statusLabel = expectedStatusLabel(song.progress);
        expect(label).toBe(`${song.titel} – ${statusLabel}`);
      }),
      PBT_CONFIG,
    );
  });

  it("aria-label contains the correct progress status", () => {
    fc.assert(
      fc.property(songArb, (song) => {
        const { container } = render(React.createElement(SongCard, { song }));
        const link = container.querySelector("a");
        const label = link!.getAttribute("aria-label")!;
        const statusLabel = expectedStatusLabel(song.progress);
        expect(label).toContain(statusLabel);
      }),
      PBT_CONFIG,
    );
  });

  it("aria-label matches the exact expected format", () => {
    fc.assert(
      fc.property(songArb, (song) => {
        const { container } = render(React.createElement(SongCard, { song }));
        const link = container.querySelector("a");
        const label = link!.getAttribute("aria-label")!;
        const statusLabel = expectedStatusLabel(song.progress);
        const expected = `${song.titel}${song.kuenstler ? `, ${song.kuenstler}` : ""} – ${statusLabel}`;
        expect(label).toBe(expected);
      }),
      PBT_CONFIG,
    );
  });
});
