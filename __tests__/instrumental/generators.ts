/**
 * Shared fast-check arbitraries for instrumental-annotations property tests.
 *
 * Generates realistic StropheDetail[] and ZeileDetail[] objects with varying
 * istInstrumental / istKommentar flags.
 */

import fc from "fast-check";
import type { StropheDetail, ZeileDetail, MarkupResponse } from "@/types/song";

// --- Leaf arbitraries ---

const arbMarkupTyp = fc.constantFrom(
  "PAUSE",
  "WIEDERHOLUNG",
  "ATMUNG",
  "KOPFSTIMME",
  "BRUSTSTIMME",
  "BELT",
  "FALSETT",
  "TIMECODE",
) as fc.Arbitrary<MarkupResponse["typ"]>;

const arbMarkupZiel = fc.constantFrom(
  "STROPHE",
  "ZEILE",
  "WORT",
) as fc.Arbitrary<MarkupResponse["ziel"]>;

const arbMarkup: fc.Arbitrary<MarkupResponse> = fc.record({
  id: fc.uuid(),
  typ: arbMarkupTyp,
  ziel: arbMarkupZiel,
  wert: fc.option(fc.string({ minLength: 0, maxLength: 20 }), { nil: null }),
  timecodeMs: fc.option(fc.nat({ max: 600_000 }), { nil: null }),
  wortIndex: fc.option(fc.nat({ max: 50 }), { nil: null }),
});

// --- ZeileDetail ---

export const arbZeileDetail: fc.Arbitrary<ZeileDetail> = fc.record({
  id: fc.uuid(),
  text: fc.string({ minLength: 1, maxLength: 80 }),
  uebersetzung: fc.option(fc.string({ minLength: 1, maxLength: 80 }), {
    nil: null,
  }),
  orderIndex: fc.nat({ max: 100 }),
  istKommentar: fc.boolean(),
  startTakt: fc.option(fc.nat({ max: 200 }).map((n) => n + 1), { nil: null }),
  endTakt: fc.option(fc.nat({ max: 200 }).map((n) => n + 1), { nil: null }),
  markups: fc.array(arbMarkup, { minLength: 0, maxLength: 3 }),
});

/** ZeileDetail with istKommentar forced to false */
export const arbNonKommentarZeile: fc.Arbitrary<ZeileDetail> = arbZeileDetail.map(
  (z) => ({ ...z, istKommentar: false }),
);

// --- StropheDetail ---

export const arbStropheDetail: fc.Arbitrary<StropheDetail> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  orderIndex: fc.nat({ max: 50 }),
  progress: fc.integer({ min: 0, max: 100 }),
  notiz: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
  analyse: fc.option(fc.string({ minLength: 1, maxLength: 100 }), {
    nil: null,
  }),
  istInstrumental: fc.boolean(),
  startTakt: fc.option(fc.nat({ max: 200 }).map((n) => n + 1), { nil: null }),
  endTakt: fc.option(fc.nat({ max: 200 }).map((n) => n + 1), { nil: null }),
  zeilen: fc.array(arbZeileDetail, { minLength: 0, maxLength: 8 }),
  markups: fc.array(arbMarkup, { minLength: 0, maxLength: 3 }),
});

/** StropheDetail with istInstrumental forced to false */
export const arbNonInstrumentalStrophe: fc.Arbitrary<StropheDetail> =
  arbStropheDetail.map((s) => ({ ...s, istInstrumental: false }));

// --- Array arbitraries ---

/** Array of StropheDetail with mixed istInstrumental flags */
export const arbStropheDetailArray: fc.Arbitrary<StropheDetail[]> = fc.array(
  arbStropheDetail,
  { minLength: 0, maxLength: 10 },
);

/** Array of ZeileDetail with mixed istKommentar flags */
export const arbZeileDetailArray: fc.Arbitrary<ZeileDetail[]> = fc.array(
  arbZeileDetail,
  { minLength: 0, maxLength: 10 },
);

