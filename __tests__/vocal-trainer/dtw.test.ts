import { describe, it, expect } from "vitest";
import { dtw } from "@/lib/vocal-trainer/dtw";

describe("dtw", () => {
  it("returns empty path and cost 0 for empty referenz", () => {
    const result = dtw([], [1, 2, 3]);
    expect(result.cost).toBe(0);
    expect(result.path).toEqual([]);
  });

  it("returns empty path and cost 0 for empty nutzer", () => {
    const result = dtw([1, 2, 3], []);
    expect(result.cost).toBe(0);
    expect(result.path).toEqual([]);
  });

  it("returns empty path and cost 0 for both empty", () => {
    const result = dtw([], []);
    expect(result.cost).toBe(0);
    expect(result.path).toEqual([]);
  });

  it("aligns identical sequences with 1:1 mapping and cost 0", () => {
    const seq = [60, 62, 64, 65, 67];
    const result = dtw(seq, seq);
    expect(result.cost).toBe(0);
    expect(result.path).toEqual([
      [0, 0],
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 4],
    ]);
  });

  it("aligns single-element sequences", () => {
    const result = dtw([60], [63]);
    expect(result.cost).toBe(3);
    expect(result.path).toEqual([[0, 0]]);
  });

  it("handles sequences of different lengths", () => {
    const referenz = [60, 62, 64];
    const nutzer = [60, 61, 62, 63, 64];
    const result = dtw(referenz, nutzer);

    // Path should cover all indices of both sequences
    const refIndices = result.path.map(([r]) => r);
    const nutzerIndices = result.path.map(([, n]) => n);

    expect(refIndices[0]).toBe(0);
    expect(refIndices[refIndices.length - 1]).toBe(2);
    expect(nutzerIndices[0]).toBe(0);
    expect(nutzerIndices[nutzerIndices.length - 1]).toBe(4);
  });

  it("produces non-negative cost", () => {
    const result = dtw([100, 50, 75], [80, 60, 90]);
    expect(result.cost).toBeGreaterThanOrEqual(0);
  });

  it("has symmetric cost", () => {
    const a = [60, 65, 70];
    const b = [62, 64, 68];
    expect(dtw(a, b).cost).toBe(dtw(b, a).cost);
  });

  it("path is monotonically non-decreasing", () => {
    const result = dtw([60, 62, 64, 65], [61, 63, 64]);
    for (let i = 1; i < result.path.length; i++) {
      expect(result.path[i][0]).toBeGreaterThanOrEqual(result.path[i - 1][0]);
      expect(result.path[i][1]).toBeGreaterThanOrEqual(result.path[i - 1][1]);
    }
  });

  it("path starts at (0,0) and ends at (n-1, m-1)", () => {
    const referenz = [60, 62, 64];
    const nutzer = [61, 63];
    const result = dtw(referenz, nutzer);

    expect(result.path[0]).toEqual([0, 0]);
    expect(result.path[result.path.length - 1]).toEqual([2, 1]);
  });
});
