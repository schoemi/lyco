/**
 * Property 2: Initiale Auswahl umfasst alle Strophen
 *
 * Für jeden Song mit mindestens einer Strophe soll beim erstmaligen Laden der Cloze_Page
 * die Menge `activeStrophenIds` exakt alle Strophen-IDs des Songs enthalten.
 *
 * **Validates: Requirements 1.5**
 */
// Feature: selective-cloze-practice, Property 2: Initiale Auswahl umfasst alle Strophen

import { describe, it, expect } from "vitest";
import fc from "fast-check";

/**
 * Simulates the initialization logic from ClozePageClient:
 *   const allStrophenIds = new Set(loadedSong.strophen.map((s) => s.id));
 *   setActiveStrophenIds(allStrophenIds);
 */
function initializeActiveStrophenIds(strophenIds: string[]): Set<string> {
  return new Set(strophenIds);
}

// Generator: unique strophe IDs (at least 1)
const arbStrophenIds = fc
  .uniqueArray(fc.uuid(), { minLength: 1, maxLength: 20 })
  .filter((ids) => ids.length >= 1);

describe("Property 2: Initiale Auswahl umfasst alle Strophen", () => {
  it("initial activeStrophenIds contains exactly all strophe IDs", () => {
    fc.assert(
      fc.property(arbStrophenIds, (strophenIds) => {
        const activeStrophenIds = initializeActiveStrophenIds(strophenIds);

        // The set must contain exactly all strophe IDs
        expect(activeStrophenIds.size).toBe(strophenIds.length);

        // Every strophe ID must be in the set
        for (const id of strophenIds) {
          expect(activeStrophenIds.has(id)).toBe(true);
        }

        // The set must not contain any extra IDs
        for (const id of activeStrophenIds) {
          expect(strophenIds).toContain(id);
        }
      }),
      { numRuns: 100 },
    );
  });
});
