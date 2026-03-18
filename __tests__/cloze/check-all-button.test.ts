/**
 * Unit tests for CheckAllButton component (src/components/cloze/check-all-button.tsx)
 *
 * Since the project uses node environment (no jsdom/RTL), we validate
 * the component source for required attributes and behavior patterns.
 *
 * Validates: Requirements 6.1, 6.3, 9.5
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const COMPONENT_PATH = path.resolve(
  process.cwd(),
  "src/components/cloze/check-all-button.tsx"
);
const source = fs.readFileSync(COMPONENT_PATH, "utf-8");

describe("CheckAllButton component source", () => {
  it("is a client component", () => {
    expect(source).toContain('"use client"');
  });

  it("exports CheckAllButton function", () => {
    expect(source).toMatch(/export\s+function\s+CheckAllButton/);
  });

  it("implements CheckAllButtonProps interface with disabled and onClick", () => {
    expect(source).toContain("disabled: boolean");
    expect(source).toContain("onClick: () => void");
  });

  it('displays button text "Alle prüfen" (Req 6.1)', () => {
    expect(source).toContain("Alle prüfen");
  });

  it("uses primary purple styling with full width (Req 6.1)", () => {
    expect(source).toContain("w-full");
    expect(source).toContain("bg-primary-600");
    expect(source).toContain("text-white");
    expect(source).toContain("py-3");
    expect(source).toContain("rounded-lg");
    expect(source).toContain("font-medium");
  });

  it("supports disabled state styling (Req 6.3)", () => {
    expect(source).toContain("disabled:opacity-50");
    expect(source).toContain("disabled:cursor-not-allowed");
  });

  it("passes disabled prop to button element (Req 6.3)", () => {
    expect(source).toMatch(/disabled=\{disabled\}/);
  });

  it("is a native button element for keyboard accessibility (Req 9.5)", () => {
    expect(source).toContain("<button");
    expect(source).toContain('type="button"');
  });

  it("passes onClick handler to button element", () => {
    expect(source).toMatch(/onClick=\{onClick\}/);
  });
});
