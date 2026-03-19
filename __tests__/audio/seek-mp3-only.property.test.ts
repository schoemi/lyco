/**
 * @vitest-environment jsdom
 */

/**
 * Property 7: Seek nur bei MP3
 *
 * Für jeden AudioTyp ungleich MP3 (SPOTIFY, YOUTUBE): Die Seek-Funktion soll
 * deaktiviert sein bzw. `false` zurückgeben, wenn versucht wird, zu einem
 * Timecode zu navigieren.
 *
 * **Validates: Requirements 4.3**
 */
// Feature: audio-playback-timecodes, Property 7: Seek nur bei MP3

import { describe, it, expect, afterEach } from "vitest";
import fc from "fast-check";
import React from "react";
import { render, cleanup } from "@testing-library/react";
import { AudioPlayer } from "@/components/songs/audio-player";
import type { AudioPlayerHandle } from "@/components/songs/audio-player";
import type { AudioQuelleResponse } from "@/types/audio";

afterEach(() => {
  cleanup();
});

// Generator: non-MP3 audio types
const nonMp3TypArb = fc.constantFrom<"SPOTIFY" | "YOUTUBE">("SPOTIFY", "YOUTUBE");

// Generator: positive seek target in ms (0 to 10 minutes)
const seekTargetMsArb = fc.integer({ min: 0, max: 600_000 });

const PBT_CONFIG = { numRuns: 100 };

function makeQuelle(typ: "SPOTIFY" | "YOUTUBE" | "MP3"): AudioQuelleResponse {
  const urls: Record<string, string> = {
    SPOTIFY: "https://open.spotify.com/track/abc123",
    YOUTUBE: "https://www.youtube.com/watch?v=abc123",
    MP3: "https://example.com/song.mp3",
  };
  return {
    id: "test-quelle-1",
    url: urls[typ],
    typ,
    label: `Test ${typ}`,
    orderIndex: 0,
    rolle: "STANDARD",
  };
}

describe("Property 7: Seek nur bei MP3", () => {
  it("seekTo returns false for every non-MP3 AudioTyp and any seek target", () => {
    fc.assert(
      fc.property(nonMp3TypArb, seekTargetMsArb, (typ, seekMs) => {
        const ref = React.createRef<AudioPlayerHandle>();
        const quelle = makeQuelle(typ);

        render(
          React.createElement(AudioPlayer, {
            ref,
            audioQuellen: [quelle],
          }),
        );

        expect(ref.current).not.toBeNull();
        const result = ref.current!.seekTo(seekMs);
        expect(result).toBe(false);

        cleanup();
      }),
      PBT_CONFIG,
    );
  });
});
