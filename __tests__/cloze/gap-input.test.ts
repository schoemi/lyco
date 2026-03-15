/**
 * Unit tests for GapInput component (src/components/cloze/gap-input.tsx)
 * 
 * Since the project uses node environment (no jsdom/RTL), we validate
 * the component source for required attributes and behavior patterns.
 * 
 * Validates: Requirements 4.1, 4.2, 4.4, 4.5, 4.6, 4.7, 9.1, 9.2, 9.3, 10.3
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const COMPONENT_PATH = path.resolve(
  process.cwd(),
  "src/components/cloze/gap-input.tsx"
);
const source = fs.readFileSync(COMPONENT_PATH, "utf-8");

describe("GapInput component source", () => {
  it("is a client component", () => {
    expect(source).toContain('"use client"');
  });

  it("exports GapInput function", () => {
    expect(source).toMatch(/export\s+function\s+GapInput/);
  });

  it("has purple border-bottom by default (Req 4.1)", () => {
    expect(source).toContain("border-purple-500");
  });

  it("uses border-b-2 with border-0 for bottom-only border (Req 4.1)", () => {
    expect(source).toContain("border-0");
    expect(source).toContain("border-b-2");
  });

  it("has minimum width of 60px (Req 4.1)", () => {
    expect(source).toContain("min-w-[60px]");
  });

  it("uses placeholder '···' (Req 4.1)", () => {
    expect(source).toContain("···");
  });

  it("generates hint placeholder using generateHint (Req 7.2)", () => {
    expect(source).toContain("generateHint");
  });

  it("sets readOnly when feedback is correct (Req 4.6)", () => {
    expect(source).toMatch(/readOnly.*isCorrect|readOnly.*===.*"correct"/s);
  });

  it("applies green styling for correct feedback (Req 4.4)", () => {
    expect(source).toContain("border-green-500");
    expect(source).toContain("text-green-600");
  });

  it("applies red styling for incorrect feedback (Req 4.5)", () => {
    expect(source).toContain("border-red-500");
    expect(source).toContain("text-red-600");
  });

  it("accepts ariaLabel prop and applies it (Req 9.1)", () => {
    expect(source).toContain("ariaLabel");
    expect(source).toContain("aria-label");
  });

  it("has aria-live='polite' for feedback announcements (Req 9.2, 9.3)", () => {
    expect(source).toContain('aria-live="polite"');
  });

  it("announces 'Richtig' for correct feedback (Req 9.2)", () => {
    expect(source).toContain("Richtig");
  });

  it("announces 'Falsch' for incorrect feedback (Req 9.3)", () => {
    expect(source).toContain("Falsch");
  });

  it("has minimum touch target of 44px height (Req 10.3)", () => {
    expect(source).toContain("min-h-[44px]");
  });

  it("uses size attribute for dynamic width (Req 4.2)", () => {
    expect(source).toContain("size={size}");
    expect(source).toMatch(/size\s*=\s*Math\.max/);
  });

  it("implements GapInputProps interface correctly", () => {
    expect(source).toContain("gapId: string");
    expect(source).toContain("targetWord: string");
    expect(source).toContain('feedback: "correct" | "incorrect" | null');
    expect(source).toContain("hintActive: boolean");
    expect(source).toContain("onChange: (value: string) => void");
    expect(source).toContain("onBlur: () => void");
  });
});
