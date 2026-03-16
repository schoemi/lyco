/**
 * Unit tests for ZeileEditor component (src/components/songs/zeile-editor.tsx)
 *
 * Since the project uses node environment (no jsdom/RTL), we validate
 * the component source for required patterns: add flow, inline edit,
 * delete confirmation, reorder buttons, and accessibility attributes.
 *
 * Validates: Requirements 8.1, 9.1, 10.1, 11.1
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
// Add Zeile flow (Req 8.1)
// ============================================================

describe("ZeileEditor — Add zeile flow (Req 8.1)", () => {
  it('has "+ Zeile hinzufügen" button', () => {
    expect(source).toContain("+ Zeile hinzufügen");
  });

  it("has add form with text and übersetzung input fields", () => {
    expect(source).toMatch(/id=\{`add-zeile-text-\$\{stropheId\}`\}/);
    expect(source).toMatch(/id=\{`add-zeile-uebersetzung-\$\{stropheId\}`\}/);
  });

  it("POSTs to zeilen API endpoint", () => {
    expect(source).toContain("`/api/songs/${songId}/strophen/${stropheId}/zeilen`");
    expect(source).toContain('"POST"');
  });

  it('validates text is required ("Text ist erforderlich")', () => {
    expect(source).toContain("Text ist erforderlich");
    expect(source).toMatch(/!addText\.trim\(\)/);
  });
});

// ============================================================
// Inline edit (Req 9.1)
// ============================================================

describe("ZeileEditor — Inline edit (Req 9.1)", () => {
  it("has edit button for each zeile", () => {
    expect(source).toContain("startEdit(zeile)");
    expect(source).toContain("bearbeiten");
  });

  it("has inline edit form with text and übersetzung inputs", () => {
    expect(source).toMatch(/id=\{`edit-zeile-text-\$\{zeile\.id\}`\}/);
    expect(source).toMatch(/id=\{`edit-zeile-uebersetzung-\$\{zeile\.id\}`\}/);
  });

  it("PUTs to zeilen API endpoint", () => {
    expect(source).toContain("`${baseUrl}/${editingId}`");
    expect(source).toContain('"PUT"');
  });

  it("has confirm and cancel buttons for edit", () => {
    expect(source).toContain("Bestätigen");
    expect(source).toContain("Abbrechen");
    expect(source).toContain("handleCancelEdit");
  });
});

// ============================================================
// Delete confirmation (Req 10.1)
// ============================================================

describe("ZeileEditor — Delete confirmation (Req 10.1)", () => {
  it("has delete button for each zeile", () => {
    expect(source).toContain("startDelete(zeile.id");
    expect(source).toContain("löschen");
  });

  it("shows confirmation with zeile text", () => {
    expect(source).toContain("deleteZeile.text");
    expect(source).toContain("Zeile wirklich löschen");
  });

  it("DELETEs via zeilen API endpoint", () => {
    expect(source).toContain("`${baseUrl}/${deleteConfirmId}`");
    expect(source).toContain('"DELETE"');
  });
});

// ============================================================
// Reorder buttons (Req 11.1)
// ============================================================

describe("ZeileEditor — Reorder buttons (Req 11.1)", () => {
  it("has up/down reorder buttons", () => {
    expect(source).toContain('handleMove(zeile.id, "up")');
    expect(source).toContain('handleMove(zeile.id, "down")');
  });

  it("up button has correct aria-label pattern", () => {
    expect(source).toContain("nach oben verschieben");
    expect(source).toMatch(/aria-label=\{`Zeile \$\{idx \+ 1\} nach oben verschieben`\}/);
  });

  it("down button has correct aria-label pattern", () => {
    expect(source).toContain("nach unten verschieben");
    expect(source).toMatch(/aria-label=\{`Zeile \$\{idx \+ 1\} nach unten verschieben`\}/);
  });

  it("first up button disabled (idx === 0)", () => {
    expect(source).toMatch(/disabled=\{idx === 0/);
  });

  it("last down button disabled (idx === sorted.length - 1)", () => {
    expect(source).toMatch(/disabled=\{idx === sorted\.length - 1/);
  });

  it("PUTs to zeilen/reorder API endpoint", () => {
    expect(source).toContain("`${baseUrl}/reorder`");
  });
});

// ============================================================
// General accessibility
// ============================================================

describe("ZeileEditor — General accessibility", () => {
  it('has aria-live="polite" status region', () => {
    expect(source).toContain('aria-live="polite"');
  });

  it("has Übersetzung field in both add and edit forms", () => {
    // Add form label
    expect(source).toContain("Übersetzung");
    // Both add and edit have uebersetzung inputs
    expect(source).toContain("addUebersetzung");
    expect(source).toContain("editUebersetzung");
  });
});
