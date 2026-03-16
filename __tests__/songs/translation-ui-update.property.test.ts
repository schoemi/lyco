/**
 * Property 1: Optimistisches UI-Update – Zuordnung über zeileId
 *
 * Für beliebige `SongDetail`-Daten und ein passendes `UebersetzungResult`:
 * Nach dem `setSong`-Aufruf enthält jede Zeile die korrekte `uebersetzung`
 * gemäß `zeileId`-Zuordnung.
 *
 * **Validates: Requirements 4.1, 4.2**
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import type {
  SongDetail,
  StropheDetail,
  ZeileDetail,
  UebersetzungResult,
  StropheUebersetzungResult,
  ZeileUebersetzungResult,
} from "@/types/song";

// --- Pure updater extracted from useTranslation hook ---
function applyTranslationUpdate(
  prev: SongDetail,
  result: UebersetzungResult
): SongDetail {
  const updatedStrophen = prev.strophen.map((strophe) => {
    const resultStrophe = result.strophen.find(
      (s) => s.stropheId === strophe.id
    );
    if (!resultStrophe) return strophe;
    const updatedZeilen = strophe.zeilen.map((zeile) => {
      const resultZeile = resultStrophe.zeilen.find(
        (z) => z.zeileId === zeile.id
      );
      return resultZeile
        ? { ...zeile, uebersetzung: resultZeile.uebersetzung }
        : zeile;
    });
    return { ...strophe, zeilen: updatedZeilen };
  });
  return { ...prev, strophen: updatedStrophen };
}

// --- Arbitraries ---

const idArb = fc.uuid();

const nonEmptyStringArb = fc
  .stringMatching(/^[A-Za-z0-9 ]{1,30}$/)
  .filter((s) => s.trim().length > 0);

const zeileDetailArb: fc.Arbitrary<ZeileDetail> = fc.record({
  id: idArb,
  text: nonEmptyStringArb,
  uebersetzung: fc.constant(null),
  orderIndex: fc.nat({ max: 100 }),
  markups: fc.constant([]),
});

const stropheDetailArb: fc.Arbitrary<StropheDetail> = fc
  .record({
    id: idArb,
    name: nonEmptyStringArb,
    orderIndex: fc.nat({ max: 20 }),
    progress: fc.integer({ min: 0, max: 100 }),
    notiz: fc.constant(null),
    analyse: fc.constant(null),
    zeilen: fc.array(zeileDetailArb, { minLength: 1, maxLength: 5 }),
    markups: fc.constant([]),
  })
  .map((s) => ({
    ...s,
    // Ensure unique zeile IDs within a strophe
    zeilen: s.zeilen.map((z, i) => ({ ...z, id: `${s.id}-z-${i}` })),
  }));

const songDetailArb: fc.Arbitrary<SongDetail> = fc
  .record({
    id: idArb,
    titel: nonEmptyStringArb,
    kuenstler: fc.option(nonEmptyStringArb, { nil: null }),
    sprache: fc.option(nonEmptyStringArb, { nil: null }),
    emotionsTags: fc.array(nonEmptyStringArb, { minLength: 0, maxLength: 3 }),
    progress: fc.integer({ min: 0, max: 100 }),
    sessionCount: fc.nat({ max: 50 }),
    analyse: fc.constant(null),
    strophen: fc.array(stropheDetailArb, { minLength: 1, maxLength: 4 }),
  })
  .map((song) => ({
    ...song,
    // Ensure unique strophe IDs
    strophen: song.strophen.map((s, i) => {
      const stropheId = `strophe-${i}`;
      return {
        ...s,
        id: stropheId,
        zeilen: s.zeilen.map((z, j) => ({ ...z, id: `${stropheId}-z-${j}` })),
      };
    }),
  }));

/** Build a matching UebersetzungResult from a SongDetail with a translation for every zeile */
function buildFullResult(
  song: SongDetail,
  zielsprache: string
): UebersetzungResult {
  return {
    songId: song.id,
    zielsprache,
    strophen: song.strophen.map((strophe) => ({
      stropheId: strophe.id,
      stropheName: strophe.name,
      zeilen: strophe.zeilen.map((zeile) => ({
        zeileId: zeile.id,
        originalText: zeile.text,
        uebersetzung: `translated:${zeile.text}`,
      })),
    })),
  };
}

