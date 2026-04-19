/**
 * Feature: phrase-trainer, Property 3: Übungsbereich-Berechnung
 *
 * Für jede gültige Auswahl von Strophen (mindestens eine, alle mit Timecode)
 * und jede Instrumental-Dauer gilt: `berechneUebungsbereich` liefert `startMs`
 * gleich dem Timecode der ersten ausgewählten Strophe (nach `orderIndex`) und
 * `endMs` gleich dem Timecode der nächsten nicht-ausgewählten Strophe nach der
 * letzten ausgewählten — oder gleich der Instrumental-Dauer, falls die letzte
 * ausgewählte Strophe die letzte im Song ist. Dies gilt unabhängig davon, ob
 * die Auswahl zusammenhängend oder nicht-zusammenhängend ist.
 *
 * **Validates: Requirements 4.2, 12.1, 12.2, 12.3**
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { berechneUebungsbereich } from "@/lib/phrase-trainer/uebungsbereich";
import type { StropheDetail, MarkupResponse } from "@/types/song";

// --- Helpers ---

/** Creates a TIMECODE/STROPHE markup with the given timecodeMs */
function makeTimecodeMarkup(timecodeMs: number): MarkupResponse {
  return {
    id: `markup-${timecodeMs}`,
    typ: "TIMECODE" as MarkupResponse["typ"],
    ziel: "STROPHE" as MarkupResponse["ziel"],
    wert: null,
    timecodeMs,
    wortIndex: null,
  };
}

/** Builds a minimal StropheDetail with a timecode */
function makeStrophe(
  id: string,
  orderIndex: number,
  timecodeMs: number,
): StropheDetail {
  return {
    id,
    name: `Strophe ${orderIndex}`,
    orderIndex,
    progress: 0,
    notiz: null,
    analyse: null,
    istInstrumental: false,
    zeilen: [],
    markups: [makeTimecodeMarkup(timecodeMs)],
  };
}

// --- Generators ---

/**
 * Generates a list of strophen with strictly increasing timecodes and unique
 * orderIndex values, plus a non-empty subset of selected IDs and an
 * instrumental duration that is >= the largest timecode.
 */
const uebungsbereichInputArb = fc
  .tuple(
    // Number of strophen (2–10 to have interesting cases)
    fc.integer({ min: 2, max: 10 }),
    // Base timecodes: sorted ascending, unique
    fc.array(fc.integer({ min: 0, max: 500_000 }), {
      minLength: 10,
      maxLength: 10,
    }),
  )
  .chain(([count]) => {
    // Generate `count` unique, sorted timecodes
    const timecodesArb = fc
      .set(fc.integer({ min: 0, max: 600_000 }), {
        minLength: count,
        maxLength: count,
      })
      .map((arr) => [...arr].sort((a, b) => a - b));

    // Generate a non-empty subset of indices to select
    const selectionArb = fc
      .subarray(
        Array.from({ length: count }, (_, i) => i),
        { minLength: 1 },
      );

    // Instrumental duration must be > max timecode
    const extraDurationArb = fc.integer({ min: 1, max: 300_000 });

    return fc.tuple(timecodesArb, selectionArb, extraDurationArb);
  })
  .map(([timecodes, selectedIndices, extraDuration]) => {
    const strophen: StropheDetail[] = timecodes.map((tc, i) =>
      makeStrophe(`strophe-${i}`, i, tc),
    );

    const ausgewaehlteIds = new Set(
      selectedIndices.map((i) => `strophe-${i}`),
    );

    // Instrumental duration is always larger than the last timecode
    const maxTimecode = timecodes[timecodes.length - 1];
    const instrumentalDauerMs = maxTimecode + extraDuration;

    return { strophen, ausgewaehlteIds, instrumentalDauerMs, timecodes, selectedIndices };
  });

/**
 * Generates input where the last strophe in the song is selected,
 * to test the "last stanza → use instrumental duration" case.
 */
