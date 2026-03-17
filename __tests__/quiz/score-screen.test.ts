/**
 * Unit tests for ScoreScreen component
 * (src/components/quiz/score-screen.tsx)
 *
 * Source-level validation (no jsdom/RTL).
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 8.7
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const COMPONENT_PATH = path.resolve(
  process.cwd(),
  "src/components/quiz/score-screen.tsx"
);
const source = fs.readFileSync(COMPONENT_PATH, "utf-8");

describe("ScoreScreen component source", () => {
  it("is a client component", () => {
    expect(source).toContain('"use client"');
  });

  it("exports ScoreScreen function", () => {
    expect(source).toMatch(/export\s+function\s+ScoreScreen/);
  });

  it("imports getEmpfehlung from @/lib/quiz/score", () => {
    expect(source).toContain("getEmpfehlung");
    expect(source).toContain("@/lib/quiz/score");
  });

  it("imports Link from next/link", () => {
    expect(source).toContain("Link");
    expect(source).toContain("next/link");
  });

  it("accepts correct, total, songId, and onRepeat props", () => {
    expect(source).toContain("correct");
    expect(source).toContain("total");
    expect(source).toContain("songId");
    expect(source).toContain("onRepeat");
  });

  it("calculates prozent from correct/total", () => {
    expect(source).toMatch(/correct\s*\/\s*total/);
  });

  it("calls getEmpfehlung with prozent", () => {
    expect(source).toContain("getEmpfehlung(prozent)");
  });

  it('displays score in "N / M korrekt" format (Req 6.1)', () => {
    expect(source).toContain("korrekt");
    expect(source).toContain("{correct}");
    expect(source).toContain("{total}");
  });

  it('shows "Nochmal üben" recommendation (Req 6.2)', () => {
    expect(source).toContain("Nochmal üben");
  });

  it('shows "Weiter zur nächsten Methode" recommendation (Req 6.3)', () => {
    expect(source).toContain("Weiter zur nächsten Methode");
  });

  it('has "Quiz wiederholen" button calling onRepeat (Req 6.4)', () => {
    expect(source).toContain("Quiz wiederholen");
    expect(source).toContain("onRepeat");
  });

  it('has "Zurück zur Song-Seite" link to /songs/[id] (Req 6.5)', () => {
    expect(source).toContain("Zurück zur Song-Seite");
    expect(source).toContain("/songs/${songId}");
  });

  it('uses aria-live="polite" for result communication (Req 8.7)', () => {
    expect(source).toContain('aria-live="polite"');
  });
});
