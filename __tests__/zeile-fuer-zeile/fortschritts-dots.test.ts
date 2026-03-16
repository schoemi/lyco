/**
 * Unit tests for FortschrittsDots component
 *
 * Since the project uses node environment (no jsdom/RTL), we validate
 * the component source for required attributes and behavior patterns.
 *
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 8.2
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const COMPONENT_PATH = path.resolve(
  process.cwd(),
  "src/components/zeile-fuer-zeile/fortschritts-dots.tsx"
);
const source = fs.readFileSync(COMPONENT_PATH, "utf-8");

describe("FortschrittsDots component source", () => {
  it("is a client component", () => {
    expect(source).toContain('"use client"');
  });

  it("exports FortschrittsDots function", () => {
    expect(source).toMatch(/export\s+function\s+FortschrittsDots/);
  });

  it("accepts totalZeilen, currentIndex, and completedIndices props", () => {
    expect(source).toContain("totalZeilen: number");
    expect(source).toContain("currentIndex: number");
    expect(source).toContain("completedIndices: Set<number>");
  });

  it('uses role="progressbar" for accessibility (Req 8.2)', () => {
    expect(source).toContain('role="progressbar"');
  });

  it("sets aria-valuenow from completedIndices.size (Req 8.2)", () => {
    expect(source).toContain("aria-valuenow={completedIndices.size}");
  });

  it("sets aria-valuemax from totalZeilen (Req 8.2)", () => {
    expect(source).toContain("aria-valuemax={totalZeilen}");
  });

  it("renders one dot per line using totalZeilen (Req 5.1)", () => {
    expect(source).toContain("totalZeilen");
    expect(source).toMatch(/Array\.from\(\{.*length:\s*totalZeilen/s);
  });

  it("uses bg-purple-600 for the active/current dot (Req 5.2)", () => {
    expect(source).toContain("bg-purple-600");
  });

  it("uses bg-green-500 for completed dots (Req 5.3)", () => {
    expect(source).toContain("bg-green-500");
  });

  it("uses border-gray-300 for pending dots (Req 5.4)", () => {
    expect(source).toContain("border-gray-300");
  });

  it("checks completedIndices.has(i) for completed state", () => {
    expect(source).toContain("completedIndices.has(i)");
  });

  it("checks currentIndex for active state", () => {
    expect(source).toMatch(/i\s*===\s*currentIndex/);
  });

  it("renders dots as rounded-full spans", () => {
    expect(source).toContain("rounded-full");
    expect(source).toContain("<span");
  });
});
