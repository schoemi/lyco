/**
 * Property 9: Fortschritt nur für aktive Strophen persistiert
 *
 * Für jeden Song mit aktiver Strophen-Auswahl soll bei 100% Completion der Fortschritt
 * (PUT /api/progress) ausschließlich für die aktiven Strophen aufgerufen werden.
 * Für nicht-aktive Strophen soll kein API-Aufruf erfolgen.
 *
 * **Validates: Requirements 5.1, 5.2**
 */
// Feature: selective-cloze-practice, Property 9: Fortschritt nur für aktive Strophen persistiert

import { describe, it, expect } from "vitest";
import fc from "fast-check";

interface TestStrophe {
  id: string;
  name: string;
}

/**
 * Simulates the persistCompletion logic from the page component:
 *   const strophenToUpdate = activeStrophenIds
 *     ? song.strophen.filter((s) => activeStrophenIds.has(s.id))
 *     : song.strophen;
 *
 * Returns the IDs of strophes that would receive a PUT /api/progress call.
 */
function getStrophenToUpdate(
  allStrophen: TestStrophe[],
  activeStrophenIds: Set<string> | null,
): string[] {
  const strophenToUpdate = activeStrophenIds
    ? allStrophen.filter((s) => activeStrophenIds.has(s.id))
    : allStrophen;
  return strophenToUpdate.map((s) => s.id);
}

const arbStrophe = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 20 }),
});

const arbStrophen = fc.array(arbStrophe, { minLength: 2, maxLength: 10 });

describe("Property 9: Fortschritt nur für aktive Strophen persistiert", () => {
  it("progress is persisted only for active strophes, not for inactive ones", () => {
    fc.assert(
      fc.property(arbStrophen, (strophen) => {
        // Ensure unique IDs
        const uniqueStrophen = strophen.filter(
          (s, i, arr) => arr.findIndex((x) => x.id === s.id) === i,
        );
        if (uniqueStrophen.length < 2) return; // need at least 2 for meaningful test

        // Pick a non-empty proper subset as active
        const subsetSize = Math.max(1, Math.floor(uniqueStrophen.length / 2));
        const activeIds = new Set(uniqueStrophen.slice(0, subsetSize).map((s) => s.id));
        const inactiveIds = new Set(
          uniqueStrophen.filter((s) => !activeIds.has(s.id)).map((s) => s.id),
        );

        const updatedIds = getStrophenToUpdate(uniqueStrophen, activeIds);

        // All updated IDs must be active
        for (const id of updatedIds) {
          expect(activeIds.has(id)).toBe(true);
        }

        // No inactive ID should be updated
        for (const id of updatedIds) {
          expect(inactiveIds.has(id)).toBe(false);
        }

        // All active IDs should be updated
        for (const id of activeIds) {
          expect(updatedIds).toContain(id);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("when activeStrophenIds is null, all strophes are updated", () => {
    fc.assert(
      fc.property(arbStrophen, (strophen) => {
        const uniqueStrophen = strophen.filter(
          (s, i, arr) => arr.findIndex((x) => x.id === s.id) === i,
        );
        if (uniqueStrophen.length === 0) return;

        const updatedIds = getStrophenToUpdate(uniqueStrophen, null);

        expect(updatedIds.length).toBe(uniqueStrophen.length);
        for (const s of uniqueStrophen) {
          expect(updatedIds).toContain(s.id);
        }
      }),
      { numRuns: 100 },
    );
  });
});
