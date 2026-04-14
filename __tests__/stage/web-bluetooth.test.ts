/**
 * Feature: lyco-stage — Web Bluetooth Enhancement
 * Validates: Requirements 9.4, 9.5
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { isWebBluetoothAvailable } from "../../src/lib/stage/use-web-bluetooth";
import { mapKeyToAction, UseStageKeyboardOptions } from "../../src/lib/stage/use-stage-keyboard";

describe("isWebBluetoothAvailable", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns true when navigator.bluetooth exists", () => {
    // Simulate a browser that supports Web Bluetooth (e.g. Android Chrome)
    vi.stubGlobal("navigator", { bluetooth: {} });
    expect(isWebBluetoothAvailable()).toBe(true);
  });

  it("returns false when navigator.bluetooth does not exist", () => {
    // Simulate a browser without Web Bluetooth (e.g. iOS Safari, desktop Firefox)
    vi.stubGlobal("navigator", {});
    expect(isWebBluetoothAvailable()).toBe(false);
  });

  it("returns false when navigator is undefined (SSR / non-browser environment)", () => {
    vi.stubGlobal("navigator", undefined);
    expect(isWebBluetoothAvailable()).toBe(false);
  });
});

describe("Graceful fallback when Bluetooth is not available (Requirement 9.5)", () => {
  it("does not throw when Bluetooth is unavailable", () => {
    vi.stubGlobal("navigator", {});
    expect(() => isWebBluetoothAvailable()).not.toThrow();
  });

  it("stage keyboard hook still works when Bluetooth is not available", () => {
    // mapKeyToAction is the pure, testable core of useStageKeyboard.
    // It must not depend on Bluetooth availability at all.
    vi.stubGlobal("navigator", {});

    const options: UseStageKeyboardOptions = {
      onNext: vi.fn(),
      onPrev: vi.fn(),
      onToggleAutoScroll: vi.fn(),
      onNextSong: vi.fn(),
      onPrevSong: vi.fn(),
      onEscape: vi.fn(),
    };

    expect(() => mapKeyToAction("ArrowDown", options)).not.toThrow();
    expect(options.onNext).toHaveBeenCalledTimes(1);
  });
});