/** Array of StropheDetail where no strophe is instrumental */
export const arbNonInstrumentalStropheArray: fc.Arbitrary<StropheDetail[]> =
  fc.array(arbNonInstrumentalStrophe, { minLength: 0, maxLength: 10 });

/** Array of ZeileDetail where no zeile is a kommentar */
export const arbNonKommentarZeileArray: fc.Arbitrary<ZeileDetail[]> = fc.array(
  arbNonKommentarZeile,
  { minLength: 0, maxLength: 10 },
);

// --- SongDetail arbitrary ---

import type { SongDetail } from "@/types/song";

/**
 * Generates a SongDetail with a mix of instrumental/normal strophes
 * and kommentar/normal zeilen. Minimal fields for testing learning-mode logic.
 */
export const arbSongDetail: fc.Arbitrary<SongDetail> = fc
  .record({
    id: fc.uuid(),
    titel: fc.string({ minLength: 1, maxLength: 40 }),
    kuenstler: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: null }),
    sprache: fc.option(fc.constantFrom("de", "en", "fr"), { nil: null }),
    emotionsTags: fc.array(fc.string({ minLength: 1, maxLength: 15 }), { minLength: 0, maxLength: 3 }),
    coverUrl: fc.constant(null),
    tonart: fc.constant(null),
    progress: fc.integer({ min: 0, max: 100 }),
    sessionCount: fc.nat({ max: 50 }),
    analyse: fc.constant(null),
    coachTipp: fc.constant(null),
    strophen: fc.array(arbStropheDetail, { minLength: 0, maxLength: 6 }),
    audioQuellen: fc.constant([]),
    sets: fc.constant([]),
    beatErgebnis: fc.constant(null),
  })
  .map((s) => s as SongDetail);

/**
 * Generates a SongDetail that is guaranteed to have at least one
 * non-instrumental strophe with at least one non-kommentar zeile with non-empty text.
 * Useful for tests that need quiz questions to be generated.
 */
export const arbSongDetailWithLearnableContent: fc.Arbitrary<SongDetail> = fc
  .record({
    id: fc.uuid(),
    titel: fc.string({ minLength: 1, maxLength: 40 }),
    kuenstler: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: null }),
    sprache: fc.option(fc.constantFrom("de", "en", "fr"), { nil: null }),
    emotionsTags: fc.array(fc.string({ minLength: 1, maxLength: 15 }), { minLength: 0, maxLength: 3 }),
    coverUrl: fc.constant(null),
    tonart: fc.constant(null),
    progress: fc.integer({ min: 0, max: 100 }),
    sessionCount: fc.nat({ max: 50 }),
    analyse: fc.constant(null),
    coachTipp: fc.constant(null),
    // At least 1 non-instrumental strophe with learnable zeilen, plus optional extras
    learnableStrophe: fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 30 }),
      orderIndex: fc.nat({ max: 50 }),
      progress: fc.integer({ min: 0, max: 100 }),
      notiz: fc.constant(null),
      analyse: fc.constant(null),
      istInstrumental: fc.constant(false),
      startTakt: fc.constant(null),
      endTakt: fc.constant(null),
      zeilen: fc.array(
        arbZeileDetail.map((z) => ({ ...z, istKommentar: false, text: z.text.length > 0 ? z.text : "placeholder" })),
        { minLength: 1, maxLength: 5 },
      ),
      markups: fc.constant([]),
    }),
    extraStrophen: fc.array(arbStropheDetail, { minLength: 0, maxLength: 4 }),
    audioQuellen: fc.constant([]),
    sets: fc.constant([]),
    beatErgebnis: fc.constant(null),
  })
  .map(({ learnableStrophe, extraStrophen, ...rest }) => ({
    ...rest,
    strophen: [learnableStrophe as StropheDetail, ...extraStrophen],
  } as SongDetail));
