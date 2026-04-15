/**
 * Unit tests for StrophenAuswahlDialog instrumental filtering.
 *
 * Tests both the cloze and quiz variants of StrophenAuswahlDialog to verify
 * that instrumental strophes are excluded from the selection list and that
 * "Alle auswählen" only selects learnable strophes.
 *
 * Since the project uses node environment (no jsdom/RTL), we validate
 * the component source for required patterns.
 *
 * Validates: Requirements 3.3
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const CLOZE_DIALOG_PATH = path.resolve(
  process.cwd(),
  "src/components/cloze/strophen-auswahl-dialog.tsx"
);
const QUIZ_DIALOG_PATH = path.resolve(
  process.cwd(),
  "src/components/quiz/strophen-auswahl-dialog.tsx"
);

const clozeSource = fs.readFileSync(CLOZE_DIALOG_PATH, "utf-8");
const quizSource = fs.readFileSync(QUIZ_DIALOG_PATH, "utf-8");

describe("Cloze StrophenAuswahlDialog instrumental filtering", () => {
  // --- Requirement 3.3: Import filterLernbareStrophen ---

  it("imports filterLernbareStrophen from shared module (Req 3.3)", () => {
    expect(clozeSource).toContain("filterLernbareStrophen");
    expect(clozeSource).toContain("@/lib/shared/strophen-selection");
  });

  // --- Requirement 3.3: Instrumental strophes excluded from list ---

  it("filters strophen through filterLernbareStrophen (Req 3.3)", () => {
    expect(clozeSource).toMatch(/filterLernbareStrophen\(strophen\)/);
  });

  it("assigns filtered result to lernbareStrophen variable", () => {
    expect(clozeSource).toMatch(
      /lernbareStrophen\s*=\s*filterLernbareStrophen/
    );
  });

  it("sorts only learnable strophes for display", () => {
    expect(clozeSource).toMatch(/\[\.\.\.lernbareStrophen\]\.sort/);
  });

  // --- Requirement 3.3: "Alle auswählen" only selects learnable strophes ---

  it('"Alle auswählen" selects only learnable strophe IDs (Req 3.3)', () => {
    // handleSelectAll creates a Set from lernbareStrophen (not all strophen)
    expect(clozeSource).toMatch(
      /handleSelectAll[\s\S]*?lernbareStrophen\.map\(\(s\)\s*=>\s*s\.id\)/
    );
  });

  it('has "Alle auswählen" button', () => {
    expect(clozeSource).toContain("Alle auswählen");
    expect(clozeSource).toContain("handleSelectAll");
  });

  // --- Weakness handling only considers learnable strophes ---

  it("computes weakness detection only for learnable strophes", () => {
    expect(clozeSource).toMatch(
      /lernbareIds\s*=\s*new\s*Set\(lernbareStrophen\.map/
    );
    expect(clozeSource).toMatch(
      /lernbareProgress\s*=[\s\S]*?filter\(\(p\)\s*=>\s*lernbareIds\.has\(p\.stropheId\)\)/
    );
  });

  it('"Schwächen üben" only considers learnable strophes (Req 3.3)', () => {
    expect(clozeSource).toMatch(
      /handlePracticeWeaknesses[\s\S]*?lernbareStrophen/
    );
  });

  // --- Empty state ---

  it('shows "Keine lernbaren Strophen vorhanden" when no learnable strophes', () => {
    expect(clozeSource).toContain("Keine lernbaren Strophen vorhanden");
  });

  it("shows empty message when sortedStrophen is empty", () => {
    expect(clozeSource).toMatch(/sortedStrophen\.length\s*===\s*0/);
  });

  // --- Renders only learnable strophes ---

  it("iterates over sortedStrophen (filtered) for rendering", () => {
    expect(clozeSource).toContain("sortedStrophen.map");
  });
});

describe("Quiz StrophenAuswahlDialog instrumental filtering", () => {
  // --- Requirement 3.3: Import filterLernbareStrophen ---

  it("imports filterLernbareStrophen from shared module (Req 3.3)", () => {
    expect(quizSource).toContain("filterLernbareStrophen");
    expect(quizSource).toContain("@/lib/shared/strophen-selection");
  });

  // --- Requirement 3.3: Instrumental strophes excluded from list ---

  it("filters strophen through filterLernbareStrophen (Req 3.3)", () => {
    expect(quizSource).toMatch(/filterLernbareStrophen\(strophen\)/);
  });

  it("assigns filtered result to lernbareStrophen variable", () => {
    expect(quizSource).toMatch(
      /lernbareStrophen\s*=\s*filterLernbareStrophen/
    );
  });

  it("sorts only learnable strophes for display", () => {
    expect(quizSource).toMatch(/\[\.\.\.lernbareStrophen\]\.sort/);
  });

  // --- Requirement 3.3: "Alle auswählen" only selects learnable strophes ---

  it('"Alle auswählen" selects only learnable strophe IDs (Req 3.3)', () => {
    expect(quizSource).toMatch(
      /handleSelectAll[\s\S]*?lernbareStrophen\.map\(\(s\)\s*=>\s*s\.id\)/
    );
  });

  it('has "Alle auswählen" button', () => {
    expect(quizSource).toContain("Alle auswählen");
    expect(quizSource).toContain("handleSelectAll");
  });

  // --- Weakness handling only considers learnable strophes ---

  it("computes weakness detection only for learnable strophes", () => {
    expect(quizSource).toMatch(
      /lernbareIds\s*=\s*new\s*Set\(lernbareStrophen\.map/
    );
  });

  it('"Schwächen üben" only considers learnable strophes (Req 3.3)', () => {
    expect(quizSource).toMatch(
      /handlePracticeWeaknesses[\s\S]*?lernbareStrophen/
    );
  });

  // --- Empty state ---

  it('shows "Keine lernbaren Strophen vorhanden" when no learnable strophes', () => {
    expect(quizSource).toContain("Keine lernbaren Strophen vorhanden");
  });

  // --- Renders only learnable strophes ---

  it("iterates over sortedStrophen (filtered) for rendering", () => {
    expect(quizSource).toContain("sortedStrophen.map");
  });
});
