/**
 * Unit tests for Song CRUD dialog components:
 * - SongCreateDialog (src/components/songs/song-create-dialog.tsx)
 * - SongDeleteDialog (src/components/songs/song-delete-dialog.tsx)
 * - SongEditForm (src/components/songs/song-edit-form.tsx)
 *
 * Since the project uses node environment (no jsdom/RTL), we validate
 * the component source for required patterns: form fields, validation,
 * loading states, focus management, and accessibility attributes.
 *
 * Validates: Requirements 1.5, 2.5, 3.2
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

// --- Load component sources ---

const CREATE_DIALOG_PATH = path.resolve(
  process.cwd(),
  "src/components/songs/song-create-dialog.tsx"
);
const DELETE_DIALOG_PATH = path.resolve(
  process.cwd(),
  "src/components/songs/song-delete-dialog.tsx"
);
const EDIT_FORM_PATH = path.resolve(
  process.cwd(),
  "src/components/songs/song-edit-form.tsx"
);

const createSource = fs.readFileSync(CREATE_DIALOG_PATH, "utf-8");
const deleteSource = fs.readFileSync(DELETE_DIALOG_PATH, "utf-8");
const editSource = fs.readFileSync(EDIT_FORM_PATH, "utf-8");

// ============================================================
// SongCreateDialog
// ============================================================

describe("SongCreateDialog component source", () => {
  // --- 1. Renders form fields when open ---

  it("renders title input field", () => {
    expect(createSource).toContain('id="song-titel"');
    expect(createSource).toContain("Titel");
  });

  it("renders artist input field", () => {
    expect(createSource).toContain('id="song-kuenstler"');
    expect(createSource).toContain("Künstler");
  });

  it("renders language input field", () => {
    expect(createSource).toContain('id="song-sprache"');
    expect(createSource).toContain("Sprache");
  });

  it("renders emotions-tags input field", () => {
    expect(createSource).toContain('id="song-emotions-tags"');
    expect(createSource).toContain("Emotions-Tags");
  });

  it("returns null when not open", () => {
    expect(createSource).toMatch(/if\s*\(\s*!open\s*\)\s*return\s+null/);
  });

  // --- 2. Shows validation error when submitting with empty title (Req 1.5) ---

  it("validates that title is required before submission (Req 1.5)", () => {
    expect(createSource).toContain("Titel ist erforderlich");
  });

  it("checks for empty trimmed title", () => {
    expect(createSource).toMatch(/!titel\.trim\(\)/);
  });

  it("sets validationError state on empty title", () => {
    expect(createSource).toContain("setValidationError");
    expect(createSource).toContain("validationError");
  });

  it("marks title field as aria-invalid on validation error", () => {
    expect(createSource).toContain("aria-invalid");
    expect(createSource).toContain("hasTitleError");
  });

  it("links error message via aria-describedby", () => {
    expect(createSource).toContain("aria-describedby");
    expect(createSource).toContain("song-titel-error");
  });

  it("displays validation error with role=alert", () => {
    expect(createSource).toContain('role="alert"');
    expect(createSource).toContain("song-titel-error");
  });

  // --- 3. Calls onCreated and closes after successful submission ---

  it("sends POST request to /api/songs", () => {
    expect(createSource).toContain('fetch("/api/songs"');
    expect(createSource).toContain('"POST"');
  });

  it("calls onCreated with the created song on success", () => {
    expect(createSource).toContain("onCreated(data.song)");
  });

  it("resets form after successful creation", () => {
    expect(createSource).toContain("resetForm()");
  });

  // --- 4. Shows API error on failed submission ---

  it("displays API error message", () => {
    expect(createSource).toContain("error.message");
    expect(createSource).toContain("Fehler beim Erstellen");
  });

  it("handles network errors", () => {
    expect(createSource).toContain("Netzwerkfehler");
  });

  it("shows API error with role=alert", () => {
    // The error <p> has role="alert"
    expect(createSource).toMatch(/error[\s\S]*role="alert"/);
  });

  // --- 5. Disables submit button during loading (Req 1.5) ---

  it("has loading state variable", () => {
    expect(createSource).toContain("useState(false)");
    expect(createSource).toContain("setLoading");
  });

  it("disables submit button when loading", () => {
    expect(createSource).toContain("disabled={loading}");
  });

  it("shows loading text on submit button", () => {
    expect(createSource).toContain("Erstelle...");
    expect(createSource).toContain("Erstellen");
  });

  // --- Focus management ---

  it("focuses title input on dialog open", () => {
    expect(createSource).toContain("titleInputRef");
    expect(createSource).toMatch(/titleInputRef\.current\?\.focus\(\)/);
  });

  it("captures trigger element before dialog opens", () => {
    expect(createSource).toContain("triggerRef");
    expect(createSource).toContain("document.activeElement");
  });

  it("returns focus to trigger on close", () => {
    expect(createSource).toMatch(/triggerRef\.current\.focus\(\)/);
  });

  it("closes on Escape key", () => {
    expect(createSource).toContain('"Escape"');
    expect(createSource).toContain("handleClose");
  });

  // --- Accessibility ---

  it("has dialog role and aria-modal", () => {
    expect(createSource).toContain('role="dialog"');
    expect(createSource).toContain('aria-modal="true"');
  });

  it("has aria-required on title field", () => {
    expect(createSource).toContain('aria-required="true"');
  });

  it("has aria-label for the dialog", () => {
    expect(createSource).toContain("aria-label");
    expect(createSource).toContain("Neuen Song erstellen");
  });
});

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
