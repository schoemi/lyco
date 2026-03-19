/**
 * Unit tests for AufnahmeControls component
 * (src/components/vocal-trainer/aufnahme-controls.tsx)
 *
 * Source-based validation since the project uses node environment (no jsdom/RTL).
 *
 * Validates: Requirements 4.1, 4.6, 4.7, 14.2, 14.5
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const COMPONENT_PATH = path.resolve(
  process.cwd(),
  "src/components/vocal-trainer/aufnahme-controls.tsx"
);
const source = fs.readFileSync(COMPONENT_PATH, "utf-8");

describe("AufnahmeControls component source", () => {
  it("is a client component", () => {
    expect(source).toContain('"use client"');
  });

  it("exports AufnahmeControls function", () => {
    expect(source).toMatch(/export\s+function\s+AufnahmeControls/);
  });

  it("imports AufnahmeZustand type", () => {
    expect(source).toContain("AufnahmeZustand");
  });
});

describe("AufnahmeControls — Props interface", () => {
  it("accepts zustand prop", () => {
    expect(source).toContain("zustand: AufnahmeZustand");
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

  it("accepts onNeueAufnahme callback", () => {
    expect(source).toContain("onNeueAufnahme: () => void");
  });

  it("accepts optional disabled prop", () => {
    expect(source).toContain("disabled?: boolean");
  });
});

describe("AufnahmeControls — BEREIT state (Req 4.1)", () => {
  it('shows "Aufnahme starten" button text', () => {
    expect(source).toContain("Aufnahme starten");
  });

  it("calls onStart handler", () => {
    expect(source).toContain("onStart");
  });

  it("supports disabled state", () => {
    expect(source).toContain("disabled={disabled}");
  });
});

describe("AufnahmeControls — AUFNAHME state (Req 4.6, 4.7)", () => {
  it('shows "Aufnahme stoppen" button text', () => {
    expect(source).toContain("Aufnahme stoppen");
  });

  it('shows "Abbrechen" button', () => {
    expect(source).toContain("Abbrechen");
  });

  it("calls onStop handler", () => {
    expect(source).toContain("onStop");
  });

  it("calls onAbbrechen handler", () => {
    expect(source).toContain("onAbbrechen");
  });
});

describe("AufnahmeControls — ANALYSE state", () => {
  it("returns null during ANALYSE", () => {
    expect(source).toMatch(/zustand\s*===\s*"ANALYSE"/);
    expect(source).toContain("return null");
  });
});

describe("AufnahmeControls — ERGEBNIS state", () => {
  it('shows "Neue Aufnahme starten" button text', () => {
    expect(source).toContain("Neue Aufnahme starten");
  });

  it("calls onNeueAufnahme handler", () => {
    expect(source).toContain("onNeueAufnahme");
  });
});

describe("AufnahmeControls — aria-labels (Req 14.2)", () => {
  it('has aria-label="Aufnahme starten"', () => {
    expect(source).toContain('aria-label="Aufnahme starten"');
  });

  it('has aria-label="Aufnahme stoppen"', () => {
    expect(source).toContain('aria-label="Aufnahme stoppen"');
  });

  it('has aria-label="Neue Aufnahme starten"', () => {
    expect(source).toContain('aria-label="Neue Aufnahme starten"');
  });

  it('has aria-label="Aufnahme abbrechen"', () => {
    expect(source).toContain('aria-label="Aufnahme abbrechen"');
  });
});

describe("AufnahmeControls — Touch target size (Req 14.5)", () => {
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
