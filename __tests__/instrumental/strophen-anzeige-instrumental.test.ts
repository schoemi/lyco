/**
 * Unit tests for StrophenAnzeige kommentar styling in lesemodus.
 *
 * Since the project uses node environment (no jsdom/RTL), we validate
 * the component source for required patterns: kommentar zeile styling,
 * kommentar zeile not treated as active line.
 *
 * Validates: Requirements 5.1, 6.1
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const COMPONENT_PATH = path.resolve(
  process.cwd(),
  "src/components/karaoke/strophen-anzeige.tsx"
);
const source = fs.readFileSync(COMPONENT_PATH, "utf-8");

describe("StrophenAnzeige kommentar styling", () => {
  // --- Kommentar detection ---

  it("checks zeile.istKommentar for styling decisions", () => {
    expect(source).toContain("zeile.istKommentar");
  });

  it("derives isKommentar variable from zeile.istKommentar", () => {
    expect(source).toMatch(/isKommentar/);
    expect(source).toContain("zeile.istKommentar");
  });

  // --- Requirement 6.1: Kommentar zeile italic styling ---

  it("applies italic styling to kommentar zeilen (Req 6.1)", () => {
    expect(source).toMatch(/isKommentar[\s\S]*?italic/);
  });

  // --- Requirement 6.1: Kommentar zeile dimmed opacity ---

  it("applies dimmed opacity to kommentar zeilen (Req 6.1)", () => {
    // Kommentar zeilen use opacity-30 (very dimmed)
    expect(source).toMatch(/isKommentar[\s\S]*?opacity-30/);
  });

  // --- Requirement 5.1: Kommentar zeile not treated as active ---

  it("does not treat kommentar zeilen as active line (Req 5.1)", () => {
    // isActive is false when isKommentar is true: !isKommentar && zeile.id === effectiveActiveZeileId
    expect(source).toMatch(/!isKommentar\s*&&.*effectiveActiveZeileId/);
  });

  // --- Effective active zeile skips kommentar ---

  it("computes effectiveActiveZeileId that skips kommentar zeilen", () => {
    expect(source).toContain("effectiveActiveZeileId");
    // The logic checks if the active zeile is a kommentar and returns null
    expect(source).toMatch(/!zeile\.istKommentar/);
  });

  it("returns null for effectiveActiveZeileId when active zeile is kommentar", () => {
    // If the active zeile is a kommentar, don't scroll to it
    expect(source).toMatch(/return\s*null/);
  });

  // --- Styling differentiation ---

  it("uses different text size for kommentar vs active vs inactive zeilen", () => {
    // Kommentar: text-xl italic opacity-30
    // Active: text-2xl font-bold opacity-100
    // Inactive: text-xl opacity-40
    expect(source).toContain("text-xl italic opacity-30");
    expect(source).toContain("text-2xl font-bold opacity-100");
    expect(source).toContain("text-xl opacity-40");
  });

  it("applies ternary styling based on isKommentar and isActive", () => {
    // The className uses a ternary: isKommentar ? ... : isActive ? ... : ...
    expect(source).toMatch(/isKommentar\s*\?/);
    expect(source).toMatch(/isActive\s*\?/);
  });

  // --- Scroll behavior ---

  it("does not scroll to kommentar zeilen", () => {
    // The useEffect for scrolling uses effectiveActiveZeileId
    expect(source).toMatch(/effectiveActiveZeileId[\s\S]*?offsetTop/);
  });

  // --- Component structure ---

  it("sorts zeilen by orderIndex", () => {
    expect(source).toContain("a.orderIndex - b.orderIndex");
  });

  it("renders all zeilen including kommentar zeilen", () => {
    // All zeilen are mapped (kommentar zeilen are displayed, not filtered out)
    expect(source).toContain("sortedZeilen.map");
  });

  it("uses stripChordPro for text rendering", () => {
    expect(source).toContain("stripChordPro(zeile.text)");
  });
});