// --- Tests ---

describe("Property 1: Optimistisches UI-Update – Zuordnung über zeileId", () => {
  it("jede Zeile enthält nach Update die korrekte Übersetzung gemäß zeileId-Zuordnung", () => {
    fc.assert(
      fc.property(songDetailArb, (song) => {
        const zielsprache = "Deutsch";
        const result = buildFullResult(song, zielsprache);

        const updated = applyTranslationUpdate(song, result);

        // Every zeile must have the correct translation mapped by zeileId
        for (const strophe of updated.strophen) {
          const resultStrophe = result.strophen.find(
            (rs) => rs.stropheId === strophe.id
          );
          expect(resultStrophe).toBeDefined();

          for (const zeile of strophe.zeilen) {
            const resultZeile = resultStrophe!.zeilen.find(
              (rz) => rz.zeileId === zeile.id
            );
            expect(resultZeile).toBeDefined();
            expect(zeile.uebersetzung).toBe(resultZeile!.uebersetzung);
          }
        }
      }),
      { numRuns: 50 }
    );
  });

  it("Zeilen ohne passenden Eintrag im Result behalten ihren bisherigen Wert", () => {
    fc.assert(
      fc.property(songDetailArb, (song) => {
        // Build a result that only covers the FIRST strophe
        const partialResult: UebersetzungResult = {
          songId: song.id,
          zielsprache: "Englisch",
          strophen:
            song.strophen.length > 0
              ? [
                  {
                    stropheId: song.strophen[0].id,
                    stropheName: song.strophen[0].name,
                    zeilen: song.strophen[0].zeilen.map((z) => ({
                      zeileId: z.id,
                      originalText: z.text,
                      uebersetzung: `partial:${z.text}`,
                    })),
                  },
                ]
              : [],
        };

        const updated = applyTranslationUpdate(song, partialResult);

        // First strophe zeilen should be updated
        if (updated.strophen.length > 0) {
          for (const zeile of updated.strophen[0].zeilen) {
            expect(zeile.uebersetzung).toBe(`partial:${zeile.text}`);
          }
        }

        // Remaining strophen should be unchanged (uebersetzung stays null)
        for (let i = 1; i < updated.strophen.length; i++) {
          for (const zeile of updated.strophen[i].zeilen) {
            expect(zeile.uebersetzung).toBeNull();
          }
        }
      }),
      { numRuns: 50 }
    );
  });

  it("Strophen-Reihenfolge und Zeilen-Reihenfolge bleiben nach Update erhalten", () => {
    fc.assert(
      fc.property(songDetailArb, (song) => {
        const result = buildFullResult(song, "Französisch");
        const updated = applyTranslationUpdate(song, result);

        // Same number of strophen
        expect(updated.strophen).toHaveLength(song.strophen.length);

        for (let i = 0; i < song.strophen.length; i++) {
          const origStrophe = song.strophen[i];
          const updStrophe = updated.strophen[i];

          // Same strophe id and order
          expect(updStrophe.id).toBe(origStrophe.id);
          expect(updStrophe.orderIndex).toBe(origStrophe.orderIndex);

          // Same number of zeilen in same order
          expect(updStrophe.zeilen).toHaveLength(origStrophe.zeilen.length);
          for (let j = 0; j < origStrophe.zeilen.length; j++) {
            expect(updStrophe.zeilen[j].id).toBe(origStrophe.zeilen[j].id);
            expect(updStrophe.zeilen[j].text).toBe(origStrophe.zeilen[j].text);
            expect(updStrophe.zeilen[j].orderIndex).toBe(
              origStrophe.zeilen[j].orderIndex
            );
          }
        }
      }),
      { numRuns: 50 }
    );
  });
});
