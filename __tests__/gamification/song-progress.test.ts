import { describe, it, expect } from 'vitest';
import { berechneSongFortschritt } from '@/lib/gamification/song-progress';

describe('berechneSongFortschritt', () => {
  it('returns 0 for an empty array', () => {
    expect(berechneSongFortschritt([])).toBe(0);
  });

  it('returns the single value when array has one element', () => {
    expect(berechneSongFortschritt([75])).toBe(75);
  });

  it('calculates arithmetic mean of multiple values', () => {
    expect(berechneSongFortschritt([50, 100])).toBe(75);
  });

  it('rounds to nearest integer', () => {
    // Mean of [33, 34] = 33.5 → rounds to 34
    expect(berechneSongFortschritt([33, 34])).toBe(34);
  });

  it('rounds down when fractional part < 0.5', () => {
    // Mean of [33, 33, 34] = 33.333... → rounds to 33
    expect(berechneSongFortschritt([33, 33, 34])).toBe(33);
  });

  it('returns 100 when all strophes are at 100%', () => {
    expect(berechneSongFortschritt([100, 100, 100])).toBe(100);
  });

  it('returns 0 when all strophes are at 0%', () => {
    expect(berechneSongFortschritt([0, 0, 0])).toBe(0);
  });

  it('clamps result to 100 if mean exceeds 100', () => {
    expect(berechneSongFortschritt([150, 200])).toBe(100);
  });

  it('clamps result to 0 if mean is negative', () => {
    expect(berechneSongFortschritt([-50, -30])).toBe(0);
  });
});
