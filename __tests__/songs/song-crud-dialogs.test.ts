/**
 * Unit tests for Song CRUD dialog components:
 * - SongDeleteDialog (src/components/songs/song-delete-dialog.tsx)
 * - SongEditForm (src/components/songs/song-edit-form.tsx)
 *
 * Since the project uses node environment (no jsdom/RTL), we validate
 * the component source for required patterns: form fields, validation,
 * loading states, focus management, and accessibility attributes.
 *
 * Validates: Requirements 2.5, 3.2
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

// --- Load component sources ---

const DELETE_DIALOG_PATH = path.resolve(
  process.cwd(),
  "src/components/songs/song-delete-dialog.tsx"
);
const EDIT_FORM_PATH = path.resolve(
  process.cwd(),
  "src/components/songs/song-edit-form.tsx"
);

const deleteSource = fs.readFileSync(DELETE_DIALOG_PATH, "utf-8");
const editSource = fs.readFileSync(EDIT_FORM_PATH, "utf-8");

// ============================================================
// SongDeleteDialog
// ============================================================

describe("SongDeleteDialog component source", () => {
  // --- 1. Shows song title and cascade warning (Req 3.2) ---

  it("displays the song title in the confirmation message", () => {
    expect(deleteSource).toContain("song.titel");
  });

  it("shows cascade deletion warning (Req 3.2)", () => {
    expect(deleteSource).toContain("Strophen");
    expect(deleteSource).toContain("Zeilen");
    expect(deleteSource).toContain("unwiderruflich");
  });

  it("returns null when not open or no song", () => {
    expect(deleteSource).toMatch(/if\s*\(\s*!open\s*\|\|\s*!song\s*\)\s*return\s+null/);
  });

  // --- 2. Calls onDeleted after successful deletion ---

  it("sends DELETE request to /api/songs/{id}", () => {
    expect(deleteSource).toContain("fetch(`/api/songs/${song");
    expect(deleteSource).toContain('"DELETE"');
  });

  it("calls onDeleted on successful deletion", () => {
    expect(deleteSource).toContain("onDeleted()");
  });

  // --- 3. Closes without deleting when cancel is clicked ---

  it("has a cancel button labeled Abbrechen", () => {
    expect(deleteSource).toContain("Abbrechen");
  });

  it("calls handleClose on cancel click", () => {
    expect(deleteSource).toContain("onClick={handleClose}");
  });

  it("calls onClose in handleClose", () => {
    expect(deleteSource).toContain("onClose()");
  });

  // --- 4. Shows API error on failed deletion ---

  it("displays API error message", () => {
    expect(deleteSource).toContain("Fehler beim Löschen");
  });

  it("handles network errors", () => {
    expect(deleteSource).toContain("Netzwerkfehler");
  });

  it("shows error with role=alert", () => {
    expect(deleteSource).toContain('role="alert"');
  });

  // --- 5. Disables delete button during loading ---

  it("has loading state variable", () => {
    expect(deleteSource).toContain("useState(false)");
    expect(deleteSource).toContain("setLoading");
  });

  it("disables delete button when loading", () => {
    expect(deleteSource).toContain("disabled={loading}");
  });

  it("shows loading text on delete button", () => {
    expect(deleteSource).toContain("Lösche...");
    expect(deleteSource).toContain("Löschen");
  });

  // --- Focus management ---

  it("focuses cancel button on dialog open", () => {
    expect(deleteSource).toContain("cancelButtonRef");
    expect(deleteSource).toMatch(/cancelButtonRef\.current\?\.focus\(\)/);
  });

  it("captures trigger element before dialog opens", () => {
    expect(deleteSource).toContain("triggerRef");
    expect(deleteSource).toContain("document.activeElement");
  });

  it("returns focus to trigger on close", () => {
    expect(deleteSource).toMatch(/triggerRef\.current\.focus\(\)/);
  });

  it("closes on Escape key", () => {
    expect(deleteSource).toContain('"Escape"');
  });

  // --- Accessibility ---

  it("has dialog role and aria-modal", () => {
    expect(deleteSource).toContain('role="dialog"');
    expect(deleteSource).toContain('aria-modal="true"');
  });

  it("has aria-label for the dialog", () => {
    expect(deleteSource).toContain("aria-label");
    expect(deleteSource).toContain("Song löschen");
  });
});

// ============================================================
// SongEditForm
// ============================================================

describe("SongEditForm component source", () => {
  // --- 1. Pre-fills form with current song values ---

  it("initializes title state from song prop", () => {
    expect(editSource).toContain("useState(song.titel)");
  });

  it("initializes artist state from song prop", () => {
    expect(editSource).toMatch(/useState\(song\.kuenstler\s*\?\?\s*""\)/);
  });

  it("initializes language state from song prop", () => {
    expect(editSource).toMatch(/useState\(song\.sprache\s*\?\?\s*""\)/);
  });

  it("initializes emotions tags from song prop", () => {
    expect(editSource).toContain('song.emotionsTags.join(", ")');
  });

  it("has labeled form fields for all metadata", () => {
    expect(editSource).toContain('id="edit-song-titel"');
    expect(editSource).toContain('id="edit-song-kuenstler"');
    expect(editSource).toContain('id="edit-song-sprache"');
    expect(editSource).toContain('id="edit-song-emotions-tags"');
  });

  // --- 2. Shows validation error when title is cleared (Req 2.5) ---

  it("validates that title is required (Req 2.5)", () => {
    expect(editSource).toContain("Titel ist erforderlich");
  });

  it("checks for empty trimmed title", () => {
    expect(editSource).toMatch(/!titel\.trim\(\)/);
  });

  it("marks title field as aria-invalid on validation error", () => {
    expect(editSource).toContain("aria-invalid");
    expect(editSource).toContain("hasTitleError");
  });

  it("links error message via aria-describedby", () => {
    expect(editSource).toContain("aria-describedby");
    expect(editSource).toContain("edit-song-titel-error");
  });

  it("displays validation error with role=alert", () => {
    expect(editSource).toContain('role="alert"');
  });

  // --- 3. Calls onSaved with updated data after successful save ---

  it("sends PUT request to /api/songs/{id}", () => {
    expect(editSource).toContain("fetch(`/api/songs/${song.id}`");
    expect(editSource).toContain('"PUT"');
  });

  it("calls onSaved with updated song data", () => {
    expect(editSource).toContain("onSaved(data.song)");
  });

  it("shows API error on failed save", () => {
    expect(editSource).toContain("Fehler beim Speichern");
  });

  it("handles network errors", () => {
    expect(editSource).toContain("Netzwerkfehler");
  });

  // --- 4. Restores original values on cancel ---

  it("has a cancel handler that resets form", () => {
    expect(editSource).toContain("handleCancel");
    expect(editSource).toContain("resetForm()");
  });

  it("resetForm restores original song values", () => {
    // resetForm sets state back to song prop values
    expect(editSource).toMatch(/setTitel\(song\.titel\)/);
    expect(editSource).toMatch(/setKuenstler\(song\.kuenstler/);
    expect(editSource).toMatch(/setSprache\(song\.sprache/);
    expect(editSource).toMatch(/setEmotionsTagsRaw\(song\.emotionsTags/);
  });

  it("calls onCancel after resetting form", () => {
    expect(editSource).toContain("onCancel()");
  });

  // --- Loading state ---

  it("disables submit button when loading", () => {
    expect(editSource).toContain("disabled={loading}");
  });

  it("shows loading text on save button", () => {
    expect(editSource).toContain("Speichere...");
    expect(editSource).toContain("Speichern");
  });

  // --- Accessibility ---

  it("has aria-required on title field", () => {
    expect(editSource).toContain('aria-required="true"');
  });

  it("uses noValidate on form element", () => {
    expect(editSource).toContain("noValidate");
  });
});
