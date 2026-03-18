/**
 * Unit tests for TranslationToggle component.
 *
 * Uses fs.readFileSync string-matching (node environment, no jsdom).
 *
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const COMPONENT_PATH = path.resolve(
  process.cwd(),
  "src/components/songs/translation-toggle.tsx"
);
const source = fs.readFileSync(COMPONENT_PATH, "utf-8");

describe("TranslationToggle component source", () => {
  it("is a client component", () => {
    expect(source).toContain('"use client"');
  });

  it("exports TranslationToggle as default function", () => {
    expect(source).toMatch(/export\s+default\s+function\s+TranslationToggle/);
  });

  // --- Props interface (Req 4.3) ---

  it("accepts checked: boolean prop", () => {
    expect(source).toContain("checked: boolean");
  });

  it("accepts onChange: (checked: boolean) => void prop", () => {
    expect(source).toContain("onChange: (checked: boolean) => void");
  });

  // --- ARIA role="switch" and aria-checked (Req 4.1, 4.3) ---

  it('has role="switch" on the button', () => {
    expect(source).toContain('role="switch"');
  });

  it("sets aria-checked from checked prop", () => {
    expect(source).toContain("aria-checked={checked}");
  });

  // --- aria-label (Req 4.2) ---

  it('has aria-label="Übersetzung ein-/ausblenden"', () => {
    expect(source).toContain('aria-label="Übersetzung ein-/ausblenden"');
  });

  // --- Click triggers onChange (Req 4.4) ---

  it("calls onChange(!checked) on click", () => {
    expect(source).toContain("onClick={() => onChange(!checked)}");
  });

  // --- Keyboard: Space and Enter trigger onChange (Req 4.4) ---

  it("handles keydown events", () => {
    expect(source).toContain("onKeyDown={handleKeyDown}");
  });

  it('triggers onChange on Space key press', () => {
    expect(source).toContain('" "');
    expect(source).toMatch(/key\s*===\s*" "/);
  });

  it('triggers onChange on Enter key press', () => {
    expect(source).toContain('"Enter"');
    expect(source).toMatch(/key\s*===\s*"Enter"/);
  });

  it("prevents default on Space/Enter to avoid scrolling", () => {
    expect(source).toContain("e.preventDefault()");
  });

  it("calls onChange(!checked) in keydown handler", () => {
    expect(source).toMatch(/handleKeyDown[\s\S]*onChange\(!checked\)/);
  });

  // --- Visual state: activated (blue) vs deactivated (gray) (Req 5.1, 5.2, 5.3) ---

  it("uses blue styling for activated state (Req 5.2)", () => {
    expect(source).toContain("border-newsong-300");
    expect(source).toContain("text-newsong-700");
    expect(source).toContain("bg-newsong-50");
  });

  it("uses gray styling for deactivated state (Req 5.3)", () => {
    expect(source).toContain("border-neutral-300");
    expect(source).toContain("text-neutral-500");
    expect(source).toContain("bg-white");
  });

  it("uses newsong-600 for the toggle track when activated", () => {
    expect(source).toContain("bg-newsong-600");
  });

  it("uses neutral-300 for the toggle track when deactivated", () => {
    expect(source).toContain("bg-neutral-300");
  });

  it("translates the toggle knob when checked (visual switch)", () => {
    expect(source).toContain("translate-x-4");
    expect(source).toContain("translate-x-0");
  });

  // --- Touch target minimum size (Req 4.5 via design) ---

  it("has minimum 44px touch target size", () => {
    expect(source).toContain("min-h-[44px]");
    expect(source).toContain("min-w-[44px]");
  });

  // --- Label text ---

  it('displays "Übersetzung" as visible label text', () => {
    expect(source).toContain("Übersetzung");
  });

  // --- Toggle knob is decorative (aria-hidden) ---

  it("marks the visual toggle track as aria-hidden", () => {
    expect(source).toContain('aria-hidden="true"');
  });

  // --- Uses button element ---

  it('uses type="button" to prevent form submission', () => {
    expect(source).toContain('type="button"');
  });
});
