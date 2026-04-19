/**
 * Unit tests for AufnahmeControlsPT component
 * (src/components/phrase-trainer/aufnahme-controls-pt.tsx)
 *
 * Source-based validation since the project uses node environment (no jsdom/RTL).
 *
 * Validates: Requirements 2.1, 2.5, 11.3
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const COMPONENT_PATH = path.resolve(
  process.cwd(),
  "src/components/phrase-trainer/aufnahme-controls-pt.tsx",
);
const source = fs.readFileSync(COMPONENT_PATH, "utf-8");

describe("AufnahmeControlsPT component source", () => {
  it("is a client component", () => {
    expect(source).toContain('"use client"');
  });

  it("exports AufnahmeControlsPT function", () => {
    expect(source).toMatch(/export\s+function\s+AufnahmeControlsPT/);
  });

  it("imports PhrasenTrainerZustand type", () => {
    expect(source).toContain("PhrasenTrainerZustand");
  });
});

describe("AufnahmeControlsPT — Props interface", () => {
  it("accepts zustand prop typed as PhrasenTrainerZustand", () => {
    expect(source).toContain("zustand: PhrasenTrainerZustand");
  });

  it("accepts onStart callback", () => {
    expect(source).toContain("onStart: () => void");
  });

  it("accepts onStop callback", () => {
    expect(source).toContain("onStop: () => void");
  });

  it("accepts onAbbrechen callback", () => {
    expect(source).toContain("onAbbrechen: () => void");
  });

  it("accepts optional disabled prop", () => {
    expect(source).toContain("disabled?: boolean");
  });
});

describe("AufnahmeControlsPT — BEREIT state (Req 2.1)", () => {
  it('shows "Aufnahme starten" button text', () => {
    expect(source).toContain("Aufnahme starten");
  });

  it("renders start button when zustand is BEREIT", () => {
    expect(source).toMatch(/zustand\s*===\s*"BEREIT"/);
  });

  it("calls onStart handler", () => {
    expect(source).toContain("onClick={onStart}");
  });

  it("supports disabled state on start button", () => {
    expect(source).toContain("disabled={disabled}");
  });
});

describe("AufnahmeControlsPT — AUFNAHME state (Req 2.5)", () => {
  it('shows "Aufnahme stoppen" button text', () => {
    expect(source).toContain("Aufnahme stoppen");
  });

  it('shows "Abbrechen" button', () => {
    expect(source).toContain("Abbrechen");
  });

  it("renders stop/cancel buttons when zustand is AUFNAHME", () => {
    expect(source).toMatch(/zustand\s*===\s*"AUFNAHME"/);
  });

  it("calls onStop handler", () => {
    expect(source).toContain("onClick={onStop}");
  });

  it("calls onAbbrechen handler", () => {
    expect(source).toContain("onClick={onAbbrechen}");
  });
});

describe("AufnahmeControlsPT — AUSWAHL and WIEDERGABE states", () => {
  it("returns null for non-recording states", () => {
    expect(source).toContain("return null");
  });
});

describe("AufnahmeControlsPT — Accessibility (Req 11.3)", () => {
  it('has aria-label="Aufnahme starten"', () => {
    expect(source).toContain('aria-label="Aufnahme starten"');
  });

  it('has aria-label="Aufnahme stoppen"', () => {
    expect(source).toContain('aria-label="Aufnahme stoppen"');
  });

  it('has aria-label="Aufnahme abbrechen"', () => {
    expect(source).toContain('aria-label="Aufnahme abbrechen"');
  });

  it("has role=group with aria-label on button containers", () => {
    expect(source).toContain('role="group"');
    expect(source).toContain('aria-label="Aufnahme-Steuerung"');
  });
});

describe("AufnahmeControlsPT — Touch target size", () => {
  it("has minimum height of 44px on all buttons", () => {
    expect(source).toContain("min-h-[44px]");
  });

  it("has minimum width of 44px on all buttons", () => {
    expect(source).toContain("min-w-[44px]");
  });

  it("applies min touch target to every button", () => {
    const buttonMatches = source.match(/<button/g);
    const minHMatches = source.match(/min-h-\[44px\]/g);
    const minWMatches = source.match(/min-w-\[44px\]/g);
    expect(buttonMatches?.length).toBe(minHMatches?.length);
    expect(buttonMatches?.length).toBe(minWMatches?.length);
  });
});
