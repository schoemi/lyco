/**
 * Unit tests for TranslationTab integration.
 *
 * Uses fs.readFileSync string-matching (node environment, no jsdom).
 *
 * Validates: Requirements 5.1, 5.2, 5.4, 5.5
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const COMPONENT_PATH = path.resolve(
  process.cwd(),
  "src/components/emotional/translation-tab.tsx"
);
const source = fs.readFileSync(COMPONENT_PATH, "utf-8");

describe("TranslationTab component source", () => {
  // --- Hint text when no translations exist (Req 5.1) ---

  it("shows hint text when no translations exist", () => {
    expect(source).toContain(
      "Noch keine Übersetzungen vorhanden. Starte eine Übersetzung, um die Zeilen zu übersetzen."
    );
  });

  it("checks hasTranslations via strophen.some with uebersetzung", () => {
    expect(source).toMatch(
      /strophen\.some\(\(s\)\s*=>\s*\n?\s*s\.zeilen\.some\(\(z\)\s*=>\s*z\.uebersetzung\)/
    );
  });

  it("renders hint text only when hasTranslations is false", () => {
    expect(source).toContain("if (!hasTranslations)");
  });

  // --- TranslateButton and LanguageSelector shown when no translations (Req 5.2) ---

  it("imports TranslateButton from songs", () => {
    expect(source).toContain(
      'import TranslateButton from "@/components/songs/translate-button"'
    );
  });

  it("imports LanguageSelector from songs", () => {
    expect(source).toContain(
      'import LanguageSelector from "@/components/songs/language-selector"'
    );
  });

  it("renders TranslateButton when onTranslate is provided", () => {
    expect(source).toContain("{onTranslate && (");
    expect(source).toContain("<TranslateButton");
  });

  it("passes translating and onClick to TranslateButton", () => {
    expect(source).toContain("translating={translating}");
    expect(source).toContain("onClick={onTranslate}");
  });

  it("renders LanguageSelector when setZielsprache is provided", () => {
    expect(source).toContain("{setZielsprache && (");
    expect(source).toContain("<LanguageSelector");
  });

  it("passes value, onChange, and disabled to LanguageSelector", () => {
    expect(source).toContain("value={zielsprache}");
    expect(source).toContain("onChange={setZielsprache}");
    expect(source).toContain("disabled={translating}");
  });

  // --- StropheCards shown when translations exist (Req 5.4) ---

  it("imports StropheCard component", () => {
    expect(source).toContain('import { StropheCard } from "./strophe-card"');
  });

  it("maps strophen to StropheCard components when translations exist", () => {
    expect(source).toContain("strophen.map((strophe) => (");
    expect(source).toContain("<StropheCard");
  });

  it("passes strophe, revealedLines, onRevealLine, onRevealAll to StropheCard", () => {
    expect(source).toContain("strophe={strophe}");
    expect(source).toContain("revealedLines={revealedLines[strophe.id]");
    expect(source).toContain("onRevealLine={(zeileId) => onRevealLine(strophe.id, zeileId)}");
    expect(source).toContain("onRevealAll={() => onRevealAll(strophe.id)}");
  });

  // --- Error message shown in tab on error (Req 5.5) ---

  it("renders error message when translateError is truthy", () => {
    expect(source).toContain("{translateError && (");
  });

  it('error message has role="alert"', () => {
    expect(source).toContain('role="alert"');
  });

  it("error message uses red styling", () => {
    expect(source).toContain("border-red-300");
    expect(source).toContain("bg-red-50");
    expect(source).toContain("text-red-700");
  });

  it("displays translateError content", () => {
    expect(source).toContain("{translateError}");
  });

  // --- Props interface ---

  it("accepts translating prop with default false", () => {
    expect(source).toContain("translating?: boolean");
    expect(source).toContain("translating = false");
  });

  it("accepts translateError prop with default null", () => {
    expect(source).toContain("translateError?: string | null");
    expect(source).toContain("translateError = null");
  });

  it("accepts translateSuccess prop with default false", () => {
    expect(source).toContain("translateSuccess?: boolean");
    expect(source).toContain("translateSuccess = false");
  });

  it("accepts zielsprache prop with default Deutsch", () => {
    expect(source).toContain("zielsprache?: string");
    expect(source).toContain('zielsprache = "Deutsch"');
  });

  it("accepts setZielsprache and onTranslate optional props", () => {
    expect(source).toContain("setZielsprache?: (sprache: string) => void");
    expect(source).toContain("onTranslate?: () => void");
  });

  // --- Success message ---

  it("shows success message when translateSuccess is true", () => {
    expect(source).toContain("{translateSuccess && (");
    expect(source).toContain("Übersetzung erfolgreich abgeschlossen.");
  });
});
