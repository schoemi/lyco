/**
 * Property 2: Sprachwarnung bei identischer Zielsprache
 *
 * Für beliebige Songs mit gesetztem `sprache`-Feld:
 * Wenn `zielsprache === song.sprache`, wird eine Warnung angezeigt.
 * Wenn `zielsprache !== song.sprache` oder `sprache` nicht gesetzt, wird keine Warnung angezeigt.
 *
 * **Validates: Requirement 2.5**
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import fs from "fs";
import path from "path";

// --- Read the source of the Song detail page ---
const PAGE_PATH = path.resolve(
  process.cwd(),
  "src/app/(main)/songs/[id]/page.tsx"
);
const source = fs.readFileSync(PAGE_PATH, "utf-8");

// --- Pure logic extracted from the component ---
// Mirrors the conditional: song.sprache && song.sprache === zielsprache
function shouldShowLanguageWarning(
  songSprache: string | null | undefined,
  zielsprache: string
): boolean {
  return !!songSprache && songSprache === zielsprache;
}

// --- Arbitraries ---
const spracheArb = fc.stringMatching(/^[A-Za-zÄÖÜäöüß]{1,30}$/);

describe("Property 2: Sprachwarnung bei identischer Zielsprache", () => {
  // --- Source-level checks ---

  it("source contains the conditional guard for identical language warning", () => {
    // The component must check song.sprache && song.sprache === zielsprache
    expect(source).toContain("song.sprache === zielsprache");
    expect(source).toContain("song.sprache &&");
  });

  it("source contains the warning hint text", () => {
    expect(source).toContain(
      "Hinweis: Die Zielsprache entspricht der Originalsprache des Songs"
    );
  });

  it("source renders the warning in a yellow-styled container", () => {
    expect(source).toContain("border-yellow-200");
    expect(source).toContain("bg-yellow-50");
    expect(source).toContain("text-yellow-700");
  });

  // --- Property-based logic tests ---

  it("warning is shown when zielsprache equals song.sprache (non-empty)", () => {
    fc.assert(
      fc.property(spracheArb, (sprache) => {
        expect(shouldShowLanguageWarning(sprache, sprache)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("warning is NOT shown when zielsprache differs from song.sprache", () => {
    fc.assert(
      fc.property(
        spracheArb,
        spracheArb.filter((s2) => s2.length > 0),
        (sprache, zielsprache) => {
          fc.pre(sprache !== zielsprache);
          expect(shouldShowLanguageWarning(sprache, zielsprache)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("warning is NOT shown when song.sprache is null or undefined", () => {
    fc.assert(
      fc.property(spracheArb, (zielsprache) => {
        expect(shouldShowLanguageWarning(null, zielsprache)).toBe(false);
        expect(shouldShowLanguageWarning(undefined, zielsprache)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("warning is NOT shown when song.sprache is empty string", () => {
    fc.assert(
      fc.property(spracheArb, (zielsprache) => {
        expect(shouldShowLanguageWarning("", zielsprache)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
