/**
 * Unit tests for UI components: ImportTabs, TextEditor, PdfUploader.
 *
 * Uses fs.readFileSync string-matching (node environment, no jsdom).
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

function readComponent(filePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), filePath), "utf-8");
}

describe("ImportTabs", () => {
  const source = readComponent("src/components/import/import-tabs.tsx");

  it('has role="tablist" attribute', () => {
    expect(source).toContain('role="tablist"');
  });

  it('has aria-label="Import-Methode" attribute', () => {
    expect(source).toContain('aria-label="Import-Methode"');
  });

  it('has role="tab" on each tab button', () => {
    expect(source).toContain('role="tab"');
  });

  it("has aria-selected attribute", () => {
    expect(source).toContain("aria-selected");
  });

  it("has aria-controls attribute", () => {
    expect(source).toContain("aria-controls");
  });
});

describe("TextEditor", () => {
  const source = readComponent("src/components/import/text-editor.tsx");

  it('contains aria-label="Songtext eingeben" on textarea', () => {
    expect(source).toContain('aria-label="Songtext eingeben"');
  });

  it("contains highlighting logic for [Section] markers", () => {
    expect(source).toContain("text-primary-600");
    expect(source).toContain("font-bold");
  });

  it("contains clipboardData.getData for plain-text paste handling", () => {
    expect(source).toContain("clipboardData.getData");
  });
});

describe("PdfUploader", () => {
  const source = readComponent("src/components/import/pdf-uploader.tsx");

  it('contains aria-live="polite" for status updates', () => {
    expect(source).toContain('aria-live="polite"');
  });

  it("contains file size validation", () => {
    expect(source).toContain("5 * 1024 * 1024");
  });

  it('contains accept=".pdf" on file input', () => {
    expect(source).toContain('accept=".pdf"');
  });

  it("contains status states (idle, uploading, success, error)", () => {
    expect(source).toContain('"idle"');
    expect(source).toContain('"uploading"');
    expect(source).toContain('"success"');
    expect(source).toContain('"error"');
  });
});
