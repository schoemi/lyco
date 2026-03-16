/**
 * Unit tests for StrophenNavigator component
 * (src/components/zeile-fuer-zeile/strophen-navigator.tsx)
 *
 * Source-based validation since the project uses node environment.
 *
 * Validates: Requirements 6.1, 6.2, 6.5, 6.6, 8.1, 8.4, 8.5
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const COMPONENT_PATH = path.resolve(
  process.cwd(),
  "src/components/zeile-fuer-zeile/strophen-navigator.tsx"
);
const source = fs.readFileSync(COMPONENT_PATH, "utf-8");

describe("StrophenNavigator component source", () => {
  it("is a client component", () => {
    expect(source).toContain('"use client"');
  });

  it("exports StrophenNavigator function", () => {
    expect(source).toMatch(/export\s+function\s+StrophenNavigator/);
  });

  it("implements StrophenNavigatorProps with all required props", () => {
    expect(source).toContain("currentStropheName: string");
    expect(source).toContain("currentPosition: number");
    expect(source).toContain("totalStrophen: number");
    expect(source).toContain("canGoBack: boolean");
    expect(source).toContain("canGoForward: boolean");
    expect(source).toContain("onPrevious: () => void");
    expect(source).toContain("onNext: () => void");
  });

  it("shows strophe name (Req 6.2)", () => {
    expect(source).toContain("{currentStropheName}");
  });

  it('shows position like "Strophe X von Y" (Req 6.2)', () => {
    expect(source).toContain("{currentPosition}");
    expect(source).toContain("{totalStrophen}");
    expect(source).toMatch(/Strophe\s*\{currentPosition\}\s*von\s*\{totalStrophen\}/);
  });

  it("renders left/right arrow buttons (Req 6.1)", () => {
    expect(source).toContain("←");
    expect(source).toContain("→");
    expect(source).toContain("<button");
  });

  it("disables back button via canGoBack (Req 6.5)", () => {
    expect(source).toContain("disabled={!canGoBack}");
  });

  it("disables forward button via canGoForward (Req 6.6)", () => {
    expect(source).toContain("disabled={!canGoForward}");
  });

  it("has aria-label on previous arrow (Req 8.1)", () => {
    expect(source).toContain('aria-label="Vorherige Strophe"');
  });

  it("has aria-label on next arrow (Req 8.1)", () => {
    expect(source).toContain('aria-label="Nächste Strophe"');
  });

  it("has minimum touch target size 44x44px on buttons (Req 8.4)", () => {
    expect(source).toContain("min-h-[44px]");
    expect(source).toContain("min-w-[44px]");
  });

  it("calls onPrevious on back button click", () => {
    expect(source).toContain("onClick={onPrevious}");
  });

  it("calls onNext on forward button click", () => {
    expect(source).toContain("onClick={onNext}");
  });
});
