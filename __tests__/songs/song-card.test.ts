/**
 * @vitest-environment jsdom
 */
/**
 * Unit-Tests für SongCard-Komponente
 *
 * Testen: Titel-Anzeige, Künstler-Anzeige, StatusPunkt-Position,
 * ProgressBar-Anzeige, Navigation bei Klick, Cover-Bild vs. Platzhalter
 *
 * Anforderungen: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.8
 */

import { describe, it, expect, vi } from "vitest";
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
    React.createElement("span", {
      "data-testid": "status-punkt",
      "data-fortschritt": fortschritt,
    }),
}));

// Mock ProgressBar to avoid side-effects
vi.mock("@/components/songs/progress-bar", () => ({
  ProgressBar: ({ value }: { value: number }) =>
    React.createElement("div", {
      "data-testid": "progress-bar",
      "data-value": value,
    }),
}));

import { SongCard } from "@/components/songs/song-card";
import type { SongWithProgress } from "@/types/song";

/** Helper to create a SongWithProgress object */
function makeSong(overrides: Partial<SongWithProgress> = {}): SongWithProgress {
  return {
    id: "song-123",
    titel: "Bohemian Rhapsody",
    kuenstler: "Queen",
    sprache: null,
    emotionsTags: [],
    coverUrl: null,
    progress: 42,
    sessionCount: 3,
    status: "aktiv",
    ...overrides,
  };
}

describe("SongCard – Unit-Tests", () => {
  // Anforderung 4.2: Titel-Anzeige
  describe("Titel-Anzeige (4.2)", () => {
    it("zeigt den Song-Titel als Text an", () => {
      const song = makeSong({ titel: "Stairway to Heaven" });
      const { container } = render(React.createElement(SongCard, { song }));
      expect(container.textContent).toContain("Stairway to Heaven");
    });
  });

  // Anforderung 4.3: Künstler-Anzeige
  describe("Künstler-Anzeige (4.3)", () => {
    it("zeigt den Künstlernamen an, wenn vorhanden", () => {
      const song = makeSong({ kuenstler: "Led Zeppelin" });
      const { container } = render(React.createElement(SongCard, { song }));
      expect(container.textContent).toContain("Led Zeppelin");
    });

    it("zeigt keinen Künstlernamen an, wenn null", () => {
      const song = makeSong({ kuenstler: null });
      const { container } = render(React.createElement(SongCard, { song }));
      // Title should still be present, but no artist text
      expect(container.textContent).toContain(song.titel);
      expect(container.textContent).not.toContain("Queen");
    });
  });

  // Anforderung 4.4: StatusPunkt in der oberen rechten Ecke
  describe("StatusPunkt-Position (4.4)", () => {
    it("rendert den StatusPunkt mit dem korrekten Fortschrittswert", () => {
      const song = makeSong({ progress: 75 });
      const { container } = render(React.createElement(SongCard, { song }));
      const statusPunkt = container.querySelector(
        '[data-testid="status-punkt"]'
      );
      expect(statusPunkt).not.toBeNull();
      expect(statusPunkt!.getAttribute("data-fortschritt")).toBe("75");
    });

    it("positioniert den StatusPunkt oben rechts (absolute + top + right)", () => {
      const song = makeSong();
      const { container } = render(React.createElement(SongCard, { song }));
      const statusPunkt = container.querySelector(
        '[data-testid="status-punkt"]'
      );
      // The StatusPunkt is wrapped in a div with positioning classes
      const wrapper = statusPunkt!.parentElement!;
      expect(wrapper.classList.contains("absolute")).toBe(true);
      expect(wrapper.classList.contains("top-2")).toBe(true);
      expect(wrapper.classList.contains("right-2")).toBe(true);
    });
  });

  // Anforderung 4.5: ProgressBar am unteren Rand
  describe("ProgressBar-Anzeige (4.5)", () => {
    it("rendert die ProgressBar mit dem korrekten Fortschrittswert", () => {
      const song = makeSong({ progress: 60 });
      const { container } = render(React.createElement(SongCard, { song }));
      const progressBar = container.querySelector(
        '[data-testid="progress-bar"]'
      );
      expect(progressBar).not.toBeNull();
      expect(progressBar!.getAttribute("data-value")).toBe("60");
    });

    it("ProgressBar ist das letzte Kind-Element im Link", () => {
      const song = makeSong();
      const { container } = render(React.createElement(SongCard, { song }));
      const link = container.querySelector("a")!;
      const lastChild = link.lastElementChild!;
      const progressBar = lastChild.querySelector(
        '[data-testid="progress-bar"]'
      );
      expect(progressBar).not.toBeNull();
    });
  });

  // Anforderung 4.6: Navigation bei Klick
  describe("Navigation bei Klick (4.6)", () => {
    it("rendert einen Link zur Song-Detailseite /songs/{id}", () => {
      const song = makeSong({ id: "abc-456" });
      const { container } = render(React.createElement(SongCard, { song }));
      const link = container.querySelector("a");
      expect(link).not.toBeNull();
      expect(link!.getAttribute("href")).toBe("/songs/abc-456");
    });
  });

  // Anforderung 4.1 & 4.8: Cover-Bild vs. Platzhalter mit Overlay
  describe("Cover-Bild vs. Platzhalter (4.1, 4.8)", () => {
    it("zeigt das Cover-Bild als Hintergrund, wenn coverUrl vorhanden", () => {
      const song = makeSong({
        coverUrl: "/api/uploads/covers/test-cover.jpg",
      });
      const { container } = render(React.createElement(SongCard, { song }));
      const coverDiv = container.querySelector(".bg-cover");
      expect(coverDiv).not.toBeNull();
      expect((coverDiv as HTMLElement).style.backgroundImage).toContain(
        "/api/uploads/covers/test-cover.jpg"
      );
    });

    it("zeigt einen Gradient-Platzhalter, wenn coverUrl null ist", () => {
      const song = makeSong({ coverUrl: null });
      const { container } = render(React.createElement(SongCard, { song }));
      const gradientDiv = container.querySelector(".bg-gradient-to-br");
      expect(gradientDiv).not.toBeNull();
      const coverDiv = container.querySelector(".bg-cover");
      expect(coverDiv).toBeNull();
    });

    it("zeigt ein halbtransparentes Overlay für Textlesbarkeit (4.8)", () => {
      const song = makeSong();
      const { container } = render(React.createElement(SongCard, { song }));
      // The overlay uses bg-gradient-to-t from-black/70
      const overlay = container.querySelector(".from-black\\/70");
      expect(overlay).not.toBeNull();
    });
  });
});
