/**
 * Unit tests for ZeileEditor kommentar toggle.
 *
 * Since the project uses node environment (no jsdom/RTL), we validate
 * the component source for required patterns: toggle button rendering,
 * PATCH request, optimistic update, revert on error, and color coding.
 *
 * Validates: Requirements 12.4, 12.5, 12.6, 12.8, 12.9
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const COMPONENT_PATH = path.resolve(
  process.cwd(),
  "src/components/songs/zeile-editor.tsx"
);
const source = fs.readFileSync(COMPONENT_PATH, "utf-8");

describe("ZeileEditor kommentar toggle", () => {
  // --- Requirement 12.4: Toggle button renders ---

  it("renders a kommentar toggle button with AppIcon lucide:message-square", () => {
    expect(source).toContain('icon="lucide:message-square"');
  });

  it("has a handleToggleKommentar function", () => {
    expect(source).toMatch(/function\s+handleToggleKommentar/);
  });

  it("calls handleToggleKommentar on toggle button click", () => {
    expect(source).toMatch(/onClick=\{.*handleToggleKommentar/);
  });

  it("uses aria-pressed to indicate toggle state", () => {
    expect(source).toMatch(/aria-pressed=\{zeile\.istKommentar\}/);
  });

  it("provides accessible aria-label for kommentar toggle", () => {
    expect(source).toContain("Kommentar-Markierung entfernen");
    expect(source).toContain("Zeile als Kommentar markieren");
  });

  it("toggles aria-label based on istKommentar state", () => {
    expect(source).toMatch(
      /zeile\.istKommentar\s*\?\s*"Kommentar-Markierung entfernen"\s*:\s*"Zeile als Kommentar markieren"/
    );
  });

  // --- Requirement 12.5: Sends PATCH request ---

  it("sends PATCH request to zeilen endpoint", () => {
    expect(source).toMatch(/method:\s*"PATCH"/);
  });

  it("sends istKommentar in PATCH body", () => {
    expect(source).toMatch(/JSON\.stringify\(\s*\{\s*istKommentar:\s*newValue\s*\}/);
  });

  it("constructs the correct PATCH URL with zeile.id", () => {
    expect(source).toMatch(/fetch\(\s*`\$\{baseUrl\}\/\$\{zeile\.id\}`/);
  });

  // --- Requirement 12.6: Optimistic update ---

  it("performs optimistic update before API call", () => {
    // The optimistic update maps zeilen and sets istKommentar to newValue
    expect(source).toMatch(
      /const\s+updated\s*=\s*zeilen\.map\(\s*\(z\)\s*=>/
    );
    // newValue is the toggled value
    expect(source).toMatch(/const\s+newValue\s*=\s*!zeile\.istKommentar/);
  });

  it("calls onZeilenChanged with optimistic update before fetch", () => {
    // Extract the handleToggleKommentar function body
    const fnStart = source.indexOf("async function handleToggleKommentar");
    expect(fnStart).toBeGreaterThan(-1);
    const fnBody = source.slice(fnStart, fnStart + 800);
    // onZeilenChanged(updated) must appear before the first fetch( call
    const optimisticCallIdx = fnBody.indexOf("onZeilenChanged(updated)");
    const fetchIdx = fnBody.indexOf("fetch(");
    expect(optimisticCallIdx).toBeGreaterThan(-1);
    expect(fetchIdx).toBeGreaterThan(-1);
    expect(optimisticCallIdx).toBeLessThan(fetchIdx);
  });

  // --- Requirement 12.9: Revert on error ---

  it("saves previous zeilen state for revert", () => {
    expect(source).toMatch(/const\s+previousZeilen\s*=\s*zeilen/);
  });

  it("reverts to previous state on API error (non-ok response)", () => {
    expect(source).toMatch(/onZeilenChanged\(previousZeilen\)/);
    expect(source).toContain(
      "Fehler beim Ändern der Kommentar-Markierung"
    );
  });

  it("reverts to previous state on network error (catch block)", () => {
    // There should be a catch block that also reverts
    expect(source).toContain(
      "Netzwerkfehler beim Ändern der Kommentar-Markierung"
    );
  });

  // --- Requirement 12.8: Color coding ---

  it("applies amber background color when zeile is kommentar", () => {
    expect(source).toContain("border-amber-200 bg-amber-50");
  });

  it("applies default background when zeile is not kommentar", () => {
    expect(source).toContain("border-neutral-100 bg-neutral-50");
  });

  it("applies amber styling to toggle button when active", () => {
    expect(source).toContain("bg-amber-100 text-amber-700");
  });

  it("applies neutral styling to toggle button when inactive", () => {
    expect(source).toContain("text-neutral-500 hover:bg-neutral-100");
  });

  it("conditionally applies color based on istKommentar", () => {
    expect(source).toMatch(
      /zeile\.istKommentar\s*\?\s*"border-amber-200 bg-amber-50"\s*:\s*"border-neutral-100 bg-neutral-50"/
    );
  });

  // --- Status messages ---

  it("shows success message when marking as kommentar", () => {
    expect(source).toContain("Zeile als Kommentar markiert");
  });

  it("shows success message when removing kommentar marking", () => {
    expect(source).toContain("Kommentar-Markierung entfernt");
  });
});
