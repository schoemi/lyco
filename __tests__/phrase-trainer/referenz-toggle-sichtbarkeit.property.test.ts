/**
 * Feature: phrase-trainer, Property 4: Referenz-Toggle-Sichtbarkeit
 *
 * Für jeden Song gilt: Der Toggle-Schalter für die Referenz-Vokalspur ist genau
 * dann sichtbar, wenn der Song eine AudioQuelle mit `rolle === 'REFERENZ_VOKAL'`
 * besitzt, und ausgeblendet, wenn keine solche AudioQuelle vorhanden ist.
 *
 * **Validates: Requirements 5.1, 5.4**
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { findeReferenzVokal } from "@/lib/phrase-trainer/utils";
import type { AudioQuelleResponse } from "@/types/audio";

// --- Generators ---

/** All valid AudioRolle values */
const audioRolleArb = fc.constantFrom(
  "STANDARD" as const,
  "INSTRUMENTAL" as const,
  "REFERENZ_VOKAL" as const,
);

/** All valid AudioTyp values */
const audioTypArb = fc.constantFrom(
  "MP3" as const,
  "SPOTIFY" as const,
  "YOUTUBE" as const,
  "APPLE_MUSIC" as const,
);

/** Generator for a single AudioQuelleResponse with a given rolle */
function audioQuelleArb(
  rolle: fc.Arbitrary<"STANDARD" | "INSTRUMENTAL" | "REFERENZ_VOKAL">,
): fc.Arbitrary<AudioQuelleResponse> {
  return fc
    .tuple(fc.uuid(), fc.webUrl(), audioTypArb, fc.string({ minLength: 1, maxLength: 20 }), fc.nat({ max: 10 }), rolle)
    .map(([id, url, typ, label, orderIndex, r]) => ({
      id,
      url,
      typ,
      label,
      orderIndex,
      rolle: r,
    }));
}

/** Generator for an AudioQuelleResponse with any rolle */
const anyAudioQuelleArb: fc.Arbitrary<AudioQuelleResponse> = audioQuelleArb(audioRolleArb);

/** Generator for an AudioQuelleResponse that is NOT REFERENZ_VOKAL */
const nonReferenzQuelleArb: fc.Arbitrary<AudioQuelleResponse> = audioQuelleArb(
  fc.constantFrom("STANDARD" as const, "INSTRUMENTAL" as const),
);

/** Generator for an AudioQuelleResponse that IS REFERENZ_VOKAL */
const referenzVokalQuelleArb: fc.Arbitrary<AudioQuelleResponse> = audioQuelleArb(
  fc.constant("REFERENZ_VOKAL" as const),
);

/**
 * Determines toggle visibility from audio sources — mirrors the logic used
 * in PhraseTrainerView to derive `referenzVokalUrl` for WiedergabeMixer.
 *
 * The component chain is:
 * 1. PhraseTrainerView calls `findeReferenzVokal(audioQuellen)`
 * 2. If found, passes `referenzVokalUrl = quelle.url` (string)
 * 3. If not found, passes `referenzVokalUrl = null`
 * 4. WiedergabeMixer: `const hatReferenz = referenzVokalUrl !== null`
 * 5. Toggle is rendered only when `hatReferenz` is true
 */
function toggleSollSichtbarSein(audioQuellen: AudioQuelleResponse[]): boolean {
  return findeReferenzVokal(audioQuellen) !== null;
}

// --- Property Tests ---

describe("Feature: phrase-trainer, Property 4: Referenz-Toggle-Sichtbarkeit", () => {
  it("toggle is visible when at least one AudioQuelle has rolle === REFERENZ_VOKAL", () => {
    fc.assert(
      fc.property(
        referenzVokalQuelleArb,
        fc.array(nonReferenzQuelleArb, { minLength: 0, maxLength: 5 }),
        (refQuelle, otherQuellen) => {
          const audioQuellen = [...otherQuellen, refQuelle];
          expect(toggleSollSichtbarSein(audioQuellen)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("toggle is hidden when no AudioQuelle has rolle === REFERENZ_VOKAL", () => {
    fc.assert(
      fc.property(
        fc.array(nonReferenzQuelleArb, { minLength: 0, maxLength: 5 }),
        (audioQuellen) => {
          expect(toggleSollSichtbarSein(audioQuellen)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("toggle visibility is exactly determined by presence of REFERENZ_VOKAL AudioQuelle", () => {
    fc.assert(
      fc.property(
        fc.array(anyAudioQuelleArb, { minLength: 0, maxLength: 8 }),
        (audioQuellen) => {
          const hasReferenz = audioQuellen.some(
            (q) => q.rolle === "REFERENZ_VOKAL",
          );
          expect(toggleSollSichtbarSein(audioQuellen)).toBe(hasReferenz);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("toggle visibility does not depend on the number of REFERENZ_VOKAL sources (one is enough)", () => {
    fc.assert(
      fc.property(
        fc.array(referenzVokalQuelleArb, { minLength: 1, maxLength: 3 }),
        fc.array(nonReferenzQuelleArb, { minLength: 0, maxLength: 5 }),
        (refQuellen, otherQuellen) => {
          const audioQuellen = [...otherQuellen, ...refQuellen];
          // Whether there's 1 or 3 REFERENZ_VOKAL sources, toggle is visible
          expect(toggleSollSichtbarSein(audioQuellen)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("toggle visibility does not depend on the order of AudioQuellen", () => {
    fc.assert(
      fc.property(
        fc.array(anyAudioQuelleArb, { minLength: 0, maxLength: 8 }),
        fc.nat(),
        (audioQuellen, seed) => {
          // Shuffle the array using a simple deterministic shuffle
          const shuffled = [...audioQuellen].sort(
            (a, b) => ((a.id + seed).length - (b.id + seed).length),
          );

          expect(toggleSollSichtbarSein(audioQuellen)).toBe(
            toggleSollSichtbarSein(shuffled),
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
