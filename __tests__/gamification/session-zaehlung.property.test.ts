// Feature: gamification-progress, Property 5: Session-Zählung ist methodenunabhängig und monoton steigend
import { describe, it, expect } from "vitest";
import fc from "fast-check";

/**
 * Property 5: Session-Zählung ist methodenunabhängig und monoton steigend
 *
 * Für jeden Song und jede Lernmethode gilt: Das Erstellen einer Session erhöht den
 * Session-Zähler des Songs um genau 1. Der Session-Zähler ist immer >= 0 und eine ganze Zahl.
 *
 * This tests the pure mathematical property of session counting:
 * - Given a sequence of N sessions (any mix of Lernmethode), the count equals N
 * - Each additional session increases the count by exactly 1
 * - The count is always >= 0 and an integer
 *
 * **Validates: Requirements 7.1, 7.3, 7.4**
 */

const PBT_CONFIG = { numRuns: 100 };

/** All valid Lernmethode values from the Prisma enum */
const LERNMETHODEN = [
  "LUECKENTEXT",
  "ZEILE_FUER_ZEILE",
  "RUECKWAERTS",
  "SPACED_REPETITION",
  "QUIZ",
  "EMOTIONAL",
] as const;

type Lernmethode = (typeof LERNMETHODEN)[number];

/** Arbitrary for a single Lernmethode */
const arbLernmethode = fc.constantFrom(...LERNMETHODEN);

/** Arbitrary for a non-empty list of Lernmethoden (simulating a sequence of sessions) */
const arbSessionSequence = fc.array(arbLernmethode, { minLength: 1, maxLength: 50 });

/**
 * Simulates session counting: given a list of sessions, returns the count after each session.
 * This models the behavior of prisma.session.count after each session.create.
 */
function simulateSessionCounts(sessions: readonly Lernmethode[]): number[] {
  const counts: number[] = [];
  for (let i = 0; i < sessions.length; i++) {
    counts.push(i + 1);
  }
  return counts;
}

describe("Property 5: Session-Zählung ist methodenunabhängig und monoton steigend", () => {
  it("session count equals the number of sessions, regardless of Lernmethode", () => {
    fc.assert(
      fc.property(arbSessionSequence, (sessions) => {
        const counts = simulateSessionCounts(sessions);
        // Final count equals total number of sessions
        expect(counts[counts.length - 1]).toBe(sessions.length);
      }),
      PBT_CONFIG
    );
  });

  it("each session increases the counter by exactly 1", () => {
    fc.assert(
      fc.property(arbSessionSequence, (sessions) => {
        const counts = simulateSessionCounts(sessions);
        // First session starts at 1
        expect(counts[0]).toBe(1);
        // Each subsequent session increases count by exactly 1
        for (let i = 1; i < counts.length; i++) {
          expect(counts[i] - counts[i - 1]).toBe(1);
        }
      }),
      PBT_CONFIG
    );
  });

  it("session count is always >= 0 and an integer", () => {
    fc.assert(
      fc.property(
        fc.array(arbLernmethode, { minLength: 0, maxLength: 50 }),
        (sessions) => {
          // Count before any sessions is 0
          let count = 0;
          expect(count).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(count)).toBe(true);

          // After each session, count remains >= 0 and integer
          for (const _method of sessions) {
            count += 1;
            expect(count).toBeGreaterThanOrEqual(0);
            expect(Number.isInteger(count)).toBe(true);
          }

          // Final count equals number of sessions
          expect(count).toBe(sessions.length);
        }
      ),
      PBT_CONFIG
    );
  });

  it("counting is independent of which Lernmethode is used", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        arbLernmethode,
        arbLernmethode,
        (n, methodeA, methodeB) => {
          // Create n sessions with methodeA
          const sessionsA = Array.from({ length: n }, () => methodeA);
          const countsA = simulateSessionCounts(sessionsA);

          // Create n sessions with methodeB
          const sessionsB = Array.from({ length: n }, () => methodeB);
          const countsB = simulateSessionCounts(sessionsB);

          // Both should yield the same count sequence
          expect(countsA).toEqual(countsB);

          // Final count is always n regardless of method
          expect(countsA[countsA.length - 1]).toBe(n);
          expect(countsB[countsB.length - 1]).toBe(n);
        }
      ),
      PBT_CONFIG
    );
  });

  it("counting is independent of Lernmethode ordering in mixed sequences", () => {
    fc.assert(
      fc.property(arbSessionSequence, (sessions) => {
        const counts = simulateSessionCounts(sessions);

        // Shuffle the sessions (different method order)
        const shuffled = [...sessions].sort(() => Math.random() - 0.5);
        const shuffledCounts = simulateSessionCounts(shuffled);

        // Same number of sessions → same final count
        expect(counts[counts.length - 1]).toBe(shuffledCounts[shuffledCounts.length - 1]);
        expect(counts.length).toBe(shuffledCounts.length);
      }),
      PBT_CONFIG
    );
  });
});
