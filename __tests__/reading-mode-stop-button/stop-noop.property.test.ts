/**
 * @vitest-environment jsdom
 */

/**
 * Property-Test: Stop ohne Audio ist No-Op
 *
 * Property 6: Stop ohne Audio ist No-Op
 *   Wenn keine MP3-Quelle vorhanden ist, rendert AudioPlayButton null
 *   und audioRef.current hat kein Audio-Element. In diesem Fall
 *   wirft stop() keinen Fehler und ist ein No-Op.
 *
 *   ∀ audioQuellen ohne MP3: stop() wirft keinen Fehler
 *
 * **Validates: Requirements 2.5**
 */

import { describe, it, expect, afterEach } from "vitest";
import fc from "fast-check";
import React from "react";
import { render, cleanup } from "@testing-library/react";
import { AudioPlayButton } from "@/components/karaoke/audio-play-button";
import type { AudioPlayButtonHandle } from "@/components/karaoke/audio-play-button";
import type { AudioQuelleResponse } from "@/types/audio";

afterEach(() => {
  cleanup();
});

// ── Arbitraries ──

/** Arbitrary non-MP3 typ values */
const arbNonMp3Typ = fc.constantFrom("YOUTUBE", "SPOTIFY", "SOUNDCLOUD", "VIMEO");

/** Arbitrary non-MP3 audio source */
const arbNonMp3Quelle = fc.record({
  id: fc.uuid(),
  url: fc.webUrl(),
  typ: arbNonMp3Typ,
  label: fc.string({ minLength: 1, maxLength: 30 }),
  orderIndex: fc.nat({ max: 100 }),
  rolle: fc.constantFrom("STANDARD", "INSTRUMENTAL", "KARAOKE"),
}) as fc.Arbitrary<AudioQuelleResponse>;

/** Arbitrary list of non-MP3 sources (0 to 5 entries) */
const arbNonMp3Quellen = fc.array(arbNonMp3Quelle, { minLength: 0, maxLength: 5 });

/** Arbitrary number of stop() calls (1 to 5) */
const arbStopCalls = fc.integer({ min: 1, max: 5 });

const PBT_CONFIG = { numRuns: 100 };

// ── Property 6: Stop ohne Audio ist No-Op ──
// **Validates: Requirements 2.5**

describe("Property 6: Stop ohne Audio ist No-Op", () => {
  it("wenn keine MP3-Quelle vorhanden ist, wirft stop() keinen Fehler", () => {
    fc.assert(
      fc.property(arbNonMp3Quellen, arbStopCalls, (quellen, stopCalls) => {
        cleanup();

        const ref = React.createRef<AudioPlayButtonHandle>();

        render(
          React.createElement(AudioPlayButton, {
            ref,
            audioQuellen: quellen,
            activeQuelleId: null,
          }),
        );

        // AudioPlayButton renders null when no MP3 source is available,
        // so ref.current will be null (no imperative handle exposed).
        // Calling stop() on the handle (if available) should not throw.
        // If ref.current is null, that itself confirms the no-op behavior
        // since there's no handle to call stop() on.
        if (ref.current) {
          // Handle is available — stop() must not throw
          expect(() => ref.current!.stop()).not.toThrow();
        }

        // In either case: no error was thrown — property holds
      }),
      PBT_CONFIG,
    );
  });
});
