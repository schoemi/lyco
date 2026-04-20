/**
 * @vitest-environment jsdom
 */

/**
 * Unit tests for BeatCounter component — both variants, placeholder, and snapshot tests.
 *
 * Requirements: 1.1, 1.2, 1.5, 4.1, 4.2, 5.1, 5.3
 */
import { describe, it, expect, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { BeatCounter } from "@/components/songs/beat-counter";

afterEach(() => {
  cleanup();
});

const beats = [0, 500, 1000, 1500, 2000, 2500, 3000, 3500];

describe("BeatCounter", () => {
  describe("variant='light' (default)", () => {
    it("renders takt.schlag when currentTimeMs is at a beat", () => {
      // Beat index 5 with taktZaehler=4 → Takt 2, Schlag 2
      render(
        React.createElement(BeatCounter, {
          beatPositionenMs: beats,
          currentTimeMs: 2500,
          taktZaehler: 4,
        }),
      );

      const el = screen.getByLabelText("Takt 2, Schlag 2");
      expect(el).toBeDefined();
      expect(el.textContent).toBe("2.2");
    });

    it("renders placeholder when currentTimeMs is before first beat", () => {
      render(
        React.createElement(BeatCounter, {
          beatPositionenMs: [1000, 2000],
          currentTimeMs: 500,
        }),
      );

      const el = screen.getByLabelText("Kein aktiver Takt");
      expect(el).toBeDefined();
      expect(el.textContent).toBe("—");
    });

    it("renders placeholder when beatPositionenMs is empty", () => {
      render(
        React.createElement(BeatCounter, {
          beatPositionenMs: [],
          currentTimeMs: 5000,
        }),
      );

      const el = screen.getByLabelText("Kein aktiver Takt");
      expect(el).toBeDefined();
      expect(el.textContent).toBe("—");
    });

    it("uses a <span> element for light variant", () => {
      const { container } = render(
        React.createElement(BeatCounter, {
          beatPositionenMs: beats,
          currentTimeMs: 1000,
        }),
      );

      expect(container.firstElementChild!.tagName).toBe("SPAN");
    });

    it("applies light styling classes", () => {
      const { container } = render(
        React.createElement(BeatCounter, {
          beatPositionenMs: beats,
          currentTimeMs: 1000,
        }),
      );

      const el = container.firstElementChild!;
      expect(el.className).toContain("rounded-md");
      expect(el.className).toContain("bg-neutral-100");
      expect(el.className).toContain("text-neutral-700");
      expect(el.className).toContain("tabular-nums");
      expect(el.className).toContain("font-mono");
    });

    it("snapshot — light active", () => {
      const { container } = render(
        React.createElement(BeatCounter, {
          beatPositionenMs: beats,
          currentTimeMs: 2500,
          taktZaehler: 4,
        }),
      );

      expect(container.innerHTML).toMatchSnapshot();
    });

    it("snapshot — light placeholder", () => {
      const { container } = render(
        React.createElement(BeatCounter, {
          beatPositionenMs: [],
          currentTimeMs: 0,
        }),
      );

      expect(container.innerHTML).toMatchSnapshot();
    });
  });

  describe("variant='dark'", () => {
    it("renders takt.schlag when currentTimeMs is at a beat", () => {
      render(
        React.createElement(BeatCounter, {
          beatPositionenMs: beats,
          currentTimeMs: 2500,
          taktZaehler: 4,
          variant: "dark",
        }),
      );

      const el = screen.getByLabelText("Takt 2, Schlag 2");
      expect(el).toBeDefined();
      expect(el.textContent).toBe("2.2");
    });

    it("renders placeholder when no active beat", () => {
      render(
        React.createElement(BeatCounter, {
          beatPositionenMs: [1000, 2000],
          currentTimeMs: 500,
          variant: "dark",
        }),
      );

      const el = screen.getByLabelText("Kein aktiver Takt");
      expect(el).toBeDefined();
      expect(el.textContent).toBe("—");
    });

    it("uses a <div> element for dark variant", () => {
      const { container } = render(
        React.createElement(BeatCounter, {
          beatPositionenMs: beats,
          currentTimeMs: 1000,
          variant: "dark",
        }),
      );

      expect(container.firstElementChild!.tagName).toBe("DIV");
    });

    it("applies dark styling classes", () => {
      const { container } = render(
        React.createElement(BeatCounter, {
          beatPositionenMs: beats,
          currentTimeMs: 1000,
          variant: "dark",
        }),
      );

      const el = container.firstElementChild!;
      expect(el.className).toContain("rounded-full");
      expect(el.className).toContain("bg-white/10");
      expect(el.className).toContain("text-white/90");
      expect(el.className).toContain("font-bold");
    });

    it("snapshot — dark active", () => {
      const { container } = render(
        React.createElement(BeatCounter, {
          beatPositionenMs: beats,
          currentTimeMs: 2500,
          taktZaehler: 4,
          variant: "dark",
        }),
      );

      expect(container.innerHTML).toMatchSnapshot();
    });

    it("snapshot — dark placeholder", () => {
      const { container } = render(
        React.createElement(BeatCounter, {
          beatPositionenMs: [],
          currentTimeMs: 0,
          variant: "dark",
        }),
      );

      expect(container.innerHTML).toMatchSnapshot();
    });
  });

  describe("default taktZaehler", () => {
    it("uses taktZaehler=4 when not specified", () => {
      // Beat index 4 with default taktZaehler=4 → Takt 2, Schlag 1
      render(
        React.createElement(BeatCounter, {
          beatPositionenMs: beats,
          currentTimeMs: 2000,
        }),
      );

      const el = screen.getByLabelText("Takt 2, Schlag 1");
      expect(el).toBeDefined();
      expect(el.textContent).toBe("2.1");
    });
  });

  describe("takt/schlag display format", () => {
    it("displays format '{taktNummer}.{schlagImTakt}'", () => {
      // Beat index 6 with taktZaehler=3 → Takt 3, Schlag 1
      render(
        React.createElement(BeatCounter, {
          beatPositionenMs: beats,
          currentTimeMs: 3000,
          taktZaehler: 3,
        }),
      );

      const el = screen.getByLabelText("Takt 3, Schlag 1");
      expect(el.textContent).toBe("3.1");
    });
  });
});
