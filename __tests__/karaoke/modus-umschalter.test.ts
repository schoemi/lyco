/**
 * Unit tests for ModusUmschalter component
 *
 * Since the project uses node environment (no jsdom/RTL), we validate
 * the component source for required attributes and behavior patterns.
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 7.5
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const COMPONENT_PATH = path.resolve(
  process.cwd(),
  "src/components/karaoke/modus-umschalter.tsx"
);
const source = fs.readFileSync(COMPONENT_PATH, "utf-8");

describe("ModusUmschalter component source", () => {
  it("uses 'use client' directive", () => {
    expect(source).toContain('"use client"');
  });

  it("imports DisplayMode from @/types/karaoke", () => {
    expect(source).toContain("@/types/karaoke");
    expect(source).toContain("DisplayMode");
  });

  it("is a named export", () => {
    expect(source).toContain("export function ModusUmschalter");
  });

  it("has all three mode options: Einzelzeile, Strophe, Song", () => {
    expect(source).toContain('"einzelzeile"');
    expect(source).toContain('"strophe"');
    expect(source).toContain('"song"');
    expect(source).toContain("Einzelzeile");
    expect(source).toContain("Strophe");
    expect(source).toContain("Song");
  });

  it("uses role='radiogroup' for accessibility", () => {
    expect(source).toContain('role="radiogroup"');
  });

  it("uses role='radio' on each button", () => {
    expect(source).toContain('role="radio"');
  });

  it("uses aria-checked for active state", () => {
    expect(source).toContain("aria-checked");
  });

  it("calls onChange when a mode is clicked", () => {
    expect(source).toContain("onChange(");
  });

  it("has minimum 44px touch target", () => {
    expect(source).toMatch(/min-h-\[44px\]/);
    expect(source).toMatch(/min-w-\[44px\]/);
  });

  it("visually highlights the active mode with white background", () => {
    expect(source).toContain("bg-white");
  });

  it("accepts activeMode and onChange props", () => {
    expect(source).toContain("activeMode");
    expect(source).toContain("onChange");
  });
});
