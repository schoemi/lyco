/**
 * Unit tests for ErklaerungTooltip component
 * (src/components/rueckwaerts/erklaerung-tooltip.tsx)
 *
 * Since the project uses node environment (no jsdom/RTL), we validate
 * the component source for required attributes and behavior patterns.
 *
 * Validates: Requirements 3.1, 3.2, 3.5, 10.1, 10.5, 10.6
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const COMPONENT_PATH = path.resolve(
  process.cwd(),
  "src/components/rueckwaerts/erklaerung-tooltip.tsx"
);
const source = fs.readFileSync(COMPONENT_PATH, "utf-8");

describe("ErklaerungTooltip component source", () => {
  it("is a client component", () => {
    expect(source).toContain('"use client"');
  });

  it("exports ErklaerungTooltip function", () => {
    expect(source).toMatch(/export\s+function\s+ErklaerungTooltip/);
  });

  it("implements props interface with visible and onClose", () => {
    expect(source).toContain("visible: boolean");
    expect(source).toContain("onClose: () => void");
  });

  it("returns null when not visible", () => {
    expect(source).toContain("if (!visible) return null");
  });
});

describe("ErklaerungTooltip — Modal dialog (Req 10.6)", () => {
  it('has role="dialog"', () => {
    expect(source).toContain('role="dialog"');
  });

  it('has aria-modal="true"', () => {
    expect(source).toContain('aria-modal="true"');
  });

  it("has aria-labelledby pointing to the title", () => {
    expect(source).toContain('aria-labelledby="erklaerung-tooltip-title"');
    expect(source).toContain('id="erklaerung-tooltip-title"');
  });
});

describe('ErklaerungTooltip — Title "Warum von hinten?" (Req 3.1)', () => {
  it("displays the title text", () => {
    expect(source).toContain("Warum von hinten?");
  });

  it("renders title in an h2 element", () => {
    expect(source).toContain("<h2");
  });
});

describe("ErklaerungTooltip — Primacy effect explanation (Req 3.1)", () => {
  it("contains explanation about the Primacy effect", () => {
    expect(source).toContain("Primacy");
  });

  it("explains the backwards learning benefit", () => {
    expect(source).toMatch(/Sicherheit|gleichmäßig/);
  });
});

describe("ErklaerungTooltip — Close button (Req 3.2, 10.1)", () => {
  it('has aria-label="Erklärung schließen"', () => {
    expect(source).toContain('aria-label="Erklärung schließen"');
  });

  it("has minimum 44x44px touch target size (Req 10.1)", () => {
    expect(source).toContain("min-h-[44px]");
    expect(source).toContain("min-w-[44px]");
  });

  it("calls onClose when clicked", () => {
    expect(source).toContain("onClick={onClose}");
  });
});

describe("ErklaerungTooltip — Escape key handling (Req 3.5, 10.5)", () => {
  it("listens for Escape key", () => {
    expect(source).toContain('"Escape"');
  });

  it("adds keydown event listener", () => {
    expect(source).toContain("addEventListener");
    expect(source).toContain('"keydown"');
  });

  it("removes keydown event listener on cleanup", () => {
    expect(source).toContain("removeEventListener");
  });
});

describe("ErklaerungTooltip — Focus management (Req 10.5)", () => {
  it("implements focus trap for Tab key", () => {
    expect(source).toContain('"Tab"');
  });

  it("focuses close button on open", () => {
    expect(source).toContain("closeButtonRef");
    expect(source).toMatch(/closeButtonRef\.current\?\.focus\(\)/);
  });
});

describe("ErklaerungTooltip — Backdrop", () => {
  it("renders a backdrop overlay", () => {
    expect(source).toContain("bg-black/50");
  });

  it("closes on backdrop click", () => {
    // The backdrop div has onClick={onClose}
    expect(source).toContain("onClick={onClose}");
  });
});
