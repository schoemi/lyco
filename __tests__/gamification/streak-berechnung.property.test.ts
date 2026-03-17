// Feature: gamification-progress, Property 1: Streak-Berechnung ist korrekt
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { berechneStreak } from "@/lib/gamification/streak";

/**
 * Property 1: Streak-Berechnung ist korrekt
 *
 * Für jede gültige Kombination aus aktuellem Streak-Wert (≥ 0), Datum der letzten Session
 * und heutigem Datum gilt die korrekte Streak-Logik.
 *
 * **Validates: Requirements 1.2, 1.3, 1.4, 1.5, 3.2, 3.3, 3.4, 11.3**
 */

const PBT_CONFIG = { numRuns: 100 };

/** Generate a Date with only calendar-day precision (no time component) */
const arbDate = () =>
  fc
    .record({
      year: fc.integer({ min: 2020, max: 2030 }),
      month: fc.integer({ min: 1, max: 12 }),
      day: fc.integer({ min: 1, max: 28 }), // 28 to avoid invalid dates
    })
    .map(({ year, month, day }) => new Date(year, month - 1, day));

/** Helper: calendar-day diff (same logic as the implementation) */
function diffInDays(today: Date, last: Date): number {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const l = new Date(last.getFullYear(), last.getMonth(), last.getDate());
  return Math.round((t.getTime() - l.getTime()) / 86_400_000);
}

describe("Property 1: Streak-Berechnung ist korrekt", () => {
  it("when lastSessionDate is null → streak = 1 and lastSessionDate = today", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        arbDate(),
        (currentStreak, today) => {
          const result = berechneStreak({ currentStreak, lastSessionDate: null, today });
          expect(result.streak).toBe(1);
          expect(result.lastSessionDate).toBe(today);
        }
      ),
      PBT_CONFIG
    );
  });

  it("when diff is 0 (same day) → streak unchanged and lastSessionDate unchanged", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        arbDate(),
        (currentStreak, date) => {
          // Same day: today === lastSessionDate
          const result = berechneStreak({
            currentStreak,
            lastSessionDate: date,
            today: date,
          });
          expect(result.streak).toBe(currentStreak);
          expect(result.lastSessionDate).toBe(date);
        }
      ),
      PBT_CONFIG
    );
  });

  it("when diff is 1 (consecutive day) → streak = currentStreak + 1 and lastSessionDate = today", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        arbDate(),
        (currentStreak, lastDate) => {
          // Create today as exactly 1 day after lastDate
          const today = new Date(
            lastDate.getFullYear(),
            lastDate.getMonth(),
            lastDate.getDate() + 1
          );
          const result = berechneStreak({
            currentStreak,
            lastSessionDate: lastDate,
            today,
          });
          expect(result.streak).toBe(currentStreak + 1);
          expect(result.lastSessionDate).toBe(today);
        }
      ),
      PBT_CONFIG
    );
  });

  it("when diff > 1 → streak = 1 and lastSessionDate = today", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        arbDate(),
        fc.integer({ min: 2, max: 365 }),
        (currentStreak, lastDate, gap) => {
          const today = new Date(
            lastDate.getFullYear(),
            lastDate.getMonth(),
            lastDate.getDate() + gap
          );
          const result = berechneStreak({
            currentStreak,
            lastSessionDate: lastDate,
            today,
          });
          expect(result.streak).toBe(1);
          expect(result.lastSessionDate).toBe(today);
        }
      ),
      PBT_CONFIG
    );
  });

  it("result streak is always >= 1", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        fc.option(arbDate(), { nil: null }),
        arbDate(),
        (currentStreak, lastSessionDate, today) => {
          // Ensure today >= lastSessionDate when lastSessionDate is not null
          if (lastSessionDate !== null) {
            fc.pre(today.getTime() >= lastSessionDate.getTime());
          }
          const result = berechneStreak({ currentStreak, lastSessionDate, today });
          expect(result.streak).toBeGreaterThanOrEqual(1);
        }
      ),
      PBT_CONFIG
    );
  });

  it("result lastSessionDate is always a valid Date", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        fc.option(arbDate(), { nil: null }),
        arbDate(),
        (currentStreak, lastSessionDate, today) => {
          if (lastSessionDate !== null) {
            fc.pre(today.getTime() >= lastSessionDate.getTime());
          }
          const result = berechneStreak({ currentStreak, lastSessionDate, today });
          expect(result.lastSessionDate).toBeInstanceOf(Date);
          expect(Number.isNaN(result.lastSessionDate.getTime())).toBe(false);
        }
      ),
      PBT_CONFIG
    );
  });
});
