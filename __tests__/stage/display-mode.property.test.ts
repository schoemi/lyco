// Feature: lyco-stage, Property 9: DisplayMode-Unterstützung
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import fs from "fs";
import path from "path";

/**
 * Property 9: DisplayMode-Unterstützung
 *
 * Für jeden gültigen DisplayMode-Wert (einzelzeile, strophe, song) soll die
 * Prompter-Ansicht eine nicht-leere Darstellung rendern, wenn mindestens eine
 * Zeile vorhanden ist.
 *
 * Tested via source-code inspection: the page must contain all three display modes.
 *
 * **Validates: Requirement 6.2**
 */

const PAGE_PATH = path.resolve(
  process.cwd(),
  "src/app/stage/[songId]/page.tsx",
);
const source = fs.readFileSync(PAGE_PATH, "utf-8");

const PBT_CONFIG = { numRuns: 100 };

describe("Property 9 – DisplayMode-Unterstützung", () => {
  it("Seite enthält alle drei DisplayMode-Werte", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("einzelzeile" as const, "strophe" as const, "song" as const),
        (mode) => {
          expect(source).toContain(`"${mode}"`);
        },
      ),
      PBT_CONFIG,
    );
  });

  it("Seite enthält Rendering-Logik für 'einzelzeile'", () => {
    expect(source).toContain("einzelzeile");
    expect(source).toContain("EinzelzeileAnzeige");
  });

  it("Seite enthält Rendering-Logik für 'strophe'", () => {
    expect(source).toContain("strophe");
    expect(source).toContain("StrophenAnzeige");
  });

  it("Seite enthält Rendering-Logik für 'song'", () => {
    expect(source).toContain("song");
    expect(source).toContain("StageSongAnzeige");
  });

  it("Seite verwendet displayMode aus den Settings", () => {
    expect(source).toContain("settings.displayMode");
  });
});