const lastStropheSelectedArb = fc
  .tuple(
    fc.integer({ min: 1, max: 8 }),
    fc.integer({ min: 1, max: 300_000 }),
  )
  .chain(([count, extraDuration]) => {
    const totalCount = count + 1; // at least 2 strophen, last one always selected
    const timecodesArb = fc
      .set(fc.integer({ min: 0, max: 600_000 }), {
        minLength: totalCount,
        maxLength: totalCount,
      })
      .map((arr) => [...arr].sort((a, b) => a - b));

    // Selection always includes the last index
    const otherIndices = Array.from({ length: totalCount - 1 }, (_, i) => i);
    const additionalSelectionArb = fc.subarray(otherIndices, { minLength: 0 });

    return fc.tuple(
      timecodesArb,
      additionalSelectionArb,
      fc.constant(totalCount - 1),
      fc.constant(extraDuration),
    );
  })
  .map(([timecodes, additionalIndices, lastIndex, extraDuration]) => {
    const strophen: StropheDetail[] = timecodes.map((tc, i) =>
      makeStrophe(`strophe-${i}`, i, tc),
    );

    const selectedIndices = [...new Set([...additionalIndices, lastIndex])].sort(
      (a, b) => a - b,
    );
    const ausgewaehlteIds = new Set(selectedIndices.map((i) => `strophe-${i}`));

    const maxTimecode = timecodes[timecodes.length - 1];
    const instrumentalDauerMs = maxTimecode + extraDuration;

    return { strophen, ausgewaehlteIds, instrumentalDauerMs, timecodes, selectedIndices };
  });

/**
 * Generates input with shuffled orderIndex values to verify sorting works.
 */
const shuffledOrderArb = fc
  .tuple(
    fc.set(fc.integer({ min: 0, max: 600_000 }), { minLength: 3, maxLength: 8 }),
    fc.integer({ min: 1, max: 300_000 }),
  )
  .chain(([timecodeSet, extraDuration]) => {
    const timecodes = [...timecodeSet].sort((a, b) => a - b);
    const count = timecodes.length;

    // Shuffled order indices
    const orderIndicesArb = fc.shuffledSubarray(
      Array.from({ length: count }, (_, i) => i),
      { minLength: count, maxLength: count },
    );

    const selectionArb = fc.subarray(
      Array.from({ length: count }, (_, i) => i),
      { minLength: 1 },
    );

    return fc.tuple(
      fc.constant(timecodes),
      orderIndicesArb,
      selectionArb,
      fc.constant(extraDuration),
    );
  })
  .map(([timecodes, orderIndices, selectedIndices, extraDuration]) => {
    // Create strophen where the i-th strophe has orderIndex = orderIndices[i]
    // and timecode = timecodes[orderIndices[i]] (timecode follows orderIndex order)
    const strophen: StropheDetail[] = orderIndices.map((oi, i) =>
      makeStrophe(`strophe-${i}`, oi, timecodes[oi]),
    );

    const ausgewaehlteIds = new Set(
      selectedIndices.map((i) => `strophe-${i}`),
    );

    const maxTimecode = timecodes[timecodes.length - 1];
    const instrumentalDauerMs = maxTimecode + extraDuration;

    // For verification, sort strophen by orderIndex to get the canonical order
    const sortiert = [...strophen].sort((a, b) => a.orderIndex - b.orderIndex);

    return { strophen, ausgewaehlteIds, instrumentalDauerMs, sortiert };
  });

// --- Property Tests ---

