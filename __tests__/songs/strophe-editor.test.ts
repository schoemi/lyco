/**
 * Unit tests for StropheEditor component (src/components/songs/strophe-editor.tsx)
 *
 * Since the project uses node environment (no jsdom/RTL), we validate
 * the component source for required patterns: add flow, inline edit,
 * delete confirmation, reorder buttons, and accessibility attributes.
 *
 * Validates: Requirements 4.1, 5.1, 6.1, 7.1
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
// Add Strophe flow (Req 4.1)
// ============================================================

describe("StropheEditor — Add strophe flow (Req 4.1)", () => {
  it('has "+ Strophe hinzufügen" button', () => {
    expect(source).toContain("+ Strophe hinzufügen");
  });

  it("has add form with name input field", () => {
    expect(source).toContain('id="add-strophe-name"');
    expect(source).toContain("Name");
  });

  it("POSTs to strophen API endpoint", () => {
    expect(source).toContain("`/api/songs/${songId}/strophen`");
    expect(source).toContain('"POST"');
  });

  it('validates name is required ("Name ist erforderlich")', () => {
    expect(source).toContain("Name ist erforderlich");
    expect(source).toMatch(/!addName\.trim\(\)/);
  });
});

// ============================================================
// Inline edit (Req 5.1)
// ============================================================

describe("StropheEditor — Inline edit (Req 5.1)", () => {
  it("has edit button for each strophe", () => {
    expect(source).toContain("startEdit(strophe)");
    expect(source).toContain("bearbeiten");
  });

  it("has inline edit form with name input", () => {
    expect(source).toMatch(/id=\{`edit-strophe-name-\$\{strophe\.id\}`\}/);
    expect(source).toContain("editNameInputRef");
  });

  it("PUTs to strophen API endpoint", () => {
    expect(source).toContain("`/api/songs/${songId}/strophen/${editingId}`");
    expect(source).toContain('"PUT"');
  });

  it("has confirm and cancel buttons for edit", () => {
    expect(source).toContain("Bestätigen");
    expect(source).toContain("Abbrechen");
    expect(source).toContain("handleCancelEdit");
  });
});

// ============================================================
// Delete confirmation (Req 6.1)
// ============================================================

describe("StropheEditor — Delete confirmation (Req 6.1)", () => {
  it("has delete button for each strophe", () => {
    expect(source).toContain("startDelete(strophe.id");
    expect(source).toContain("löschen");
  });

  it("shows confirmation dialog with strophe name", () => {
    expect(source).toContain("deleteStrophe.name");
    expect(source).toContain("Strophe löschen");
  });

  it("shows cascade warning about Zeilen and Markups", () => {
    expect(source).toContain("Zeilen");
    expect(source).toContain("Markups");
    expect(source).toContain("unwiderruflich");
  });

  it("DELETEs via strophen API endpoint", () => {
    expect(source).toContain("`/api/songs/${songId}/strophen/${deleteConfirmId}`");
    expect(source).toContain('"DELETE"');
  });
});

// ============================================================
// Reorder buttons (Req 7.1)
// ============================================================

describe("StropheEditor — Reorder buttons (Req 7.1)", () => {
  it("has up/down reorder buttons", () => {
    expect(source).toContain('handleMove(strophe.id, "up")');
    expect(source).toContain('handleMove(strophe.id, "down")');
  });

  it("up button has correct aria-label pattern", () => {
    expect(source).toContain("nach oben verschieben");
    expect(source).toMatch(/aria-label=\{`Strophe \$\{strophe\.name\} nach oben verschieben`\}/);
  });

  it("down button has correct aria-label pattern", () => {
    expect(source).toContain("nach unten verschieben");
    expect(source).toMatch(/aria-label=\{`Strophe \$\{strophe\.name\} nach unten verschieben`\}/);
  });

  it("first up button disabled (idx === 0)", () => {
    expect(source).toMatch(/disabled=\{idx === 0/);
  });

  it("last down button disabled (idx === sorted.length - 1)", () => {
    expect(source).toMatch(/disabled=\{idx === sorted\.length - 1/);
  });

  it("PUTs to strophen/reorder API endpoint", () => {
    expect(source).toContain("`/api/songs/${songId}/strophen/reorder`");
  });
});

// ============================================================
// General accessibility
// ============================================================

describe("StropheEditor — General accessibility", () => {
  it('has aria-live="polite" status region', () => {
    expect(source).toContain('aria-live="polite"');
  });

  it('has role="dialog" for delete confirmation', () => {
    expect(source).toContain('role="dialog"');
    expect(source).toContain('aria-modal="true"');
  });
});
