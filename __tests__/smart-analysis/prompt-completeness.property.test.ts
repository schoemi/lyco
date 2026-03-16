/**
 * Feature: smart-song-analysis, Property 1: Prompt-Vollständigkeit
 *
 * For every Song object with strophen and zeilen, the generated prompt shall contain:
 * (a) a system message with the role as Songtext-Analyst and focus on emotional meaning,
 * (b) a user message with song title, artist (if present), all zeilen from all strophen,
 *     and JSON response structure instructions.
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 4.2, 4.3, 6.1, 6.2, 6.3, 6.4**
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { buildAnalysePrompt } from "@/lib/services/analyse-service";

// --- Generators ---

/** Non-empty alphanumeric title */
const titelArb = fc
  .stringMatching(/^[A-Za-z0-9 ]{1,40}$/)
  .filter((s) => s.trim().length > 0)
  .map((s) => s.trim());

/** Optional artist: string or null/undefined */
const kuenstlerArb = fc.oneof(
  fc.constant(null),
  fc.constant(undefined),
  titelArb
);

/** A single zeile with non-empty text */
const zeileArb = fc
  .stringMatching(/^[A-Za-z0-9 ]{1,60}$/)
  .filter((s) => s.trim().length > 0)
  .map((s) => ({ text: s.trim() }));

/** A strophe name */
const stropheNameArb = fc.constantFrom(
  "Vers 1", "Vers 2", "Vers 3", "Refrain", "Bridge", "Outro", "Intro"
);

/** A strophe with 1-10 zeilen */
const nonEmptyStropheArb = fc.record({
  name: stropheNameArb,
  zeilen: fc.array(zeileArb, { minLength: 1, maxLength: 10 }),
});

/** An empty strophe (no zeilen) */
const emptyStropheArb = fc.record({
  name: stropheNameArb,
  zeilen: fc.constant([] as { text: string }[]),
});

/** Song generator: 1-5 strophen (mix of non-empty and possibly empty) */
const songArb = fc.record({
  titel: titelArb,
  kuenstler: kuenstlerArb,
  strophen: fc.array(
    fc.oneof({ weight: 4, arbitrary: nonEmptyStropheArb }, { weight: 1, arbitrary: emptyStropheArb }),
    { minLength: 1, maxLength: 5 }
  ),
});

// --- Property Tests ---

describe("Feature: smart-song-analysis, Property 1: Prompt-Vollständigkeit", () => {
  /**
   * **Validates: Requirements 3.1, 3.2, 3.3, 4.2, 4.3, 6.1, 6.2, 6.3, 6.4**
   */
  it("buildAnalysePrompt returns exactly 2 messages (system + user)", () => {
    fc.assert(
      fc.property(songArb, (song) => {
        const messages = buildAnalysePrompt(song);
        expect(messages).toHaveLength(2);
        expect(messages[0].role).toBe("system");
        expect(messages[1].role).toBe("user");
      }),
      { numRuns: 100 }
    );
  });

  it("system message contains analyst role and emotional focus", () => {
    fc.assert(
      fc.property(songArb, (song) => {
        const [system] = buildAnalysePrompt(song);
        expect(system.content).toContain("Songtext-Analyst");
        expect(system.content).toContain("emotionale Bedeutung");
      }),
      { numRuns: 100 }
    );
  });

  it("user message contains the song title", () => {
    fc.assert(
      fc.property(songArb, (song) => {
        const [, user] = buildAnalysePrompt(song);
        expect(user.content).toContain(song.titel);
      }),
      { numRuns: 100 }
    );
  });

  it("user message contains kuenstler when provided", () => {
    // Use only songs with a non-null/non-undefined kuenstler
    const songWithKuenstlerArb = fc.record({
      titel: titelArb,
      kuenstler: titelArb,
      strophen: fc.array(nonEmptyStropheArb, { minLength: 1, maxLength: 3 }),
    });

    fc.assert(
      fc.property(songWithKuenstlerArb, (song) => {
        const [, user] = buildAnalysePrompt(song);
        expect(user.content).toContain(song.kuenstler);
      }),
      { numRuns: 100 }
    );
  });

  it("all zeilen text from non-empty strophen appear in the user message", () => {
    fc.assert(
      fc.property(songArb, (song) => {
        const [, user] = buildAnalysePrompt(song);
        const nonEmptyStrophen = song.strophen.filter(
          (s) => s.zeilen.length > 0
        );
        for (const strophe of nonEmptyStrophen) {
          for (const zeile of strophe.zeilen) {
            expect(user.content).toContain(zeile.text);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it("user message contains JSON structure keywords", () => {
    fc.assert(
      fc.property(songArb, (song) => {
        const [, user] = buildAnalysePrompt(song);
        expect(user.content).toContain("songAnalyse");
        expect(user.content).toContain("emotionsTags");
        expect(user.content).toContain("strophenAnalysen");
      }),
      { numRuns: 100 }
    );
  });

  it("empty strophen (no zeilen) are skipped in the user message", () => {
    // Generate a song that has at least one empty strophe with a unique name
    const uniqueEmptyStropheArb = fc.record({
      name: fc.constant("LEERE_STROPHE_MARKER"),
      zeilen: fc.constant([] as { text: string }[]),
    });

    const songWithEmptyArb = fc.record({
      titel: titelArb,
      kuenstler: fc.constant(null),
      strophen: fc.tuple(
        nonEmptyStropheArb,
        uniqueEmptyStropheArb,
        nonEmptyStropheArb
      ).map(([a, b, c]) => [a, b, c]),
    });

    fc.assert(
      fc.property(songWithEmptyArb, (song) => {
        const [, user] = buildAnalysePrompt(song);
        expect(user.content).not.toContain("LEERE_STROPHE_MARKER");
      }),
      { numRuns: 100 }
    );
  });
});
