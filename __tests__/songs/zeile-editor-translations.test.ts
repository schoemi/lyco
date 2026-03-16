/**
 * Unit tests for ZeileEditor showTranslations behavior
 *
 * Since the project uses node environment (no jsdom/RTL), we validate
 * the component source for required patterns: conditional translation
 * rendering based on the showTranslations prop.
 *
 * Validates: Requirements 3.1, 3.2
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const ZEILE_EDITOR_PATH = path.resolve(
  process.cwd(),
  "src/components/songs/zeile-editor.tsx"
);

const source = fs.readFileSync(ZEILE_EDITOR_PATH, "utf-8");

// ============================================================
// showTranslations prop definition
// ============================================================

describe("ZeileEditor — showTranslations prop (Req 3.1, 3.2)", () => {
  it("accepts showTranslations as an optional boolean prop with default true", () => {
    expect(source).toMatch(/showTranslations\??\s*:\s*boolean/);
    expect(source).toMatch(/showTranslations\s*=\s*true/);
  });
});

// ============================================================
// Translation shown when showTranslations={true} (Req 3.1)
// ============================================================

describe("ZeileEditor — Translation visible when showTranslations is true (Req 3.1)", () => {
  it("conditionally renders uebersetzung based on showTranslations in read-only view", () => {
    // The read-only view (isEditing === false) should gate uebersetzung on showTranslations
    // Pattern: showTranslations && zeile.uebersetzung &&
    expect(source).toMatch(/showTranslations\s*&&\s*zeile\.uebersetzung/);
  });

  it("renders uebersetzung text in italic style when visible", () => {
    expect(source).toContain("text-xs text-gray-500 italic");
    expect(source).toContain("zeile.uebersetzung");
  });
});

// ============================================================
// Translation hidden when showTranslations={false} (Req 3.2)
// ============================================================

describe("ZeileEditor — Translation hidden when showTranslations is false (Req 3.2)", () => {
  it("guards uebersetzung display with showTranslations in display mode (non-editing zeile)", () => {
    // In the edit-mode list (sorted.map), non-editing zeilen also gate on showTranslations
    // There should be at least two occurrences of the guard: read-only view + display mode
    const matches = source.match(/showTranslations\s*&&\s*zeile\.uebersetzung/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(2);
  });
});

// ============================================================
// Edit form always shows translation field (Req 3.1, 3.2)
// ============================================================

describe("ZeileEditor — Edit form translation field always visible (Req 3.1, 3.2)", () => {
  it("has Übersetzung input in the edit form without showTranslations guard", () => {
    // The edit form section (editingId === zeile.id) should contain the
    // uebersetzung input without being wrapped in a showTranslations conditional.
    // We verify the edit form has the uebersetzung label and input.
    expect(source).toMatch(/id=\{`edit-zeile-uebersetzung-\$\{zeile\.id\}`\}/);
    expect(source).toContain("editUebersetzung");
  });

  it("does not gate the edit form uebersetzung input on showTranslations", () => {
    // Extract the inline edit form block (between editingId === zeile.id check and the closing form tag)
    const editFormMatch = source.match(
      /editingId\s*===\s*zeile\.id\s*\?\s*\(([\s\S]*?)<\/form>/
    );
    expect(editFormMatch).not.toBeNull();
    const editFormBlock = editFormMatch![1];

    // The edit form block should contain the uebersetzung input
    expect(editFormBlock).toContain("editUebersetzung");
    // But should NOT contain showTranslations as a guard
    expect(editFormBlock).not.toContain("showTranslations");
  });
});
