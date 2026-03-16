import { describe, it, expect } from "vitest";
import {
  getWeakStrophenIds,
  hasWeaknesses,
} from "@/lib/cloze/strophen-selection";
import type { StropheProgress } from "@/types/song";

describe("getWeakStrophenIds", () => {
  it("returns empty set for empty progress list", () => {
    expect(getWeakStrophenIds([])).toEqual(new Set());
  });

  it("returns all IDs when all strophes are at 0%", () => {
    const progress: StropheProgress[] = [
      { stropheId: "a", stropheName: "Strophe 1", prozent: 0 },
      { stropheId: "b", stropheName: "Strophe 2", prozent: 0 },
    ];
    expect(getWeakStrophenIds(progress)).toEqual(new Set(["a", "b"]));
  });

  it("returns empty set when all strophes are at 100%", () => {
    const progress: StropheProgress[] = [
      { stropheId: "a", stropheName: "Strophe 1", prozent: 100 },
      { stropheId: "b", stropheName: "Strophe 2", prozent: 100 },
    ];
    expect(getWeakStrophenIds(progress)).toEqual(new Set());
  });

  it("returns only weak strophes for mixed values", () => {
    const progress: StropheProgress[] = [
      { stropheId: "a", stropheName: "Strophe 1", prozent: 50 },
      { stropheId: "b", stropheName: "Strophe 2", prozent: 90 },
      { stropheId: "c", stropheName: "Strophe 3", prozent: 79 },
    ];
    expect(getWeakStrophenIds(progress)).toEqual(new Set(["a", "c"]));
  });

  it("does not include strophes at exactly 80%", () => {
    const progress: StropheProgress[] = [
      { stropheId: "a", stropheName: "Strophe 1", prozent: 80 },
    ];
    expect(getWeakStrophenIds(progress)).toEqual(new Set());
  });

  it("includes strophes at 79%", () => {
    const progress: StropheProgress[] = [
      { stropheId: "a", stropheName: "Strophe 1", prozent: 79 },
    ];
    expect(getWeakStrophenIds(progress)).toEqual(new Set(["a"]));
  });
});

describe("hasWeaknesses", () => {
  it("returns false for empty progress list", () => {
    expect(hasWeaknesses([])).toBe(false);
  });

  it("returns true when all strophes are at 0%", () => {
    const progress: StropheProgress[] = [
      { stropheId: "a", stropheName: "Strophe 1", prozent: 0 },
    ];
    expect(hasWeaknesses(progress)).toBe(true);
  });

  it("returns false when all strophes are at 100%", () => {
    const progress: StropheProgress[] = [
      { stropheId: "a", stropheName: "Strophe 1", prozent: 100 },
      { stropheId: "b", stropheName: "Strophe 2", prozent: 100 },
    ];
    expect(hasWeaknesses(progress)).toBe(false);
  });

  it("returns true for mixed values with at least one below threshold", () => {
    const progress: StropheProgress[] = [
      { stropheId: "a", stropheName: "Strophe 1", prozent: 50 },
      { stropheId: "b", stropheName: "Strophe 2", prozent: 90 },
    ];
    expect(hasWeaknesses(progress)).toBe(true);
  });

  it("returns false when all strophes are at exactly 80%", () => {
    const progress: StropheProgress[] = [
      { stropheId: "a", stropheName: "Strophe 1", prozent: 80 },
      { stropheId: "b", stropheName: "Strophe 2", prozent: 80 },
    ];
    expect(hasWeaknesses(progress)).toBe(false);
  });

  it("returns true when one strophe is at 79%", () => {
    const progress: StropheProgress[] = [
      { stropheId: "a", stropheName: "Strophe 1", prozent: 80 },
      { stropheId: "b", stropheName: "Strophe 2", prozent: 79 },
    ];
    expect(hasWeaknesses(progress)).toBe(true);
  });
});
