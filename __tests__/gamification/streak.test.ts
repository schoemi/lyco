import { describe, it, expect } from 'vitest';
import { berechneStreak } from '@/lib/gamification/streak';

describe('berechneStreak', () => {
  const date = (y: number, m: number, d: number) => new Date(y, m - 1, d);

  it('returns streak 1 when lastSessionDate is null', () => {
    const today = date(2025, 1, 15);
    const result = berechneStreak({ currentStreak: 0, lastSessionDate: null, today });
    expect(result).toEqual({ streak: 1, lastSessionDate: today });
  });

  it('keeps streak unchanged on same calendar day', () => {
    const today = date(2025, 1, 15);
    const last = date(2025, 1, 15);
    const result = berechneStreak({ currentStreak: 5, lastSessionDate: last, today });
    expect(result).toEqual({ streak: 5, lastSessionDate: last });
  });

  it('increments streak by 1 when today is exactly 1 day after last session', () => {
    const last = date(2025, 1, 14);
    const today = date(2025, 1, 15);
    const result = berechneStreak({ currentStreak: 3, lastSessionDate: last, today });
    expect(result).toEqual({ streak: 4, lastSessionDate: today });
  });

  it('resets streak to 1 when gap is more than 1 day', () => {
    const last = date(2025, 1, 10);
    const today = date(2025, 1, 15);
    const result = berechneStreak({ currentStreak: 10, lastSessionDate: last, today });
    expect(result).toEqual({ streak: 1, lastSessionDate: today });
  });

  it('resets streak to 1 when gap is exactly 2 days', () => {
    const last = date(2025, 1, 13);
    const today = date(2025, 1, 15);
    const result = berechneStreak({ currentStreak: 7, lastSessionDate: last, today });
    expect(result).toEqual({ streak: 1, lastSessionDate: today });
  });

  it('handles month boundary correctly (Jan 31 → Feb 1)', () => {
    const last = date(2025, 1, 31);
    const today = date(2025, 2, 1);
    const result = berechneStreak({ currentStreak: 2, lastSessionDate: last, today });
    expect(result).toEqual({ streak: 3, lastSessionDate: today });
  });

  it('handles year boundary correctly (Dec 31 → Jan 1)', () => {
    const last = date(2024, 12, 31);
    const today = date(2025, 1, 1);
    const result = berechneStreak({ currentStreak: 15, lastSessionDate: last, today });
    expect(result).toEqual({ streak: 16, lastSessionDate: today });
  });

  it('ignores time component — same day with different times', () => {
    const last = new Date(2025, 0, 15, 8, 30, 0);
    const today = new Date(2025, 0, 15, 22, 45, 0);
    const result = berechneStreak({ currentStreak: 4, lastSessionDate: last, today });
    expect(result.streak).toBe(4);
  });

  it('increments streak even when currentStreak is 0 and dates are consecutive', () => {
    const last = date(2025, 1, 14);
    const today = date(2025, 1, 15);
    const result = berechneStreak({ currentStreak: 0, lastSessionDate: last, today });
    expect(result).toEqual({ streak: 1, lastSessionDate: today });
  });
});
