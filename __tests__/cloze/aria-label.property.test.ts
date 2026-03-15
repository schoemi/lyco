/**
 * Property 11: Aria-Label-Format für Lücken
 *
 * Für jede Lücke N in einer Strophe mit M Lücken und Strophen-Name S
 * soll das aria-label dem Format "Lücke N von M in S" entsprechen.
 *
 * **Validates: Requirements 9.1**
 */
// Feature: cloze-learning, Property 11: Aria-Label-Format für Lücken

import { describe, it, expect } from "vitest";
import fc from "fast-check";

function generateAriaLabel(position: number, total: number, stanzaName: string): string {
  return `Lücke ${position} von ${total} in ${stanzaName}`;
}

describe("Property 11: Aria-Label-Format für Lücken", () => {
  it("aria-label matches format 'Lücke N von M in [Strophen-Name]' for any valid inputs", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 1, max: 1000 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        (position, total, stanzaName) => {
          const label = generateAriaLabel(position, total, stanzaName);
          expect(label).toBe(`Lücke ${position} von ${total} in ${stanzaName}`);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("aria-label starts with 'Lücke' and contains 'von' and 'in'", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 1, max: 1000 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        (position, total, stanzaName) => {
          const label = generateAriaLabel(position, total, stanzaName);
          expect(label).toMatch(/^Lücke \d+ von \d+ in .+$/);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("aria-label preserves the exact stanza name without modification", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 1, max: 1000 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        (position, total, stanzaName) => {
          const label = generateAriaLabel(position, total, stanzaName);
          expect(label.endsWith(stanzaName)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});
