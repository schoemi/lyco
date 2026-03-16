/**
 * Unit tests for ClozePageClient integration with Strophen-Auswahl
 *
 * Since the project uses node environment (no jsdom/RTL), we validate
 * the component source for required patterns: "Strophen auswählen" button,
 * dialog integration, and progress persistence only for active strophes.
 *
 * Validates: Requirements 1.1, 1.2, 5.1, 5.2
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const COMPONENT_PATH = path.resolve(
  process.cwd(),
  "src/app/(main)/songs/[id]/cloze/page.tsx",
);
const source = fs.readFileSync(COMPONENT_PATH, "utf-8");

describe("ClozePageClient Strophen-Auswahl integration", () => {
  // --- Req 1.1: Button "Strophen auswählen" present ---

  it('renders a "Strophen auswählen" button (Req 1.1)', () => {
    expect(source).toContain("Strophen auswählen");
  });

  it("button opens dialog via setDialogOpen(true) (Req 1.2)", () => {
    expect(source).toContain("setDialogOpen(true)");
  });

  // --- Dialog integration ---

  it("imports StrophenAuswahlDialog component", () => {
    expect(source).toContain("StrophenAuswahlDialog");
    expect(source).toContain("strophen-auswahl-dialog");
  });

  it("renders StrophenAuswahlDialog with open prop", () => {
    expect(source).toMatch(/open=\{dialogOpen\}/);
  });

  it("renders StrophenAuswahlDialog with onConfirm handler", () => {
    expect(source).toMatch(/onConfirm=\{handleStrophenConfirm\}/);
  });

  it("renders StrophenAuswahlDialog with onCancel handler", () => {
    expect(source).toMatch(/onCancel=\{.*setDialogOpen\(false\).*\}/s);
  });

  // --- State management ---

  it("has activeStrophenIds state", () => {
    expect(source).toContain("activeStrophenIds");
    expect(source).toContain("setActiveStrophenIds");
  });

  it("has dialogOpen state", () => {
    expect(source).toContain("dialogOpen");
    expect(source).toContain("setDialogOpen");
  });

  it("initializes activeStrophenIds to all strophe IDs after song load", () => {
    // The initialization pattern: new Set(loadedSong.strophen.map(...))
    expect(source).toMatch(/new Set\(loadedSong\.strophen\.map/);
    expect(source).toContain("setActiveStrophenIds");
  });

  // --- Req 5.1, 5.2: Progress persistence only for active strophes ---

  it("filters strophes by activeStrophenIds in persistCompletion (Req 5.1)", () => {
    // The pattern: activeStrophenIds ? song.strophen.filter(...) : song.strophen
    expect(source).toMatch(/activeStrophenIds[\s\S]*?\.filter\(\(s\)\s*=>\s*activeStrophenIds\.has\(s\.id\)\)/);
  });

  it("persists progress via PUT /api/progress (Req 5.1)", () => {
    expect(source).toContain('"/api/progress"');
    expect(source).toContain('"PUT"');
    expect(source).toContain("stropheId");
    expect(source).toContain("prozent: 100");
  });

  it("only iterates over strophenToUpdate for progress calls (Req 5.2)", () => {
    expect(source).toContain("strophenToUpdate");
    expect(source).toMatch(/for\s*\(\s*const\s+strophe\s+of\s+strophenToUpdate\s*\)/);
  });

  // --- handleStrophenConfirm ---

  it("handleStrophenConfirm resets answers", () => {
    expect(source).toMatch(/handleStrophenConfirm[\s\S]*?setAnswers\(\{\}\)/);
  });

  it("handleStrophenConfirm resets feedback", () => {
    expect(source).toMatch(/handleStrophenConfirm[\s\S]*?setFeedback\(\{\}\)/);
  });

  it("handleStrophenConfirm resets hints", () => {
    expect(source).toMatch(/handleStrophenConfirm[\s\S]*?setHints\(new Set\(\)\)/);
  });

  it("handleStrophenConfirm resets completionFired", () => {
    expect(source).toMatch(/handleStrophenConfirm[\s\S]*?completionFired\.current\s*=\s*false/);
  });

  // --- handleDifficultyChange preserves activeStrophenIds ---

  it("handleDifficultyChange uses activeStrophenIds for gap generation", () => {
    expect(source).toMatch(/handleDifficultyChange[\s\S]*?getZeilenFromSong\(song,\s*activeStrophenIds\)/);
  });

  // --- sortedStrophen filters by activeStrophenIds ---

  it("sortedStrophen filters by activeStrophenIds", () => {
    expect(source).toMatch(/\.filter\(\(s\)\s*=>\s*!activeStrophenIds\s*\|\|\s*activeStrophenIds\.has\(s\.id\)\)/);
  });
});
