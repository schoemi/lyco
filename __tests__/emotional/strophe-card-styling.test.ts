/**
 * Tests for StropheCard and RevealLine comment/instrumental styling.
 *
 * Verifies that istKommentar and istInstrumental are properly handled
 * in the emotional/translation/interpretation views.
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const STROPHE_CARD_PATH = path.resolve(
  process.cwd(),
  "src/components/emotional/strophe-card.tsx"
);
const REVEAL_LINE_PATH = path.resolve(
  process.cwd(),
  "src/components/emotional/reveal-line.tsx"
);

const stropheCardSource = fs.readFileSync(STROPHE_CARD_PATH, "utf-8");
const revealLineSrc = fs.readFileSync(REVEAL_LINE_PATH, "utf-8");

describe("StropheCard — Instrumental styling", () => {
  it("applies sky-blue border and background for instrumental strophes", () => {
    expect(stropheCardSource).toContain("border-sky-200 bg-sky-50");
  });

  it("checks strophe.istInstrumental for conditional styling", () => {
    expect(stropheCardSource).toContain("strophe.istInstrumental");
  });

  it("renders an Instrumental badge with music icon", () => {
    expect(stropheCardSource).toContain("Instrumental");
    expect(stropheCardSource).toContain('icon="lucide:music"');
  });

  it("uses sky-100 background for the Instrumental badge", () => {
    expect(stropheCardSource).toContain("bg-sky-100");
    expect(stropheCardSource).toContain("text-sky-700");
  });

  it("falls back to neutral border for non-instrumental strophes", () => {
    expect(stropheCardSource).toContain("border-neutral-200 bg-white");
  });
});

describe("StropheCard — Comment styling in two-column mode", () => {
  it("checks zeile.istKommentar in two-column translation layout", () => {
    expect(stropheCardSource).toContain("zeile.istKommentar");
  });

  it("applies amber styling for comment lines in two-column mode", () => {
    expect(stropheCardSource).toContain("bg-amber-50");
    expect(stropheCardSource).toContain("border-amber-200");
    expect(stropheCardSource).toContain("text-amber-800 italic");
  });
});

describe("StropheCard — Comment styling in hideRevealLines mode", () => {
  it("applies amber styling for comment lines in plain text mode", () => {
    // The hideRevealLines rendering branch should style comments
    expect(stropheCardSource).toMatch(/hideRevealLines[\s\S]*?bg-amber-50/);
    expect(stropheCardSource).toMatch(/hideRevealLines[\s\S]*?text-amber-800 italic/);
  });
});

describe("RevealLine — Comment styling", () => {
  it("checks zeile.istKommentar for conditional styling", () => {
    expect(revealLineSrc).toContain("zeile.istKommentar");
  });

  it("applies amber background and border for comment lines", () => {
    expect(revealLineSrc).toContain("bg-amber-50");
    expect(revealLineSrc).toContain("border-amber-200");
  });

  it("applies amber text color and italic for comment lines", () => {
    expect(revealLineSrc).toContain("text-amber-800 italic");
  });

  it("uses neutral text color for non-comment lines", () => {
    expect(revealLineSrc).toContain("text-neutral-900");
  });
});

describe("StropheCard — imports AppIcon for instrumental badge", () => {
  it("imports AppIcon component", () => {
    expect(stropheCardSource).toContain("AppIcon");
    expect(stropheCardSource).toContain("iconify-icon");
  });
});
