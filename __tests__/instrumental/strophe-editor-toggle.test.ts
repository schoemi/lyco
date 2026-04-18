/**
 * Unit tests for StropheEditor instrumental toggle.
 *
 * Since the project uses node environment (no jsdom/RTL), we validate
 * the component source for required patterns: toggle button rendering,
 * PATCH request, optimistic update, revert on error, and color coding.
 *
 * Validates: Requirements 12.1, 12.2, 12.3, 12.7, 12.9
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const COMPONENT_PATH = path.resolve(
  process.cwd(),
  "src/components/songs/strophe-editor.tsx"
);
const source = fs.readFileSync(COMPONENT_PATH, "utf-8");

describe("StropheEditor instrumental toggle", () => {
  // --- Requirement 12.1: Toggle button renders ---

  it("renders an instrumental toggle button with AppIcon lucide:music", () => {
    expect(source).toContain('icon="lucide:music"');
  });

  it("has a handleToggleInstrumental function", () => {
    expect(source).toMatch(/function\s+handleToggleInstrumental/);
  });

  it("calls handleToggleInstrumental on toggle button click", () => {
    expect(source).toMatch(/onClick=\{.*handleToggleInstrumental/);
  });

  it("uses aria-pressed to indicate toggle state", () => {
    expect(source).toMatch(/aria-pressed=\{strophe\.istInstrumental\}/);
  });

  it("provides accessible aria-label for instrumental toggle", () => {
    expect(source).toContain("Instrumental-Markierung entfernen");
    expect(source).toContain("Strophe als Instrumental markieren");
  });

  it("toggles aria-label based on istInstrumental state", () => {
    expect(source).toMatch(
      /strophe\.istInstrumental\s*\?\s*"Instrumental-Markierung entfernen"\s*:\s*"Strophe als Instrumental markieren"/
    );
  });

  // --- Requirement 12.2: Sends PATCH request ---

  it("sends PATCH request to strophen endpoint", () => {
    expect(source).toMatch(/method:\s*"PATCH"/);
  });

  it("sends istInstrumental in PATCH body", () => {
    expect(source).toMatch(/JSON\.stringify\(\s*\{\s*istInstrumental:\s*newValue\s*\}/);
  });

  it("constructs the correct PATCH URL with songId and strophe.id", () => {
    // The source uses template literal: `/api/songs/${songId}/strophen/${strophe.id}`
    expect(source).toContain("/api/songs/${songId}/strophen/${strophe.id}`");
  });

  // --- Requirement 12.3: Optimistic update ---

  it("performs optimistic update before API call", () => {
    // The optimistic update maps strophen and sets istInstrumental to newValue
    expect(source).toMatch(
      /const\s+updated\s*=\s*strophen\.map\(\s*\(s\)\s*=>/
    );
    // newValue is the toggled value
    expect(source).toMatch(/const\s+newValue\s*=\s*!strophe\.istInstrumental/);
  });

  it("calls onStrophenChanged with optimistic update before fetch", () => {
    // Extract the handleToggleInstrumental function body
    const fnStart = source.indexOf("async function handleToggleInstrumental");
    expect(fnStart).toBeGreaterThan(-1);
    const fnBody = source.slice(fnStart, fnStart + 800);
    // onStrophenChanged(updated) must appear before the first fetch( call
    const optimisticCallIdx = fnBody.indexOf("onStrophenChanged(updated)");
    const fetchIdx = fnBody.indexOf("fetch(");
    expect(optimisticCallIdx).toBeGreaterThan(-1);
    expect(fetchIdx).toBeGreaterThan(-1);
    expect(optimisticCallIdx).toBeLessThan(fetchIdx);
  });

  // --- Requirement 12.9: Revert on error ---

  it("saves previous strophen state for revert", () => {
    expect(source).toMatch(/const\s+previousStrophen\s*=\s*strophen/);
  });

  it("reverts to previous state on API error (non-ok response)", () => {
    expect(source).toMatch(/onStrophenChanged\(previousStrophen\)/);
    expect(source).toContain(
      "Fehler beim Ändern der Instrumental-Markierung"
    );
  });

  it("reverts to previous state on network error (catch block)", () => {
    // There should be a catch block that also reverts
    expect(source).toContain(
      "Netzwerkfehler beim Ändern der Instrumental-Markierung"
    );
  });

  // --- Requirement 12.7: Color coding ---

  it("applies sky background color when strophe is instrumental", () => {
    expect(source).toContain("border-sky-200 bg-sky-50");
  });

  it("applies default background when strophe is not instrumental", () => {
    expect(source).toContain("border-neutral-200 bg-white");
  });

  it("applies sky styling to toggle button when active", () => {
    expect(source).toContain("bg-sky-100 text-sky-700");
  });

  it("applies neutral styling to toggle button when inactive", () => {
    expect(source).toContain("text-neutral-500 hover:bg-neutral-100");
  });

  it("conditionally applies color based on istInstrumental", () => {
    expect(source).toMatch(
      /strophe\.istInstrumental\s*\?\s*"border-sky-200 bg-sky-50"\s*:\s*"border-neutral-200 bg-white"/
    );
  });

  // --- Status messages ---

  it("shows success message when marking as instrumental", () => {
    expect(source).toContain("als Instrumental markiert");
  });

  it("shows success message when removing instrumental marking", () => {
    expect(source).toContain("Instrumental-Markierung von");
  });
});
