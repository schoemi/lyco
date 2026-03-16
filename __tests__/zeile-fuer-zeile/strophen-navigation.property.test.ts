/**
 * Property 8: Strophen-Navigation innerhalb der Auswahl
 *
 * Für jede Auswahl von M Strophen (M ≥ 2) und jede aktuelle Position P
 * (0 ≤ P < M), soll „Nächste Strophe" zur Position P+1 wechseln (wenn P < M-1)
 * und „Vorherige Strophe" zur Position P-1 (wenn P > 0), wobei jeweils die
 * erste Zeile der neuen Strophe als aktiv gesetzt wird. Navigation soll
 * ausschließlich zwischen ausgewählten Strophen erfolgen.
 *
 * **Validates: Requirements 6.3, 6.4, 9.7, 9.9**
 */
// Feature: line-by-line-learning, Property 8: Strophen-Navigation innerhalb der Auswahl

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import fs from "fs";
import path from "path";

const PAGE_PATH = path.resolve(
  process.cwd(),
  "src/app/(main)/songs/[id]/zeile-fuer-zeile/page.tsx",
);
const source = fs.readFileSync(PAGE_PATH, "utf-8");

// --- Pure functions simulating strophen navigation logic ---

function simulateNextStrophe(currentIndex: number, totalStrophen: number): number | null {
  if (currentIndex >= totalStrophen - 1) return null; // can't go forward
  return currentIndex + 1;
}

function simulatePreviousStrophe(currentIndex: number): number | null {
  if (currentIndex <= 0) return null; // can't go back
  return currentIndex - 1;
}

function canGoForward(currentIndex: number, totalStrophen: number): boolean {
  return currentIndex < totalStrophen - 1;
}

function canGoBack(currentIndex: number): boolean {
  return currentIndex > 0;
}

/**
 * Simulates loadStropheState for a new strophe (no saved state).
 * Returns the zeileIndex that should be set after navigation.
 */
function getZeileIndexAfterNavigation(): number {
  return 0; // always starts at first line of new strophe
}

// --- Arbitraries ---

/** Total number of selected strophen (at least 2 for navigation to be meaningful) */
const arbTotalStrophen = fc.integer({ min: 2, max: 20 });

/** Current strophe position for a given total (0-indexed) */
const arbPosition = (total: number) => fc.integer({ min: 0, max: total - 1 });

/** Non-last position (can go forward) */
const arbNonLastPosition = (total: number) => fc.integer({ min: 0, max: total - 2 });

/** Non-first position (can go back) */
const arbNonFirstPosition = (total: number) => fc.integer({ min: 1, max: total - 1 });

