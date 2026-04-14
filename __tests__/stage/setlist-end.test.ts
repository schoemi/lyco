/**
 * Unit-Test für "Ende der Setlist"-Hinweis
 * (src/components/stage/next-song-hint.tsx)
 *
 * Testet:
 * - "Ende der Setlist" wird angezeigt wenn nextSongTitle null ist und visible true (Req 11.2)
 * - Dezente, gedimmte Darstellung (Req 11.3)
 * - Hinweis wird nicht gerendert wenn visible false ist (Req 11.1)
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const COMPONENT_PATH = path.resolve(
  process.cwd(),
  "src/components/stage/next-song-hint.tsx",
);
const source = fs.readFileSync(COMPONENT_PATH, "utf-8");

describe("NextSongHint — Quellcode-Inspektion", () => {
  // --- "Ende der Setlist" (Req 11.2) ---

  it('zeigt "Ende der Setlist" wenn nextSongTitle null ist (Req 11.2)', () => {
    expect(source).toContain("Ende der Setlist");
    expect(source).toContain("nextSongTitle === null");
  });

  it("prüft auf null-Wert für nextSongTitle (Req 11.2)", () => {
    expect(source).toMatch(/nextSongTitle\s*===\s*null/);
  });

  // --- Sichtbarkeit (Req 11.1) ---

  it("rendert nichts wenn visible false ist (Req 11.1)", () => {
    expect(source).toContain("if (!visible) return null");
  });

  it("prüft visible-Prop vor dem Rendern (Req 11.1)", () => {
    expect(source).toMatch(/if\s*\(\s*!visible\s*\)/);
  });

  // --- Dezente Darstellung (Req 11.3) ---

  it("verwendet gedimmte/transparente Textfarbe (Req 11.3)", () => {
    // text-white/40 or opacity-40 or similar dimmed styling
    const hasDimmedStyle =
      source.includes("text-white/40") ||
      source.includes("opacity-40") ||
      source.includes("opacity: 0.4") ||
      source.includes("text-white/30") ||
      source.includes("text-white/50");
    expect(hasDimmedStyle).toBe(true);
  });

  // --- Positionierung (Req 11.1) ---

  it("ist am unteren Bildschirmrand positioniert (Req 11.1)", () => {
    const hasBottomPosition =
      source.includes("bottom-") ||
      source.includes("bottom:") ||
      source.includes("fixed") ||
      source.includes("absolute");
    expect(hasBottomPosition).toBe(true);
  });

  // --- Interface (Req 11.1, 11.2) ---

  it("exportiert NextSongHintProps Interface mit nextSongTitle und visible (Req 11.1, 11.2)", () => {
    expect(source).toContain("NextSongHintProps");
    expect(source).toContain("nextSongTitle");
    expect(source).toContain("visible");
  });

  it("nextSongTitle ist string | null (Req 11.2)", () => {
    expect(source).toContain("string | null");
  });

  // --- shouldShowNextSongHint-Funktion (Req 11.1) ---

  it("exportiert shouldShowNextSongHint-Funktion (Req 11.1)", () => {
    expect(source).toContain("export function shouldShowNextSongHint");
  });

  it("shouldShowNextSongHint gibt false zurück für letzten Song (Req 11.2)", () => {
    expect(source).toContain("if (isLastSong) return false");
  });

  it("shouldShowNextSongHint prüft ob aktive Zeile in letzten 3 Zeilen liegt (Req 11.1)", () => {
    expect(source).toContain("totalLines - 3");
  });
});
