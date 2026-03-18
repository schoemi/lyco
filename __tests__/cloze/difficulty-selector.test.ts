/**
 * Unit tests for DifficultySelector component (src/components/cloze/difficulty-selector.tsx)
 *
 * Since the project uses node environment (no jsdom/RTL), we validate
 * the component source for required attributes and behavior patterns.
 *
 * Validates: Requirements 3.1, 3.2, 9.4, 10.2
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const COMPONENT_PATH = path.resolve(
  process.cwd(),
  "src/components/cloze/difficulty-selector.tsx"
);
const source = fs.readFileSync(COMPONENT_PATH, "utf-8");

describe("DifficultySelector component source", () => {
  it("is a client component", () => {
    expect(source).toContain('"use client"');
  });

  it("exports DifficultySelector function", () => {
    expect(source).toMatch(/export\s+function\s+DifficultySelector/);
  });

  it("renders all four difficulty labels (Req 3.1)", () => {
    expect(source).toContain("Leicht");
    expect(source).toContain("Mittel");
    expect(source).toContain("Schwer");
    expect(source).toContain("Blind");
  });

  it("maps all four DifficultyLevel values (Req 3.1)", () => {
    expect(source).toContain('"leicht"');
    expect(source).toContain('"mittel"');
    expect(source).toContain('"schwer"');
    expect(source).toContain('"blind"');
  });

  it("uses purple background for active button (Req 3.2)", () => {
    expect(source).toContain("bg-primary-600");
    expect(source).toContain("text-white");
  });

  it("uses gray background for inactive buttons (Req 3.2)", () => {
    expect(source).toContain("bg-neutral-100");
    expect(source).toContain("text-neutral-700");
    expect(source).toContain("hover:bg-neutral-200");
  });

  it('has role="radiogroup" with aria-label (Req 9.4)', () => {
    expect(source).toContain('role="radiogroup"');
    expect(source).toContain('aria-label="Schwierigkeitsstufe"');
  });

  it('each button has role="radio" with aria-checked (Req 9.4)', () => {
    expect(source).toContain('role="radio"');
    expect(source).toContain("aria-checked");
  });

  it("uses grid-cols-2 for mobile and grid-cols-4 for desktop (Req 10.2)", () => {
    expect(source).toContain("grid-cols-2");
    expect(source).toContain("sm:grid-cols-4");
  });

  it("uses grid layout", () => {
    expect(source).toMatch(/className.*grid/s);
  });

  it("calls onChange when a button is clicked", () => {
    expect(source).toContain("onChange(value)");
  });

  it("implements DifficultySelectorProps interface correctly", () => {
    expect(source).toContain("active: DifficultyLevel");
    expect(source).toContain("onChange: (level: DifficultyLevel) => void");
  });

  it("imports DifficultyLevel from cloze types", () => {
    expect(source).toContain('@/types/cloze"');
    expect(source).toContain("DifficultyLevel");
  });

  it("determines active state by comparing active prop with value", () => {
    expect(source).toMatch(/active\s*===\s*value/);
  });
});
