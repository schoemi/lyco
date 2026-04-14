/**
 * Feature: lyco-stage, Property 2: Keyboard-Event-Mapping
 * Validates: Requirements 9.1, 9.3
 */

import { describe, it, expect, vi } from "vitest";
import * as fc from "fast-check";
import {
  mapKeyToAction,
  UseStageKeyboardOptions,
} from "../../src/lib/stage/use-stage-keyboard";

function makeOptions(): { options: UseStageKeyboardOptions; mocks: Record<keyof UseStageKeyboardOptions, ReturnType<typeof vi.fn>> } {
  const mocks = {
    onNext: vi.fn(),
    onPrev: vi.fn(),
    onToggleAutoScroll: vi.fn(),
    onNextSong: vi.fn(),
    onPrevSong: vi.fn(),
    onEscape: vi.fn(),
  };
  return { options: mocks, mocks };
}

describe("Property 2: Keyboard-Event-Mapping", () => {
  it("ArrowDown triggers onNext", () => {
    fc.assert(
      fc.property(fc.constant("ArrowDown"), (key) => {
        const { options, mocks } = makeOptions();
        mapKeyToAction(key, options);
        expect(mocks.onNext).toHaveBeenCalledTimes(1);
        expect(mocks.onPrev).not.toHaveBeenCalled();
        expect(mocks.onToggleAutoScroll).not.toHaveBeenCalled();
        expect(mocks.onEscape).not.toHaveBeenCalled();
      })
    );
  });

  it("PageDown triggers onNext", () => {
    fc.assert(
      fc.property(fc.constant("PageDown"), (key) => {
        const { options, mocks } = makeOptions();
        mapKeyToAction(key, options);
        expect(mocks.onNext).toHaveBeenCalledTimes(1);
        expect(mocks.onPrev).not.toHaveBeenCalled();
      })
    );
  });

  it("ArrowUp triggers onPrev", () => {
    fc.assert(
      fc.property(fc.constant("ArrowUp"), (key) => {
        const { options, mocks } = makeOptions();
        mapKeyToAction(key, options);
        expect(mocks.onPrev).toHaveBeenCalledTimes(1);
        expect(mocks.onNext).not.toHaveBeenCalled();
      })
    );
  });

  it("PageUp triggers onPrev", () => {
    fc.assert(
      fc.property(fc.constant("PageUp"), (key) => {
        const { options, mocks } = makeOptions();
        mapKeyToAction(key, options);
        expect(mocks.onPrev).toHaveBeenCalledTimes(1);
        expect(mocks.onNext).not.toHaveBeenCalled();
      })
    );
  });

  it("Space triggers onToggleAutoScroll", () => {
    fc.assert(
      fc.property(fc.constant(" "), (key) => {
        const { options, mocks } = makeOptions();
        mapKeyToAction(key, options);
        expect(mocks.onToggleAutoScroll).toHaveBeenCalledTimes(1);
        expect(mocks.onNext).not.toHaveBeenCalled();
        expect(mocks.onPrev).not.toHaveBeenCalled();
        expect(mocks.onEscape).not.toHaveBeenCalled();
      })
    );
  });

  it("Escape triggers onEscape", () => {
    fc.assert(
      fc.property(fc.constant("Escape"), (key) => {
        const { options, mocks } = makeOptions();
        mapKeyToAction(key, options);
        expect(mocks.onEscape).toHaveBeenCalledTimes(1);
        expect(mocks.onNext).not.toHaveBeenCalled();
        expect(mocks.onPrev).not.toHaveBeenCalled();
        expect(mocks.onToggleAutoScroll).not.toHaveBeenCalled();
      })
    );
  });

  it("each key from the full set triggers exactly the correct callback", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("ArrowDown", "ArrowUp", "PageDown", "PageUp", " ", "Escape"),
        (key) => {
          const { options, mocks } = makeOptions();
          mapKeyToAction(key, options);

          const totalCalls =
            mocks.onNext.mock.calls.length +
            mocks.onPrev.mock.calls.length +
            mocks.onToggleAutoScroll.mock.calls.length +
            mocks.onEscape.mock.calls.length;

          // Exactly one callback is triggered per key
          expect(totalCalls).toBe(1);

          // Correct callback for each key
          if (key === "ArrowDown" || key === "PageDown") {
            expect(mocks.onNext).toHaveBeenCalledTimes(1);
          } else if (key === "ArrowUp" || key === "PageUp") {
            expect(mocks.onPrev).toHaveBeenCalledTimes(1);
          } else if (key === " ") {
            expect(mocks.onToggleAutoScroll).toHaveBeenCalledTimes(1);
          } else if (key === "Escape") {
            expect(mocks.onEscape).toHaveBeenCalledTimes(1);
          }
        }
      )
    );
  });

  it("unknown keys trigger no callbacks", () => {
    fc.assert(
      fc.property(
        fc.string().filter(
          (s) =>
            !["ArrowDown", "ArrowUp", "PageDown", "PageUp", " ", "Escape"].includes(s)
        ),
        (key) => {
          const { options, mocks } = makeOptions();
          mapKeyToAction(key, options);

          expect(mocks.onNext).not.toHaveBeenCalled();
          expect(mocks.onPrev).not.toHaveBeenCalled();
          expect(mocks.onToggleAutoScroll).not.toHaveBeenCalled();
          expect(mocks.onEscape).not.toHaveBeenCalled();
          expect(mocks.onNextSong).not.toHaveBeenCalled();
          expect(mocks.onPrevSong).not.toHaveBeenCalled();
        }
      )
    );
  });
});
