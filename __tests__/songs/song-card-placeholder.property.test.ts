/**
 * @vitest-environment jsdom
 */
/**
 * Property 4: Platzhalter-Hintergrund bei fehlendem Cover
 *
 * Für jeden Song ohne `coverUrl`: Karte rendert einen Gradient-Platzhalter statt eines Bildes.
 * Für jeden Song mit `coverUrl`: Karte rendert das Cover-Bild als Hintergrund.
 *
 * **Validates: Requirements 1.2, 1.3**
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

/** Generator for a base song record with arbitrary fields */
const baseSongFields = fc.record({
  titel: fc.string({ minLength: 1, maxLength: 80 }),
  kuenstler: fc.option(fc.string({ minLength: 1, maxLength: 80 }), { nil: null }),
  progress: fc.double({ min: 0, max: 100, noNaN: true }),
});

/** Generator for a song WITHOUT coverUrl */
const songWithoutCover: fc.Arbitrary<SongWithProgress> = baseSongFields.map(
  ({ titel, kuenstler, progress }) => ({
    id: "test-id",
    titel,
    kuenstler,
    sprache: null,
    emotionsTags: [],
    coverUrl: null,
    progress,
    sessionCount: 0,
    status: (progress <= 0 ? "neu" : progress >= 100 ? "gelernt" : "aktiv") as SongWithProgress["status"],
  }),
);

/** Generator for a clean cover URL path (no special chars that break CSS url()) */
const coverUrlArb = fc
  .tuple(
    fc.array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), { minLength: 1, maxLength: 20 }),
    fc.constantFrom('.jpg', '.png', '.webp'),
  )
  .map(([chars, ext]) => `/api/uploads/covers/${chars.join('')}${ext}`);

/** Generator for a song WITH coverUrl (valid URL string) */
const songWithCover: fc.Arbitrary<SongWithProgress> = fc
  .record({
    titel: fc.string({ minLength: 1, maxLength: 80 }),
    kuenstler: fc.option(fc.string({ minLength: 1, maxLength: 80 }), { nil: null }),
    progress: fc.double({ min: 0, max: 100, noNaN: true }),
    coverUrl: coverUrlArb,
  })
  .map(({ titel, kuenstler, progress, coverUrl }) => ({
    id: "test-id",
    titel,
    kuenstler,
    sprache: null,
    emotionsTags: [],
    coverUrl,
    progress,
    sessionCount: 0,
    status: (progress <= 0 ? "neu" : progress >= 100 ? "gelernt" : "aktiv") as SongWithProgress["status"],
  }));

describe("Property 4: Platzhalter-Hintergrund bei fehlendem Cover", () => {
  it("renders a gradient placeholder when coverUrl is null", () => {
    fc.assert(
      fc.property(songWithoutCover, (song) => {
        const { container } = render(React.createElement(SongCard, { song }));

        // Should have a gradient placeholder div
        const gradientDiv = container.querySelector(".bg-gradient-to-br");
        expect(gradientDiv).not.toBeNull();
        expect(gradientDiv!.classList.contains("from-neutral-400")).toBe(true);
        expect(gradientDiv!.classList.contains("to-neutral-600")).toBe(true);

        // Should NOT have a bg-cover div with backgroundImage
        const coverDiv = container.querySelector(".bg-cover");
        expect(coverDiv).toBeNull();
      }),
      PBT_CONFIG,
    );
  });

  it("renders the cover image as background when coverUrl is present", () => {
    fc.assert(
      fc.property(songWithCover, (song) => {
        const { container } = render(React.createElement(SongCard, { song }));

        // Should have a bg-cover div with the correct backgroundImage
        const coverDiv = container.querySelector(".bg-cover");
        expect(coverDiv).not.toBeNull();
        const bgImage = (coverDiv as HTMLElement).style.backgroundImage;
        // Browsers may normalize url() with or without quotes
        expect(bgImage).toContain(song.coverUrl!);

        // Should NOT have a gradient placeholder
        const gradientDiv = container.querySelector(".bg-gradient-to-br");
        expect(gradientDiv).toBeNull();
      }),
      PBT_CONFIG,
    );
  });
});
