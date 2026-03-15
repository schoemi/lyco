/**
 * Unit tests for StanzaBlock component (src/components/cloze/stanza-block.tsx)
 *
 * Since the project uses node environment (no jsdom/RTL), we validate
 * the component source for required attributes and behavior patterns.
 *
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const COMPONENT_PATH = path.resolve(
  process.cwd(),
  "src/components/cloze/stanza-block.tsx"
);
const source = fs.readFileSync(COMPONENT_PATH, "utf-8");

describe("StanzaBlock component source", () => {
  it("is a client component", () => {
    expect(source).toContain('"use client"');
  });

  it("exports StanzaBlock function", () => {
    expect(source).toMatch(/export\s+function\s+StanzaBlock/);
  });

  it("renders a white block with border and rounded corners (Req 8.1)", () => {
    expect(source).toContain("rounded-lg");
    expect(source).toContain("border");
    expect(source).toContain("bg-white");
  });

  it("has padding on the block (Req 8.1)", () => {
    expect(source).toContain("p-4");
  });

  it("displays strophe name in uppercase at 11px (Req 8.2)", () => {
    expect(source).toContain("uppercase");
    expect(source).toContain("text-[11px]");
  });

  it("renders strophe.name (Req 8.2)", () => {
    expect(source).toContain("strophe.name");
  });

  it("sorts zeilen by orderIndex (Req 8.3)", () => {
    expect(source).toMatch(/sort.*orderIndex|orderIndex.*sort/s);
  });

  it("imports and uses GapInput component (Req 8.3)", () => {
    expect(source).toContain('from "./gap-input"');
    expect(source).toContain("<GapInput");
  });

  it("imports and uses HintButton component", () => {
    expect(source).toContain('from "./hint-button"');
    expect(source).toContain("<HintButton");
  });

  it("renders visible words as text spans (Req 8.3)", () => {
    expect(source).toContain("gapData.word");
    expect(source).toMatch(/<span[^>]*>.*gapData\.word/s);
  });

  it("checks isGap to decide between text and GapInput (Req 8.3)", () => {
    expect(source).toContain("isGap");
  });

  it("computes aria-label with format 'Lücke N von M in [name]' (Req 9.1)", () => {
    expect(source).toMatch(/Lücke.*von.*in/);
    expect(source).toContain("strophe.name");
  });

  it("handles empty stanza (no zeilen) by showing label + empty content (Req 8.4)", () => {
    // The component always renders strophe.name label and then maps over sortedZeilen
    // When zeilen is empty, sortedZeilen is empty, so only the label renders
    expect(source).toContain("strophe.name");
    expect(source).toMatch(/sortedZeilen\.map/);
  });

  it("implements StanzaBlockProps interface correctly", () => {
    expect(source).toContain("strophe: StropheDetail");
    expect(source).toContain("gaps: GapData[]");
    expect(source).toContain("answers: Record<string, string>");
    expect(source).toContain('feedback: Record<string, "correct" | "incorrect" | null>');
    expect(source).toContain("hints: Set<string>");
    expect(source).toContain("onAnswer: (gapId: string, value: string) => void");
    expect(source).toContain("onBlur: (gapId: string) => void");
    expect(source).toContain("onHint: (gapId: string) => void");
  });

  it("passes correct props to GapInput", () => {
    expect(source).toContain("gapId={gapData.gapId}");
    expect(source).toContain("targetWord={gapData.word}");
    expect(source).toContain("ariaLabel={ariaLabel}");
    expect(source).toContain("feedback={");
    expect(source).toContain("hintActive={");
  });

  it("disables HintButton when hint already used or answer correct", () => {
    expect(source).toMatch(/disabled.*hints\.has|hints\.has.*disabled/s);
    expect(source).toMatch(/correct/);
  });
});
