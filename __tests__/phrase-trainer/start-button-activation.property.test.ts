/**
 * @vitest-environment jsdom
 */

/**
 * Feature: phrase-trainer, Property 1: Start-Button-Aktivierung korreliert mit Auswahl
 *
 * Für jede Menge ausgewählter Strophen gilt: Der Start-Button ist genau dann aktiviert,
 * wenn mindestens eine Strophe ausgewählt ist, und deaktiviert, wenn die Auswahl leer ist.
 *
 * **Validates: Requirements 1.3, 1.4**
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import fc from "fast-check";
import React from "react";
import { render, cleanup, within } from "@testing-library/react";
import { StrophenAuswahl } from "@/components/phrase-trainer/strophen-auswahl";
import type { StropheDetail, MarkupResponse } from "@/types/song";

afterEach(() => {
  cleanup();
});

// --- Generators ---

/** Generator for a valid TIMECODE/STROPHE markup with non-null timecodeMs */
const timecodeStropheMarkup: fc.Arbitrary<MarkupResponse> = fc
  .tuple(fc.uuid(), fc.integer({ min: 0, max: 600_000 }))
  .map(([id, ms]) => ({
    id,
    typ: "TIMECODE" as const,
    ziel: "STROPHE" as const,
    wert: null,
    timecodeMs: ms,
    wortIndex: null,
  }));

/** Builds a learnable StropheDetail with a valid timecode */
function makeStropheWithTimecode(
  id: string,
  orderIndex: number,
  markup: MarkupResponse,
): StropheDetail {
  return {
    id,
    name: `Strophe ${orderIndex + 1}`,
    orderIndex,
    progress: 0,
    notiz: null,
    analyse: null,
    istInstrumental: false,
    zeilen: [],
    markups: [markup],
  };
}

/**
 * Generator for a list of 1–8 learnable stanzas, each with a valid timecode.
 * All stanzas are selectable (have timecodes and are not instrumental).
 */
const arbStrophenList: fc.Arbitrary<StropheDetail[]> = fc
  .array(fc.tuple(fc.uuid(), timecodeStropheMarkup), {
    minLength: 1,
    maxLength: 8,
  })
  .map((entries) =>
    entries.map(([id, markup], idx) =>
      makeStropheWithTimecode(id, idx, markup),
    ),
  );

/**
 * Generator for a non-empty subset of strophe IDs from a given list.
 */
function arbNonEmptySelection(
  strophen: StropheDetail[],
): fc.Arbitrary<Set<string>> {
  const ids = strophen.map((s) => s.id);
  return fc.subarray(ids, { minLength: 1 }).map((sub) => new Set(sub));
}

/** Helper: render the component and find the start button within its container */
function renderAndFindStartButton(
  strophen: StropheDetail[],
  selectedIds: Set<string>,
): { button: HTMLButtonElement; unmount: () => void } {
  cleanup();
  const { container, unmount } = render(
    React.createElement(StrophenAuswahl, {
      strophen,
      ausgewaehlteIds: selectedIds,
      onAuswahlAendern: vi.fn(),
      onStarten: vi.fn(),
    }),
  );

  const button = within(container).getByRole("button", {
    name: /Übung starten/i,
  }) as HTMLButtonElement;
  return { button, unmount };
}

// --- Property Tests ---

describe("Feature: phrase-trainer, Property 1: Start-Button-Aktivierung korreliert mit Auswahl", () => {
  it("start button is disabled when no stanzas are selected (empty selection)", () => {
    fc.assert(
      fc.property(arbStrophenList, (strophen) => {
        const emptySelection = new Set<string>();
        const { button, unmount } = renderAndFindStartButton(
          strophen,
          emptySelection,
        );

        expect(button.disabled).toBe(true);
        unmount();
      }),
      { numRuns: 100 },
    );
  });

  it("start button is enabled when at least one stanza is selected", () => {
    fc.assert(
      fc.property(
        arbStrophenList.chain((strophen) =>
          fc.tuple(fc.constant(strophen), arbNonEmptySelection(strophen)),
        ),
        ([strophen, selectedIds]) => {
          const { button, unmount } = renderAndFindStartButton(
            strophen,
            selectedIds,
          );

          expect(button.disabled).toBe(false);
          unmount();
        },
      ),
      { numRuns: 100 },
    );
  });

  it("start button activation is exactly determined by selection being non-empty", () => {
    fc.assert(
      fc.property(
        arbStrophenList.chain((strophen) => {
          const ids = strophen.map((s) => s.id);
          return fc.tuple(
            fc.constant(strophen),
            fc.subarray(ids, { minLength: 0 }).map((sub) => new Set(sub)),
          );
        }),
        ([strophen, selectedIds]) => {
          const { button, unmount } = renderAndFindStartButton(
            strophen,
            selectedIds,
          );

          const expectedDisabled = selectedIds.size === 0;
          expect(button.disabled).toBe(expectedDisabled);

          unmount();
        },
      ),
      { numRuns: 100 },
    );
  });
});