describe("Feature: phrase-trainer, Property 3: Übungsbereich-Berechnung", () => {
  it("startMs equals the timecode of the first selected strophe (by orderIndex)", () => {
    fc.assert(
      fc.property(uebungsbereichInputArb, ({ strophen, ausgewaehlteIds, instrumentalDauerMs, timecodes, selectedIndices }) => {
        const result = berechneUebungsbereich(strophen, ausgewaehlteIds, instrumentalDauerMs);

        // First selected by orderIndex (strophen are already in orderIndex order here)
        const firstSelectedIndex = Math.min(...selectedIndices);
        const expectedStartMs = timecodes[firstSelectedIndex];

        expect(result.startMs).toBe(expectedStartMs);
      }),
      { numRuns: 100 },
    );
  });

  it("endMs equals the timecode of the next strophe after the last selected (Req 12.1)", () => {
    fc.assert(
      fc.property(uebungsbereichInputArb, ({ strophen, ausgewaehlteIds, instrumentalDauerMs, timecodes, selectedIndices }) => {
        const result = berechneUebungsbereich(strophen, ausgewaehlteIds, instrumentalDauerMs);

        const lastSelectedIndex = Math.max(...selectedIndices);
        const nextIndex = lastSelectedIndex + 1;

        if (nextIndex < strophen.length) {
          // Next strophe exists → endMs should be its timecode
          expect(result.endMs).toBe(timecodes[nextIndex]);
        } else {
          // Last strophe in song → endMs should be instrumental duration
          expect(result.endMs).toBe(instrumentalDauerMs);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("endMs equals instrumentalDauerMs when last strophe in song is selected (Req 12.2)", () => {
    fc.assert(
      fc.property(lastStropheSelectedArb, ({ strophen, ausgewaehlteIds, instrumentalDauerMs }) => {
        const result = berechneUebungsbereich(strophen, ausgewaehlteIds, instrumentalDauerMs);

        expect(result.endMs).toBe(instrumentalDauerMs);
      }),
      { numRuns: 100 },
    );
  });

  it("non-contiguous selections produce a range from first to last selected (Req 12.3)", () => {
    // Generate strophen with at least 4 entries and a non-contiguous selection
    const nonContiguousArb = fc
      .set(fc.integer({ min: 0, max: 600_000 }), { minLength: 4, maxLength: 8 })
      .chain((tcSet) => {
        const timecodes = [...tcSet].sort((a, b) => a - b);
        const count = timecodes.length;

        // Select first and last but not middle → non-contiguous
        const middleIndices = Array.from({ length: count - 2 }, (_, i) => i + 1);
        const skipArb = fc.subarray(middleIndices, { minLength: 1, maxLength: middleIndices.length - 1 });

        return fc.tuple(fc.constant(timecodes), skipArb, fc.integer({ min: 1, max: 300_000 }));
      })
      .map(([timecodes, skippedMiddle, extraDuration]) => {
        const count = timecodes.length;
        const skippedSet = new Set(skippedMiddle);
        // Select all indices except the skipped ones
        const selectedIndices = Array.from({ length: count }, (_, i) => i).filter(
          (i) => !skippedSet.has(i),
        );

        const strophen: StropheDetail[] = timecodes.map((tc, i) =>
          makeStrophe(`strophe-${i}`, i, tc),
        );

        const ausgewaehlteIds = new Set(selectedIndices.map((i) => `strophe-${i}`));
        const maxTimecode = timecodes[timecodes.length - 1];
        const instrumentalDauerMs = maxTimecode + extraDuration;

        return { strophen, ausgewaehlteIds, instrumentalDauerMs, timecodes, selectedIndices };
      });

    fc.assert(
      fc.property(nonContiguousArb, ({ strophen, ausgewaehlteIds, instrumentalDauerMs, timecodes, selectedIndices }) => {
        const result = berechneUebungsbereich(strophen, ausgewaehlteIds, instrumentalDauerMs);

        const firstSelectedIndex = Math.min(...selectedIndices);
        const lastSelectedIndex = Math.max(...selectedIndices);

        // startMs = timecode of first selected
        expect(result.startMs).toBe(timecodes[firstSelectedIndex]);

        // endMs = timecode of next after last selected, or instrumental duration
        const nextIndex = lastSelectedIndex + 1;
        if (nextIndex < strophen.length) {
          expect(result.endMs).toBe(timecodes[nextIndex]);
        } else {
          expect(result.endMs).toBe(instrumentalDauerMs);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("result is correct regardless of strophen input order (sorting by orderIndex)", () => {
    fc.assert(
      fc.property(shuffledOrderArb, ({ strophen, ausgewaehlteIds, instrumentalDauerMs, sortiert }) => {
        const result = berechneUebungsbereich(strophen, ausgewaehlteIds, instrumentalDauerMs);

        // Find selected strophen in sorted order
        const ausgewaehlteIndizes: number[] = [];
        for (let i = 0; i < sortiert.length; i++) {
          if (ausgewaehlteIds.has(sortiert[i].id)) {
            ausgewaehlteIndizes.push(i);
          }
        }

        if (ausgewaehlteIndizes.length === 0) return; // shouldn't happen with our generator

        const ersterIndex = ausgewaehlteIndizes[0];
        const letzterIndex = ausgewaehlteIndizes[ausgewaehlteIndizes.length - 1];

        // Extract timecode from markup
        const ersteTimecode = sortiert[ersterIndex].markups[0].timecodeMs!;
        expect(result.startMs).toBe(ersteTimecode);

        const naechsterIndex = letzterIndex + 1;
        if (naechsterIndex < sortiert.length) {
          const naechsteTimecode = sortiert[naechsterIndex].markups[0].timecodeMs!;
          expect(result.endMs).toBe(naechsteTimecode);
        } else {
          expect(result.endMs).toBe(instrumentalDauerMs);
        }
      }),
      { numRuns: 100 },
    );
  });
});
