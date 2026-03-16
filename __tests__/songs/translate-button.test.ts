/**
 * Unit tests for TranslateButton component.
 *
 * Uses fs.readFileSync string-matching (node environment, no jsdom).
 *
 * Validates: Requirements 1.3, 6.1, 6.3
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const COMPONENT_PATH = path.resolve(
  process.cwd(),
  "src/components/songs/translate-button.tsx"
);
const source = fs.readFileSync(COMPONENT_PATH, "utf-8");

describe("TranslateButton component source", () => {
  // --- Button text switches between "🌐 Übersetzen" and "Übersetze…" (Req 1.3) ---

  it('shows "🌐 Übersetzen" when not translating', () => {
    expect(source).toContain("🌐 Übersetzen");
  });

  it('shows "Übersetze…" when translating', () => {
    expect(source).toContain("Übersetze…");
  });

  it("toggles text based on translating prop", () => {
    expect(source).toMatch(/translating\s*\?\s*"Übersetze…"\s*:\s*"🌐 Übersetzen"/);
  });

  // --- Button is disabled when translating=true (Req 1.3) ---

  it("disables button when translating", () => {
    expect(source).toContain("disabled={translating}");
  });

  // --- aria-label is correctly set (Req 6.1) ---

  it('has aria-label="Songtext übersetzen"', () => {
    expect(source).toContain('aria-label="Songtext übersetzen"');
  });

  // --- aria-busy is correctly set (Req 6.3) ---

  it("sets aria-busy based on translating prop", () => {
    expect(source).toContain("aria-busy={translating}");
  });

  // --- Minimum touch target size (Req 6.6) ---

  it("has minimum 44px touch target size", () => {
    expect(source).toContain("min-h-[44px]");
    expect(source).toContain("min-w-[44px]");
  });

  // --- Props interface ---

  it("accepts translating and onClick props", () => {
    expect(source).toContain("translating: boolean");
    expect(source).toContain("onClick: () => void");
  });
});
