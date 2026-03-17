/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAutoScroll } from "@/lib/karaoke/use-auto-scroll";

describe("useAutoScroll", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts paused by default", () => {
    const onAdvance = vi.fn();
    const { result } = renderHook(() =>
      useAutoScroll({ speed: 3, isLastLine: false, onAdvance })
    );
    expect(result.current.isPlaying).toBe(false);
  });

  it("play() starts the interval and sets isPlaying to true", () => {
    const onAdvance = vi.fn();
    const { result } = renderHook(() =>
      useAutoScroll({ speed: 2, isLastLine: false, onAdvance })
    );

    act(() => result.current.play());
    expect(result.current.isPlaying).toBe(true);

    act(() => vi.advanceTimersByTime(2000));
    expect(onAdvance).toHaveBeenCalledTimes(1);

    act(() => vi.advanceTimersByTime(2000));
    expect(onAdvance).toHaveBeenCalledTimes(2);
  });

  it("pause() stops the interval and sets isPlaying to false", () => {
    const onAdvance = vi.fn();
    const { result } = renderHook(() =>
      useAutoScroll({ speed: 2, isLastLine: false, onAdvance })
    );

    act(() => result.current.play());
    expect(result.current.isPlaying).toBe(true);

    act(() => result.current.pause());
    expect(result.current.isPlaying).toBe(false);

    act(() => vi.advanceTimersByTime(4000));
    expect(onAdvance).not.toHaveBeenCalled();
  });

  it("toggle() switches between play and pause", () => {
    const onAdvance = vi.fn();
    const { result } = renderHook(() =>
      useAutoScroll({ speed: 3, isLastLine: false, onAdvance })
    );

    act(() => result.current.toggle());
    expect(result.current.isPlaying).toBe(true);

    act(() => result.current.toggle());
    expect(result.current.isPlaying).toBe(false);
  });

  it("auto-stops when isLastLine becomes true", () => {
    const onAdvance = vi.fn();
    let isLastLine = false;
    const { result, rerender } = renderHook(() =>
      useAutoScroll({ speed: 2, isLastLine, onAdvance })
    );

    act(() => result.current.play());
    expect(result.current.isPlaying).toBe(true);

    isLastLine = true;
    rerender();

    expect(result.current.isPlaying).toBe(false);
  });

  it("play() does nothing when isLastLine is true", () => {
    const onAdvance = vi.fn();
    const { result } = renderHook(() =>
      useAutoScroll({ speed: 2, isLastLine: true, onAdvance })
    );

    act(() => result.current.play());
    expect(result.current.isPlaying).toBe(false);

    act(() => vi.advanceTimersByTime(4000));
    expect(onAdvance).not.toHaveBeenCalled();
  });

  it("restarts interval when speed changes while playing", () => {
    const onAdvance = vi.fn();
    let speed = 3;
    const { result, rerender } = renderHook(() =>
      useAutoScroll({ speed, isLastLine: false, onAdvance })
    );

    act(() => result.current.play());

    // Advance 2s — not enough for 3s interval
    act(() => vi.advanceTimersByTime(2000));
    expect(onAdvance).not.toHaveBeenCalled();

    // Change speed to 1s
    speed = 1;
    rerender();

    // After 1s with new speed, should fire
    act(() => vi.advanceTimersByTime(1000));
    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it("cleans up interval on unmount", () => {
    const onAdvance = vi.fn();
    const { result, unmount } = renderHook(() =>
      useAutoScroll({ speed: 2, isLastLine: false, onAdvance })
    );

    act(() => result.current.play());
    unmount();

    act(() => vi.advanceTimersByTime(4000));
    expect(onAdvance).not.toHaveBeenCalled();
  });

  it("converts speed from seconds to milliseconds correctly", () => {
    const onAdvance = vi.fn();
    const { result } = renderHook(() =>
      useAutoScroll({ speed: 5, isLastLine: false, onAdvance })
    );

    act(() => result.current.play());

    // At 4999ms, should not have fired yet
    act(() => vi.advanceTimersByTime(4999));
    expect(onAdvance).not.toHaveBeenCalled();

    // At 5000ms, should fire
    act(() => vi.advanceTimersByTime(1));
    expect(onAdvance).toHaveBeenCalledTimes(1);
  });
});
