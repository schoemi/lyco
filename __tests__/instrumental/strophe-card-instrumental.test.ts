/**
 * Unit tests for StropheCard instrumental/kommentar styling.
 *
 * Since the project uses node environment (no jsdom/RTL), we validate
 * the component source for required patterns: instrumental badge,
 * dimmed styling, hidden note/progress, and kommentar zeile italic styling.
 *
 * Validates: Requirements 1.4, 1.5, 2.4, 2.5
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const COMPONENT_PATH = path.resolve(
  process.cwd(),
  "src/components/songs/strophe-card.tsx"
);
const source = fs.readFileSync(COMPONENT_PATH, "utf-8");

describe("StropheCard instrumental/kommentar styling", () => {
  // --- Instrumental detection ---

  it("derives isInstrumental from strophe.istInstrumental", () => {
    expect(source).toContain("strophe.istInstrumental");
    expect(source).toMatch(/isInstrumental/);
  });

  // --- Requirement 1.4: Instrumental strophe dimmed styling ---

  it("applies dimmed opacity to instrumental strophes (Req 1.4)", () => {
    // The card container applies opacity-60 when instrumental
    expect(source).toContain("opacity-60");
    expect(source).toMatch(/isInstrumental\s*\?.*opacity/);
  });

  it("applies italic styling to instrumental strophes (Req 1.4)", () => {
    // The card container applies italic when instrumental
    expect(source).toMatch(/isInstrumental\s*\?.*italic/);
  });

  // --- Requirement 1.5: Instrumental badge ---

  it('renders "[Instrumental]" badge next to strophe name (Req 1.5)', () => {
    expect(source).toContain("[Instrumental]");
  });

  it("conditionally renders instrumental badge only when isInstrumental", () => {
    expect(source).toMatch(/isInstrumental\s*&&/);
  });

  it("styles the instrumental badge with neutral colors", () => {
    // Badge uses neutral-200 background and neutral-500 text
    expect(source).toMatch(/bg-neutral-200[\s\S]*?\[Instrumental\]/);
  });

  // --- Requirement 1.4: Hidden progress bar for instrumental strophes ---

  it("hides progress bar for instrumental strophes (Req 1.4)", () => {
    // Progress bar is only shown when NOT instrumental
    expect(source).toMatch(/!isInstrumental\s*&&[\s\S]*?progress/i);
  });

  it("renders ProgressBar component for non-instrumental strophes", () => {
    expect(source).toContain("ProgressBar");
    expect(source).toContain("strophe.progress");
  });

  // --- Requirement 1.4: Hidden note area for instrumental strophes ---

  it("hides note area for instrumental strophes (Req 1.4)", () => {
    // Note area (textarea + save button) is only shown when NOT instrumental
    expect(source).toMatch(/!isInstrumental\s*&&[\s\S]*?Notiz/);
  });

  it("renders textarea for notes in non-instrumental strophes", () => {
    expect(source).toContain("<textarea");
    expect(source).toContain("Notiz hinzufügen");
  });

  // --- Requirement 2.4: Kommentar zeile italic styling ---

  it("checks zeile.istKommentar for styling (Req 2.4)", () => {
    expect(source).toContain("zeile.istKommentar");
  });

  it("applies italic styling to kommentar zeilen (Req 2.4)", () => {
    expect(source).toMatch(/istKommentar[\s\S]*?italic/);
  });

  // --- Requirement 2.5: Kommentar zeile dimmed color ---

  it("applies dimmed color to kommentar zeilen (Req 2.5)", () => {
    // Kommentar zeilen use text-amber-800 (dimmed/italic) vs text-neutral-800 (normal)
    expect(source).toMatch(/istKommentar[\s\S]*?text-amber-800/);
  });

  it("uses normal color for non-kommentar zeilen (Req 2.5)", () => {
    expect(source).toContain("text-neutral-800");
  });

  // --- Kommentar zeile conditional class application ---

  it("applies different className based on istKommentar flag", () => {
    // Ternary: istKommentar ? "italic text-amber-800" : "text-neutral-800"
    expect(source).toMatch(
      /istKommentar[\s\S]*?"italic text-amber-800"[\s\S]*?"text-neutral-800"/
    );
  });

  // --- Zeilen rendering ---

  it("renders all zeilen with their text via stripChordPro", () => {
    expect(source).toContain("stripChordPro(zeile.text)");
  });

  it("renders uebersetzung when available", () => {
    expect(source).toContain("zeile.uebersetzung");
  });
});
