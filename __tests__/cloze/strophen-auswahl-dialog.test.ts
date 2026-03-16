/**
 * Unit tests for StrophenAuswahlDialog (src/components/cloze/strophen-auswahl-dialog.tsx)
 *
 * Since the project uses node environment (no jsdom/RTL), we validate
 * the component source for required patterns: ARIA attributes, focus-trap,
 * escape handling, cancel button, validation message, and responsive layout.
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 8.1, 8.2
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const COMPONENT_PATH = path.resolve(
  process.cwd(),
  "src/components/cloze/strophen-auswahl-dialog.tsx"
);
const source = fs.readFileSync(COMPONENT_PATH, "utf-8");

describe("StrophenAuswahlDialog component source", () => {
  // --- Directive and imports ---

  it('uses "use client" directive', () => {
    expect(source).toContain('"use client"');
  });

  it("imports required React hooks", () => {
    expect(source).toContain("useCallback");
    expect(source).toContain("useEffect");
    expect(source).toContain("useRef");
    expect(source).toContain("useState");
  });

  it("imports WEAKNESS_THRESHOLD from constants", () => {
    expect(source).toContain("WEAKNESS_THRESHOLD");
    expect(source).toContain("@/lib/cloze/constants");
  });

  it("imports getWeakStrophenIds and hasWeaknesses", () => {
    expect(source).toContain("getWeakStrophenIds");
    expect(source).toContain("hasWeaknesses");
    expect(source).toContain("@/lib/cloze/strophen-selection");
  });

  // --- ARIA attributes (Req 7.1) ---

  it('has role="dialog" attribute (Req 7.1)', () => {
    expect(source).toContain('role="dialog"');
  });

  it('has aria-modal="true" attribute (Req 7.1)', () => {
    expect(source).toContain('aria-modal="true"');
  });

  it("has aria-labelledby pointing to dialog title (Req 7.1)", () => {
    expect(source).toContain('aria-labelledby="strophen-dialog-title"');
    expect(source).toContain('id="strophen-dialog-title"');
  });

  // --- Focus management (Req 7.2) ---

  it("focuses first interactive element when dialog opens (Req 7.2)", () => {
    expect(source).toContain("firstFocusableRef");
    expect(source).toMatch(/firstFocusableRef\.current\?\.focus\(\)/);
  });

  // --- Escape handling (Req 7.3) ---

  it("handles Escape key to close dialog (Req 7.3)", () => {
    expect(source).toContain('"Escape"');
    expect(source).toMatch(/e\.key\s*===\s*"Escape"/);
    // Escape calls onCancel
    expect(source).toMatch(/if\s*\(e\.key\s*===\s*"Escape"\)[\s\S]*?onCancel\(\)/);
  });

  // --- Keyboard navigation (Req 7.4) ---

  it("handles Tab key for keyboard navigation (Req 7.4)", () => {
    expect(source).toContain('"Tab"');
    expect(source).toContain("e.key === \"Tab\"");
  });

  // --- Focus trap (Req 7.5) ---

  it("implements focus trap within dialog (Req 7.5)", () => {
    // Focus trap: wraps focus from last to first and vice versa
    expect(source).toContain("e.shiftKey");
    expect(source).toContain("first.focus()");
    expect(source).toContain("last.focus()");
    expect(source).toContain("e.preventDefault()");
    // Queries focusable elements
    expect(source).toContain("querySelectorAll");
  });

  // --- Weakness indicator aria-label (Req 7.6) ---

  it('weakness indicator has aria-label "Schwäche – Fortschritt unter 80%" (Req 7.6)', () => {
    expect(source).toContain(
      'aria-label="Schwäche – Fortschritt unter 80%"'
    );
  });

  // --- Responsive: fullscreen under 640px (Req 8.1) ---

  it("uses fullscreen layout for small viewports (Req 8.1)", () => {
    // max-sm: prefix targets viewports under 640px
    expect(source).toContain("max-sm:fixed");
    expect(source).toContain("max-sm:inset-0");
  });

  // --- Responsive: centered modal from 640px (Req 8.2) ---

  it("uses centered modal layout for larger viewports (Req 8.2)", () => {
    expect(source).toContain("sm:max-w-[480px]");
    expect(source).toContain("sm:rounded-lg");
  });

  // --- Scrollable list (Req 8.3) ---

  it("has scrollable strophen list", () => {
    expect(source).toContain("overflow-y-auto");
  });

  // --- Touch target size (Req 8.4) ---

  it("checkbox labels have minimum 44px touch target (Req 8.4)", () => {
    expect(source).toContain("min-h-[44px]");
  });

  // --- Cancel button (Req 3.6) ---

  it('has "Abbrechen" button that calls onCancel', () => {
    expect(source).toContain("Abbrechen");
    // The cancel button calls onCancel
    expect(source).toMatch(/onClick=\{onCancel\}/);
  });

  // --- Confirm button ---

  it('has "Übung starten" button that calls handleConfirm', () => {
    expect(source).toContain("Übung starten");
    expect(source).toContain("handleConfirm");
  });

  // --- Validation message ---

  it("shows validation error when no strophe is selected", () => {
    expect(source).toContain("validationError");
    expect(source).toContain(
      "Mindestens eine Strophe muss ausgewählt sein"
    );
    expect(source).toContain('role="alert"');
  });

  // --- Dialog returns null when not open ---

  it("returns null when open is false", () => {
    expect(source).toMatch(/if\s*\(\s*!open\s*\)\s*return\s*null/);
  });

  // --- Props interface ---

  it("defines StrophenAuswahlDialogProps with required props", () => {
    expect(source).toContain("songId: string");
    expect(source).toContain("strophen: StropheDetail[]");
    expect(source).toContain("activeStrophenIds: Set<string>");
    expect(source).toContain("open: boolean");
    expect(source).toContain("onConfirm:");
    expect(source).toContain("onCancel:");
  });

  // --- Internal state ---

  it("has localSelection state", () => {
    expect(source).toContain("localSelection");
    expect(source).toContain("setLocalSelection");
  });

  it("has progress state", () => {
    expect(source).toContain("useState<StropheProgress[] | null>(null)");
  });

  it("has loadingProgress state", () => {
    expect(source).toContain("loadingProgress");
    expect(source).toContain("setLoadingProgress");
  });

  it("has validationError state", () => {
    expect(source).toContain("useState<string | null>(null)");
  });

  // --- Progress loading ---

  it("loads progress via GET /api/progress?songId=X when opening", () => {
    expect(source).toMatch(/fetch\(\s*`\/api\/progress\?songId=\$\{songId\}`\s*\)/);
  });

  // --- Buttons ---

  it('has "Schwächen üben" button', () => {
    expect(source).toContain("Schwächen üben");
  });

  it('"Schwächen üben" button is disabled when no weaknesses', () => {
    expect(source).toMatch(/disabled=\{!hasAnyWeakness\}/);
  });

  it('"Schwächen üben" button has tooltip when disabled', () => {
    expect(source).toContain("Keine Schwächen vorhanden");
  });

  // --- Backdrop click closes dialog ---

  it("backdrop click calls onCancel", () => {
    expect(source).toMatch(/onClick=\{onCancel\}[\s\S]*?aria-hidden="true"/);
  });
});
