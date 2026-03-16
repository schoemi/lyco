/**
 * Unit tests for StropheEditor showTranslations pass-through behavior
 *
 * Since the project uses node environment (no jsdom/RTL), we validate
 * the component source for required patterns: showTranslations prop
 * definition, pass-through to ZeileEditor, and conditional rendering
 * in the read-only view.
 *
 * Validates: Requirements 3.1, 3.2, 3.3
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const STROPHE_EDITOR_PATH = path.resolve(
  process.cwd(),
  "src/components/songs/strophe-editor.tsx"
);

const source = fs.readFileSync(STROPHE_EDITOR_PATH, "utf-8");

// ============================================================
// showTranslations prop definition (Req 3.1, 3.3)
// ============================================================

describe("StropheEditor — showTranslations prop (Req 3.1, 3.3)", () => {
  it("accepts showTranslations as an optional boolean prop with default true", () => {
    expect(source).toMatch(/showTranslations\??\s*:\s*boolean/);
    expect(source).toMatch(/showTranslations\s*=\s*true/);
  });

  it("destructures showTranslations from props", () => {
    // The function signature should destructure showTranslations
    expect(source).toContain("showTranslations");
  });
});

// ============================================================
// Pass-through to ZeileEditor (Req 3.3)
// ============================================================

describe("StropheEditor — showTranslations passed to ZeileEditor (Req 3.3)", () => {
  it("renders ZeileEditor component", () => {
    expect(source).toContain("<ZeileEditor");
  });

  it("passes showTranslations prop to ZeileEditor", () => {
    // The editing view should pass showTranslations={showTranslations} to ZeileEditor
    expect(source).toMatch(/showTranslations=\{showTranslations\}/);
  });

  it("passes showTranslations within the ZeileEditor JSX block", () => {
    // Extract the ZeileEditor JSX block and verify showTranslations is inside it
    const zeileEditorMatch = source.match(/<ZeileEditor[\s\S]*?\/>/);
    expect(zeileEditorMatch).not.toBeNull();
    expect(zeileEditorMatch![0]).toContain("showTranslations={showTranslations}");
  });
});

// ============================================================
// Read-only view hides translations when showTranslations={false} (Req 3.1, 3.2)
// ============================================================

describe("StropheEditor — Read-only view translation visibility (Req 3.1, 3.2)", () => {
  it("conditionally renders uebersetzung in read-only view based on showTranslations", () => {
    // The read-only view (!isEditing) should gate uebersetzung on showTranslations
    expect(source).toMatch(/showTranslations\s*&&\s*zeile\.uebersetzung/);
  });

  it("read-only block contains the showTranslations guard for uebersetzung", () => {
    // Extract the read-only view block (between !isEditing check and the editing view)
    const readOnlyMatch = source.match(
      /if\s*\(\s*!isEditing\s*\)\s*\{[\s\S]*?return\s*\(([\s\S]*?)\);\s*\}/
    );
    expect(readOnlyMatch).not.toBeNull();
    const readOnlyBlock = readOnlyMatch![1];

    // The read-only block should contain the showTranslations guard
    expect(readOnlyBlock).toContain("showTranslations");
    expect(readOnlyBlock).toMatch(/showTranslations\s*&&\s*zeile\.uebersetzung/);
  });

  it("renders uebersetzung text in italic style in read-only view", () => {
    const readOnlyMatch = source.match(
      /if\s*\(\s*!isEditing\s*\)\s*\{[\s\S]*?return\s*\(([\s\S]*?)\);\s*\}/
    );
    expect(readOnlyMatch).not.toBeNull();
    const readOnlyBlock = readOnlyMatch![1];

    expect(readOnlyBlock).toContain("zeile.uebersetzung");
    expect(readOnlyBlock).toContain("italic");
  });
});
