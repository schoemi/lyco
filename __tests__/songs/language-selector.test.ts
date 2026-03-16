/**
 * Unit tests for LanguageSelector component.
 *
 * Uses fs.readFileSync string-matching (node environment, no jsdom).
 *
 * Validates: Requirements 2.2, 6.2, 6.5
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const COMPONENT_PATH = path.resolve(
  process.cwd(),
  "src/components/songs/language-selector.tsx"
);
const source = fs.readFileSync(COMPONENT_PATH, "utf-8");

describe("LanguageSelector component source", () => {
  // --- All 6 languages present as options (Req 2.2) ---

  it('has "Deutsch" as a language option', () => {
    expect(source).toContain('"Deutsch"');
  });

  it('has "Englisch" as a language option', () => {
    expect(source).toContain('"Englisch"');
  });

  it('has "Spanisch" as a language option', () => {
    expect(source).toContain('"Spanisch"');
  });

  it('has "Französisch" as a language option', () => {
    expect(source).toContain('"Französisch"');
  });

  it('has "Italienisch" as a language option', () => {
    expect(source).toContain('"Italienisch"');
  });

  it('has "Portugiesisch" as a language option', () => {
    expect(source).toContain('"Portugiesisch"');
  });

  it("defines exactly 6 languages in SPRACHEN array", () => {
    const matches = source.match(/\{ value: ".*?", label: ".*?" \}/g);
    expect(matches).toHaveLength(6);
  });

  // --- onChange is called on selection (Req 2.2) ---

  it("calls onChange when selection changes", () => {
    expect(source).toContain("onChange: (sprache: string) => void");
    expect(source).toMatch(/onChange\s*\(\s*e\.target\.value\s*\)/);
  });

  // --- aria-label correctly set (Req 6.2) ---

  it('has aria-label="Zielsprache auswählen"', () => {
    expect(source).toContain('aria-label="Zielsprache auswählen"');
  });

  // --- Label element for accessibility (Req 6.2) ---

  it("has a label element with htmlFor", () => {
    expect(source).toContain("htmlFor");
    expect(source).toContain("<label");
  });

  // --- Keyboard accessible via native select (Req 6.5) ---

  it("uses a native <select> element for keyboard accessibility", () => {
    expect(source).toContain("<select");
    expect(source).toContain("</select>");
  });

  // --- Minimum touch target size ---

  it("has minimum 44px touch target height", () => {
    expect(source).toContain("min-h-[44px]");
  });

  // --- Props interface ---

  it("accepts value, onChange, and disabled props", () => {
    expect(source).toContain("value: string");
    expect(source).toContain("onChange: (sprache: string) => void");
    expect(source).toContain("disabled?: boolean");
  });
});