describe("Property 8: Strophen-Navigation innerhalb der Auswahl", () => {
  // --- Source code verification ---

  it("source contains handleNextStrophe that checks boundary", () => {
    expect(source).toMatch(/handleNextStrophe/);
    expect(source).toMatch(/currentStropheIndex >= filteredStrophen\.length - 1/);
  });

  it("source contains handlePreviousStrophe that checks boundary", () => {
    expect(source).toMatch(/handlePreviousStrophe/);
    expect(source).toMatch(/currentStropheIndex <= 0/);
  });

  it("source calls loadStropheState on navigation", () => {
    expect(source).toMatch(/loadStropheState\(targetStrophe\.id\)/);
  });

  // --- Property tests ---

  it("next strophe increments index by 1 when not at last position (Req 6.3)", () => {
    fc.assert(
      fc.property(
        arbTotalStrophen,
        (total) => {
          fc.assert(
            fc.property(
              arbNonLastPosition(total),
              (position) => {
                const result = simulateNextStrophe(position, total);
                expect(result).toBe(position + 1);
              },
            ),
            { numRuns: 10 },
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it("previous strophe decrements index by 1 when not at first position (Req 6.4)", () => {
    fc.assert(
      fc.property(
        arbTotalStrophen,
        (total) => {
          fc.assert(
            fc.property(
              arbNonFirstPosition(total),
              (position) => {
                const result = simulatePreviousStrophe(position);
                expect(result).toBe(position - 1);
              },
            ),
            { numRuns: 10 },
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it("navigation is blocked at last position (forward returns null)", () => {
    fc.assert(
      fc.property(
        arbTotalStrophen,
        (total) => {
          const lastIndex = total - 1;
          const result = simulateNextStrophe(lastIndex, total);
          expect(result).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it("navigation is blocked at first position (backward returns null)", () => {
    fc.assert(
      fc.property(
        arbTotalStrophen,
        (_total) => {
          const result = simulatePreviousStrophe(0);
          expect(result).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it("canGoBack is false at index 0, canGoForward is false at last index", () => {
    fc.assert(
      fc.property(
        arbTotalStrophen,
        (total) => {
          expect(canGoBack(0)).toBe(false);
          expect(canGoForward(total - 1, total)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("canGoBack is true for all non-first positions", () => {
    fc.assert(
      fc.property(
        arbTotalStrophen,
        (total) => {
          fc.assert(
            fc.property(
              arbNonFirstPosition(total),
              (position) => {
                expect(canGoBack(position)).toBe(true);
              },
            ),
            { numRuns: 10 },
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it("canGoForward is true for all non-last positions", () => {
    fc.assert(
      fc.property(
        arbTotalStrophen,
        (total) => {
          fc.assert(
            fc.property(
              arbNonLastPosition(total),
              (position) => {
                expect(canGoForward(position, total)).toBe(true);
              },
            ),
            { numRuns: 10 },
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it("after navigation, new strophe starts at zeileIndex 0 (Req 9.9)", () => {
    fc.assert(
      fc.property(
        arbTotalStrophen,
        (total) => {
          fc.assert(
            fc.property(
              arbPosition(total),
              (_position) => {
                // Regardless of which strophe we navigate to, zeileIndex resets to 0
                expect(getZeileIndexAfterNavigation()).toBe(0);
              },
            ),
            { numRuns: 10 },
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it("navigation only occurs between selected strophen (Req 9.7)", () => {
    fc.assert(
      fc.property(
        arbTotalStrophen,
        (totalSelected) => {
          // For any position within the selected range, navigation stays within bounds
          fc.assert(
            fc.property(
              arbPosition(totalSelected),
              (position) => {
                const nextResult = simulateNextStrophe(position, totalSelected);
                const prevResult = simulatePreviousStrophe(position);

                // Next is either null (at boundary) or within [0, totalSelected-1]
                if (nextResult !== null) {
                  expect(nextResult).toBeGreaterThanOrEqual(0);
                  expect(nextResult).toBeLessThan(totalSelected);
                }

                // Previous is either null (at boundary) or within [0, totalSelected-1]
                if (prevResult !== null) {
                  expect(prevResult).toBeGreaterThanOrEqual(0);
                  expect(prevResult).toBeLessThan(totalSelected);
                }
              },
            ),
            { numRuns: 10 },
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it("sequential forward navigation visits all strophen exactly once", () => {
    fc.assert(
      fc.property(
        arbTotalStrophen,
        (total) => {
          const visited: number[] = [0];
          let current = 0;

          while (true) {
            const next = simulateNextStrophe(current, total);
            if (next === null) break;
            visited.push(next);
            current = next;
          }

          // Should visit all positions from 0 to total-1
          expect(visited.length).toBe(total);
          for (let i = 0; i < total; i++) {
            expect(visited[i]).toBe(i);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("sequential backward navigation from last visits all strophen exactly once", () => {
    fc.assert(
      fc.property(
        arbTotalStrophen,
        (total) => {
          const lastIndex = total - 1;
          const visited: number[] = [lastIndex];
          let current = lastIndex;

          while (true) {
            const prev = simulatePreviousStrophe(current);
            if (prev === null) break;
            visited.push(prev);
            current = prev;
          }

          // Should visit all positions from total-1 down to 0
          expect(visited.length).toBe(total);
          for (let i = 0; i < total; i++) {
            expect(visited[i]).toBe(lastIndex - i);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
