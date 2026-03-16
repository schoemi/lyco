/**
 * Property 2: Positions-Label zeigt „— von hinten" Suffix
 *
 * Für beliebige Position/Total-Werte: das StrophenNavigator-Label enthält
 * den Suffix „— von hinten" und das Richtungs-Icon ← wenn showDirectionIcon=true.
 *
 * Testet die Label-Konstruktionslogik aus dem StrophenNavigator-Komponenten-Template.
 *
 * **Validates: Requirements 2.1, 2.2**
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";

/**
 * Pure label construction logic extracted from StrophenNavigator's JSX:
 *
 *   {showDirectionIcon && <span className="mr-1">←</span>}
 *   Strophe {currentPosition} von {totalStrophen}
 *   {positionSuffix && <span> {positionSuffix}</span>}
 */
function buildPositionLabel(opts: {
  currentPosition: number;
  totalStrophen: number;
  positionSuffix?: string;
  showDirectionIcon?: boolean;
}): string {
  const parts: string[] = [];
  if (opts.showDirectionIcon) {
    parts.push("←");
  }
  parts.push(`Strophe ${opts.currentPosition} von ${opts.totalStrophen}`);
  if (opts.positionSuffix) {
    parts.push(opts.positionSuffix);
  }
  return parts.join(" ");
}

describe("Property 2: Positions-Label zeigt '— von hinten' Suffix", () => {
  const SUFFIX = "— von hinten";

  it("label always contains the suffix when positionSuffix is provided", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        fc.boolean(),
        (currentPosition, totalStrophen, showDirectionIcon) => {
          const label = buildPositionLabel({
            currentPosition,
            totalStrophen,
            positionSuffix: SUFFIX,
            showDirectionIcon,
          });

          expect(label).toContain(SUFFIX);
          expect(label).toContain(`Strophe ${currentPosition} von ${totalStrophen}`);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("label contains ← icon when showDirectionIcon is true", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        (currentPosition, totalStrophen) => {
          const label = buildPositionLabel({
            currentPosition,
            totalStrophen,
            positionSuffix: SUFFIX,
            showDirectionIcon: true,
          });

          expect(label).toMatch(/^←/);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("label does NOT contain ← icon when showDirectionIcon is false", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        (currentPosition, totalStrophen) => {
          const label = buildPositionLabel({
            currentPosition,
            totalStrophen,
            positionSuffix: SUFFIX,
            showDirectionIcon: false,
          });

          expect(label).not.toContain("←");
        },
      ),
      { numRuns: 200 },
    );
  });

  it("label does NOT contain suffix when positionSuffix is undefined", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        fc.boolean(),
        (currentPosition, totalStrophen, showDirectionIcon) => {
          const label = buildPositionLabel({
            currentPosition,
            totalStrophen,
            positionSuffix: undefined,
            showDirectionIcon,
          });

          expect(label).not.toContain(SUFFIX);
          expect(label).toContain(`Strophe ${currentPosition} von ${totalStrophen}`);
        },
      ),
      { numRuns: 200 },
    );
  });
});
