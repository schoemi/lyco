// Feature: lyco-stage, Property 9: DisplayMode-Unterstützung (aktualisiert)
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import fs from "fs";
import path from "path";

/**
 * Property 9: DisplayMode-Unterstützung (aktualisiert)
 *
 * Die Stage-Seite verwendet ausschließlich StageSongAnzeige als
 * Darstellungskomponente. Die alten Display-Modi (einzelzeile, strophe)
 * und die zugehörige Umschaltlogik (settings.displayMode) wurden entfernt.
 *
 * **Validates: Requirement 2.4**
 */

const PAGE_PATH = path.resolve(
  process.cwd(),
  "src/app/stage/[songId]/page.tsx",
);
const source = fs.readFileSync(PAGE_PATH, "utf-8");

describe("Property 9 – StageSongAnzeige als einzige Darstellungskomponente", () => {
  it("StageSongAnzeige ist in der Quelle vorhanden", () => {
    expect(source).toContain("StageSongAnzeige");
  });

  it("Quelle enthält NICHT EinzelzeileAnzeige oder StrophenAnzeige", () => {
    const removedComponents = ["EinzelzeileAnzeige", "StrophenAnzeige"] as const;

    fc.assert(
      fc.property(
        fc.constantFrom(...removedComponents),
        (component) => {
          expect(source).not.toContain(component);
        },
      ),
      { numRuns: 10 },
    );
  });

  it("Quelle enthält NICHT settings.displayMode", () => {
    expect(source).not.toContain("settings.displayMode");
  });

  it("StageSongAnzeige erhält song, flatLines, activeLineIndex und getLineColor Props", () => {
    const requiredProps = ["song", "flatLines", "activeLineIndex", "getLineColor"] as const;

    fc.assert(
      fc.property(
        fc.constantFrom(...requiredProps),
        (prop) => {
          // The component usage should contain each prop as an attribute
          // e.g. <StageSongAnzeige song={...} flatLines={...} ...>
          const usagePattern = new RegExp(
            `<StageSongAnzeige[\\s\\S]*?${prop}[={]`,
          );
          expect(source).toMatch(usagePattern);
        },
      ),
      { numRuns: 20 },
    );
  });
});
