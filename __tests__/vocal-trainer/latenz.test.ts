import { describe, it, expect } from 'vitest';
import { kompensiere } from '@/lib/vocal-trainer/latenz';

describe('kompensiere', () => {
  it('should trim the beginning of the buffer by the latency offset', () => {
    // 10 samples at 1000 Hz sample rate, 5ms latency → offset = round(0.005 * 1000) = 5
    const buffer = new Float32Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const result = kompensiere(buffer, 5, 1000);
    expect(Array.from(result)).toEqual([5, 6, 7, 8, 9]);
  });

  it('should return empty Float32Array when offset >= buffer length', () => {
    const buffer = new Float32Array([0, 1, 2]);
    const result = kompensiere(buffer, 1000, 44100);
    expect(result.length).toBe(0);
    expect(result).toBeInstanceOf(Float32Array);
  });

  it('should return empty Float32Array when offset equals buffer length exactly', () => {
    // 5 samples, offset = round(5/1000 * 1000) = 5
    const buffer = new Float32Array([0, 1, 2, 3, 4]);
    const result = kompensiere(buffer, 5, 1000);
    expect(result.length).toBe(0);
  });

  it('should return a copy of the original buffer when latency is 0', () => {
    const buffer = new Float32Array([1, 2, 3]);
    const result = kompensiere(buffer, 0, 44100);
    expect(Array.from(result)).toEqual([1, 2, 3]);
    // Should be a copy, not the same reference
    expect(result).not.toBe(buffer);
  });

  it('should return a copy of the original buffer when latency is negative', () => {
    const buffer = new Float32Array([1, 2, 3]);
    const result = kompensiere(buffer, -10, 44100);
    expect(Array.from(result)).toEqual([1, 2, 3]);
    expect(result).not.toBe(buffer);
  });

  it('should handle empty buffer', () => {
    const buffer = new Float32Array(0);
    const result = kompensiere(buffer, 5, 44100);
    expect(result.length).toBe(0);
  });

  it('should round the offset correctly', () => {
    // offset = round(1/1000 * 3) = round(0.003) = 0 → copy
    const buffer = new Float32Array([10, 20, 30]);
    const result = kompensiere(buffer, 1, 3);
    expect(Array.from(result)).toEqual([10, 20, 30]);
  });

  it('should handle realistic sample rate and latency', () => {
    // 44100 Hz, 10ms latency → offset = round(0.01 * 44100) = 441
    const size = 44100; // 1 second of audio
    const buffer = new Float32Array(size);
    for (let i = 0; i < size; i++) buffer[i] = i;

    const result = kompensiere(buffer, 10, 44100);
    expect(result.length).toBe(size - 441);
    expect(result[0]).toBe(441);
  });
});
