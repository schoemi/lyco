/**
 * Unit tests for ScorePill component (src/components/cloze/score-pill.tsx)
 *
 * Since the project uses node environment (no jsdom/RTL), we validate
 * the component source for required attributes and behavior patterns.
 *
 * Validates: Requirements 1.5, 5.1
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const COMPONENT_PATH = path.resolve(
  process.cwd(),
  "src/components/cloze/score-pill.tsx"
);
const source = fs.readFileSync(COMPONENT_PATH, "utf-8");

describe("ScorePill component source", () => {
  it("is a client component", () => {
    expect(source).toContain('"use client"');
  });

  it("exports ScorePill function", () => {
    expect(source).toMatch(/export\s+function\s+ScorePill/);
  });

  it("implements ScorePillProps interface with correct and total", () => {
    expect(source).toContain("correct: number");
    expect(source).toContain("total: number");
  });

  it('displays "N / M richtig" format (Req 1.5, 5.1)', () => {
    expect(source).toContain("richtig");
    expect(source).toMatch(/\{correct\}.*\/.*\{total\}.*richtig/s);
  });

  it("uses green pill styling (Req 1.5)", () => {
    expect(source).toContain("bg-green-100");
    expect(source).toContain("text-green-700");
    expect(source).toContain("rounded-full");
  });

  it("has pill padding and font styling", () => {
    expect(source).toContain("px-3");
    expect(source).toContain("py-1");
    expect(source).toContain("text-sm");
    expect(source).toContain("font-medium");
  });
});
