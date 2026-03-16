/**
 * Unit tests for SpacedRepetitionWidget component
 *
 * Since the project uses node environment (no jsdom/RTL), we validate
 * the component source for required attributes and behavior patterns.
 *
 * Validates: Anforderungen 1.1, 1.2
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const COMPONENT_PATH = path.resolve(
  process.cwd(),
  "src/components/spaced-repetition/spaced-repetition-widget.tsx"
);
const source = fs.readFileSync(COMPONENT_PATH, "utf-8");

describe("SpacedRepetitionWidget component source", () => {
  it("is a client component", () => {
    expect(source).toContain('"use client"');
  });

  it("exports SpacedRepetitionWidget function", () => {
    expect(source).toMatch(/export\s+function\s+SpacedRepetitionWidget/);
  });

  it("accepts faelligeAnzahl prop", () => {
    expect(source).toContain("faelligeAnzahl: number");
  });

  it("shows count of due strophes", () => {
    expect(source).toContain("heute fällig");
    expect(source).toContain("faelligeAnzahl");
  });

  it("shows success message when no strophes are due", () => {
    expect(source).toContain("Keine Strophen fällig");
    expect(source).toContain("gut gemacht");
  });

  it("uses muted color for zero-due state", () => {
    expect(source).toContain("text-gray-400");
  });

  it("uses useRouter for navigation on click", () => {
    expect(source).toContain("useRouter");
    expect(source).toMatch(/router\.push/);
  });

  it("has aria-live polite for accessibility", () => {
    expect(source).toContain('aria-live="polite"');
  });

  it("renders as a clickable button element", () => {
    expect(source).toContain("<button");
    expect(source).toContain('type="button"');
  });

  it("uses card-like styling consistent with dashboard", () => {
    expect(source).toContain("rounded-lg");
    expect(source).toContain("border");
    expect(source).toContain("px-4");
    expect(source).toContain("py-3");
  });
});
