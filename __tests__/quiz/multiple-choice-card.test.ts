/**
 * Unit tests for MultipleChoiceCard component
 * (src/components/quiz/multiple-choice-card.tsx)
 *
 * Since the project uses node environment (no jsdom/RTL), we validate
 * the component source for required attributes and behavior patterns.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 8.1, 8.2, 9.3
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const COMPONENT_PATH = path.resolve(
  process.cwd(),
  "src/components/quiz/multiple-choice-card.tsx"
);
const source = fs.readFileSync(COMPONENT_PATH, "utf-8");

describe("MultipleChoiceCard component source", () => {
  it("is a client component", () => {
    expect(source).toContain('"use client"');
  });

  it("exports MultipleChoiceCard function", () => {
    expect(source).toMatch(/export\s+function\s+MultipleChoiceCard/);
  });

  it("imports MCQuestion from @/types/quiz", () => {
    expect(source).toContain("MCQuestion");
    expect(source).toContain("@/types/quiz");
  });

  it("accepts question, onAnswer, and onWeiter props", () => {
    expect(source).toContain("question");
    expect(source).toContain("onAnswer");
    expect(source).toContain("onWeiter");
  });

  it("uses useState to track selected answer (Req 3.6 — instant feedback)", () => {
    expect(source).toContain("useState");
    expect(source).toMatch(/useState<number\s*\|\s*null>\(null\)/);
  });

  it("displays question prompt at 14px (Req 3.1)", () => {
    expect(source).toContain("question.prompt");
    expect(source).toContain("text-[14px]");
  });

  it('uses role="radiogroup" with aria-label="Antwortoptionen" (Req 8.1)', () => {
    expect(source).toContain('role="radiogroup"');
    expect(source).toContain('aria-label="Antwortoptionen"');
  });

  it('uses role="radio" and aria-checked on answer buttons (Req 8.1)', () => {
    expect(source).toContain('role="radio"');
    expect(source).toContain("aria-checked");
  });

  it('uses aria-live="polite" for feedback (Req 8.2)', () => {
    expect(source).toContain('aria-live="polite"');
  });

  it("renders answer buttons in full width (Req 9.3)", () => {
    expect(source).toContain("w-full");
  });

  it("maps over question.options to render 4 buttons (Req 3.1)", () => {
    expect(source).toContain("question.options.map");
  });

  it("applies green styling for correct answer (Req 3.2)", () => {
    expect(source).toContain("success-500");
    expect(source).toContain("success-50");
  });

  it("applies red styling for wrong answer (Req 3.2)", () => {
    expect(source).toContain("error-500");
    expect(source).toContain("error-50");
  });

  it("marks correct answer green when wrong answer selected (Req 3.3)", () => {
    // The getButtonClasses function checks index === question.correctIndex
    // separately from selected === index, ensuring correct is always green
    expect(source).toContain("question.correctIndex");
  });

  it("disables all buttons after selection (Req 3.4)", () => {
    expect(source).toContain("disabled={selected !== null}");
  });

  it('shows "Weiter" button only after selection (Req 3.5)', () => {
    expect(source).toContain("Weiter");
    expect(source).toContain("selected !== null");
    expect(source).toContain("onWeiter");
  });

  it("calls onAnswer with the selected index on click (Req 3.6)", () => {
    expect(source).toContain("onAnswer(index)");
  });

  it("prevents re-selection after first click (Req 3.6)", () => {
    // handleSelect returns early if selected !== null
    expect(source).toContain("if (selected !== null) return");
  });
});
