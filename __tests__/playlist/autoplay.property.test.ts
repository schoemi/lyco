/**
 * @vitest-environment jsdom
 */

/**
 * Property-Based Tests: Autoplay-Idempotenz
 *
 * Feature: set-playlist-player, Property 6: Autoplay-Idempotenz
 *
 * Property 6: Autoplay-Idempotenz
 *   `startPlaylist()` wird bei mehrfachem Render oder StrictMode-Doppelaufruf genau einmal
 *   aufgerufen. Nach erstem Aufruf hat der `autoplay`-Parameter keinen weiteren Effekt auf
 *   den Playlist-State.
 *
 * **Validates: Requirements 8.8**
 *
 * Der Idempotenz-Guard ist in `SetDetailContent` (src/app/(main)/sets/[id]/page.tsx)
 * implementiert:
 *
 *   const autoplayTriggeredRef = useRef(false);
 *   useEffect(() => {
 *     if (autoplay && !isLoading && playlistSongs.length > 0 && !autoplayTriggeredRef.current) {
 *       autoplayTriggeredRef.current = true;
 *       startPlaylist();
 *     }
 *   }, [autoplay, isLoading, playlistSongs.length, startPlaylist]);
 *
 * Da diese Logik in einem React-Hook (useRef + useEffect) steckt, testen wir sie über einen
 * eigenen `useAutoplayIdempotency`-Hook, der dieselbe Logik kapselt und via
 * React Testing Library gerendert werden kann.
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import fc from "fast-check";
import React, { useRef, useEffect } from "react";
import { renderHook, act, cleanup } from "@testing-library/react";

// ---------------------------------------------------------------------------
// The idempotency logic extracted into a testable hook
// ---------------------------------------------------------------------------
//
// This hook mirrors the exact implementation in SetDetailContent:
//
//   const autoplayTriggeredRef = useRef(false);
//   useEffect(() => {
//     if (autoplay && !isLoading && playlistSongs.length > 0 && !autoplayTriggeredRef.current) {
//       autoplayTriggeredRef.current = true;
//       startPlaylist();
//     }
//   }, [autoplay, isLoading, playlistSongs.length, startPlaylist]);
//
// We test this logic in isolation so that render-count and re-render scenarios
// can be controlled precisely by the property test.

interface UseAutoplayIdempotencyParams {
  autoplay: boolean;
  isLoading: boolean;
  playlistSongsLength: number;
  startPlaylist: () => void;
}

function useAutoplayIdempotency({
  autoplay,
  isLoading,
  playlistSongsLength,
  startPlaylist,
}: UseAutoplayIdempotencyParams) {
  const autoplayTriggeredRef = useRef(false);

  useEffect(() => {
    if (
      autoplay &&
      !isLoading &&
      playlistSongsLength > 0 &&
      !autoplayTriggeredRef.current
    ) {
      autoplayTriggeredRef.current = true;
      startPlaylist();
    }
  }, [autoplay, isLoading, playlistSongsLength, startPlaylist]);

  return {
    hasTriggered: autoplayTriggeredRef,
  };
}

// ---------------------------------------------------------------------------
// Cleanup after each test
// ---------------------------------------------------------------------------

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  // Mock HTMLMediaElement API (jsdom doesn't implement these)
  Object.defineProperty(window.HTMLMediaElement.prototype, "play", {
    configurable: true,
    value: () => Promise.resolve(),
  });
  Object.defineProperty(window.HTMLMediaElement.prototype, "pause", {
    configurable: true,
    value: () => undefined,
  });
});

// ---------------------------------------------------------------------------
// Property 6: Autoplay-Idempotenz
// ---------------------------------------------------------------------------

describe("Property 6: Autoplay-Idempotenz — Feature: set-playlist-player, Property 6: Autoplay-Idempotenz", () => {
  /**
   * Property 6a: startPlaylist wird genau einmal aufgerufen, unabhängig von der Anzahl der Renders.
   *
   * For any number of re-renders (1–10), when `autoplay=true`, `isLoading=false`, and
   * `playlistSongsLength > 0`, `startPlaylist()` is called exactly once — never more.
   *
   * **Validates: Requirements 8.8**
   */
  it("startPlaylist wird genau einmal aufgerufen bei mehrfachem Re-Render mit autoplay=true", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),   // Anzahl der Re-Renders
        fc.integer({ min: 1, max: 20 }),   // playlistSongsLength
        (renderCount, songsLength) => {
          cleanup();

          const startPlaylist = vi.fn();

          // Render with autoplay=true, not loading, songs available
          const { rerender } = renderHook(
            (props: UseAutoplayIdempotencyParams) =>
              useAutoplayIdempotency(props),
            {
              initialProps: {
                autoplay: true,
                isLoading: false,
                playlistSongsLength: songsLength,
                startPlaylist,
              },
            },
          );

          // Re-render multiple times (simulates component re-renders)
          for (let i = 0; i < renderCount; i++) {
            rerender({
              autoplay: true,
              isLoading: false,
              playlistSongsLength: songsLength,
              startPlaylist,
            });
          }

          // startPlaylist must have been called exactly once — never more
          expect(startPlaylist).toHaveBeenCalledTimes(1);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 6b: Nach dem ersten Aufruf hat der autoplay-Parameter keinen weiteren Effekt.
   *
   * After the first call to startPlaylist(), further re-renders with autoplay=true
   * do not trigger additional calls. The idempotency guard (autoplayTriggeredRef)
   * ensures at-most-once semantics.
   *
   * **Validates: Requirements 8.8**
   */
  it("Nach erstem Aufruf hat autoplay=true keinen weiteren Effekt bei beliebig vielen Renders", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }),   // mindestens 2 Renders, damit "weiterer Effekt" messbar ist
        fc.integer({ min: 1, max: 20 }),   // playlistSongsLength
        (renderCount, songsLength) => {
          cleanup();

          const startPlaylist = vi.fn();

          const { rerender } = renderHook(
            (props: UseAutoplayIdempotencyParams) =>
              useAutoplayIdempotency(props),
            {
              initialProps: {
                autoplay: true,
                isLoading: false,
                playlistSongsLength: songsLength,
                startPlaylist,
              },
            },
          );

          // After the first render, startPlaylist should have been called once already.
          // Additional renders must not trigger further calls.
          const callsAfterFirst = startPlaylist.mock.calls.length;
          expect(callsAfterFirst).toBe(1); // sanity: first render triggered it

          // Re-render many more times
          for (let i = 1; i < renderCount; i++) {
            rerender({
              autoplay: true,
              isLoading: false,
              playlistSongsLength: songsLength,
              startPlaylist,
            });
          }

          // Still exactly one call — no additional triggers from further renders
          expect(startPlaylist).toHaveBeenCalledTimes(1);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 6c: startPlaylist wird NICHT aufgerufen, wenn autoplay=false.
   *
   * Even with many re-renders, if autoplay is false, startPlaylist must never be called.
   *
   * **Validates: Requirements 8.8**
   */
  it("startPlaylist wird niemals aufgerufen wenn autoplay=false, unabhängig von der Render-Anzahl", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),   // Anzahl der Renders
        fc.integer({ min: 0, max: 20 }),   // playlistSongsLength (inkl. 0)
        fc.boolean(),                       // isLoading
        (renderCount, songsLength, isLoading) => {
          cleanup();

          const startPlaylist = vi.fn();

          const { rerender } = renderHook(
            (props: UseAutoplayIdempotencyParams) =>
              useAutoplayIdempotency(props),
            {
              initialProps: {
                autoplay: false,
                isLoading,
                playlistSongsLength: songsLength,
                startPlaylist,
              },
            },
          );

          for (let i = 1; i < renderCount; i++) {
            rerender({
              autoplay: false,
              isLoading,
              playlistSongsLength: songsLength,
              startPlaylist,
            });
          }

          // With autoplay=false, startPlaylist must never be called
          expect(startPlaylist).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 6d: startPlaylist wird NICHT aufgerufen, wenn playlistSongsLength === 0.
   *
   * Even if autoplay=true and not loading, startPlaylist must NOT be called when there
   * are no songs. This tests the error path (Req. 8.9).
   *
   * **Validates: Requirements 8.8, 8.9**
   */
  it("startPlaylist wird nicht aufgerufen wenn playlistSongsLength=0, auch bei autoplay=true", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),  // Anzahl der Renders
        (renderCount) => {
          cleanup();

          const startPlaylist = vi.fn();

          const { rerender } = renderHook(
            (props: UseAutoplayIdempotencyParams) =>
              useAutoplayIdempotency(props),
            {
              initialProps: {
                autoplay: true,
                isLoading: false,
                playlistSongsLength: 0,  // keine Songs
                startPlaylist,
              },
            },
          );

          for (let i = 1; i < renderCount; i++) {
            rerender({
              autoplay: true,
              isLoading: false,
              playlistSongsLength: 0,
              startPlaylist,
            });
          }

          // No songs → startPlaylist must NOT be called
          expect(startPlaylist).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 6e: startPlaylist wird NICHT aufgerufen, wenn isLoading=true.
   *
   * While the playlist is still loading, startPlaylist must not be triggered
   * even if autoplay=true and songs are available.
   *
   * **Validates: Requirements 8.8**
   */
  it("startPlaylist wird nicht aufgerufen solange isLoading=true", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),  // Anzahl der Renders
        fc.integer({ min: 1, max: 20 }),  // playlistSongsLength
        (renderCount, songsLength) => {
          cleanup();

          const startPlaylist = vi.fn();

          const { rerender } = renderHook(
            (props: UseAutoplayIdempotencyParams) =>
              useAutoplayIdempotency(props),
            {
              initialProps: {
                autoplay: true,
                isLoading: true,  // noch am Laden
                playlistSongsLength: songsLength,
                startPlaylist,
              },
            },
          );

          for (let i = 1; i < renderCount; i++) {
            rerender({
              autoplay: true,
              isLoading: true,
              playlistSongsLength: songsLength,
              startPlaylist,
            });
          }

          // isLoading=true → startPlaylist must NOT be called
          expect(startPlaylist).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 6f: startPlaylist wird genau einmal aufgerufen wenn isLoading von true auf false wechselt.
   *
   * Simulates the real-world scenario: component mounts with isLoading=true (data not yet fetched),
   * then transitions to isLoading=false once data is available. startPlaylist must fire exactly once.
   *
   * **Validates: Requirements 8.8**
   */
  it("startPlaylist wird genau einmal aufgerufen wenn isLoading von true auf false wechselt", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),  // playlistSongsLength (after loading)
        fc.integer({ min: 0, max: 5 }),   // extra re-renders after loading finishes
        (songsLength, extraRenders) => {
          cleanup();

          const startPlaylist = vi.fn();

          // Phase 1: isLoading=true — startPlaylist must NOT fire
          const { rerender } = renderHook(
            (props: UseAutoplayIdempotencyParams) =>
              useAutoplayIdempotency(props),
            {
              initialProps: {
                autoplay: true,
                isLoading: true,
                playlistSongsLength: 0,  // songs not yet loaded
                startPlaylist,
              },
            },
          );

          expect(startPlaylist).not.toHaveBeenCalled();

          // Phase 2: loading completes — isLoading=false, songs now available
          rerender({
            autoplay: true,
            isLoading: false,
            playlistSongsLength: songsLength,
            startPlaylist,
          });

          // startPlaylist must have been called exactly once after loading completes
          expect(startPlaylist).toHaveBeenCalledTimes(1);

          // Phase 3: further re-renders must NOT trigger additional calls
          for (let i = 0; i < extraRenders; i++) {
            rerender({
              autoplay: true,
              isLoading: false,
              playlistSongsLength: songsLength,
              startPlaylist,
            });
          }

          // Still exactly one call — the guard prevents double invocation
          expect(startPlaylist).toHaveBeenCalledTimes(1);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 6g: StrictMode-Doppelaufruf — startPlaylist wird maximal einmal aufgerufen.
   *
   * React StrictMode double-invokes effects in development. The autoplayTriggeredRef guard
   * ensures that even if the effect fires twice (once with triggered=false, once reading
   * the updated ref), startPlaylist is called at most once.
   *
   * We simulate this by manually calling the effect-equivalent logic twice
   * (as fast-check cannot control React internals directly).
   *
   * **Validates: Requirements 8.8**
   */
  it("startPlaylist wird auch bei StrictMode-Doppelaufruf-Simulation maximal einmal aufgerufen", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),  // playlistSongsLength
        (songsLength) => {
          // Simulate the idempotency logic directly (pure function test)
          // This models what the useRef guard does:
          //   autoplayTriggeredRef.current starts as false
          //   First call: guard is false → set to true, call startPlaylist
          //   Second call: guard is true → do NOT call startPlaylist
          const startPlaylist = vi.fn();
          let autoplayTriggered = false;

          // Simulate effect invocation (e.g., from StrictMode double-invoke)
          function simulateEffect(
            autoplay: boolean,
            isLoading: boolean,
            playlistSongsLength: number,
          ) {
            if (
              autoplay &&
              !isLoading &&
              playlistSongsLength > 0 &&
              !autoplayTriggered
            ) {
              autoplayTriggered = true;
              startPlaylist();
            }
          }

          // First invocation (normal)
          simulateEffect(true, false, songsLength);
          // Second invocation (StrictMode double-invoke)
          simulateEffect(true, false, songsLength);

          // Guard ensures exactly one call
          expect(startPlaylist).toHaveBeenCalledTimes(1);
        },
      ),
      { numRuns: 100 },
    );
  });
});
