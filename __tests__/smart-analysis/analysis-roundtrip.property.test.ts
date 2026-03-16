/**
 * Feature: smart-song-analysis, Property 3: Analyse-Round-Trip
 *
 * For every valid Song object with strophen and zeilen and every schema-conforming
 * LLM response, the analysis pipeline shall produce a consistent result object
 * containing songAnalyse (non-empty string), emotionsTags (string array), and
 * strophenAnalysen (array with one analysis per analysed strophe, correctly
 * mapped via stropheId).
 *
 * **Validates: Requirements 3.4, 3.5, 4.1, 4.4, 5.2, 5.3, 6.6**
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

// --- Mocks (must be declared before imports that use them) ---

vi.mock("@/lib/prisma", () => ({
  prisma: {
    song: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    strophe: {
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/services/llm-client", () => ({
  createLLMClient: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { createLLMClient } from "@/lib/services/llm-client";
import { analyzeSong, activeAnalyses } from "@/lib/services/analyse-service";

const mockSongFindUnique = vi.mocked(prisma.song.findUnique);
const mockSongUpdate = vi.mocked(prisma.song.update);
const mockStropheUpdate = vi.mocked(prisma.strophe.update);
const mockCreateLLMClient = vi.mocked(createLLMClient);

// --- Generators ---

/** Non-empty alphanumeric string */
const nonEmptyStringArb = fc
  .stringMatching(/^[A-Za-z0-9 ]{1,40}$/)
  .filter((s) => s.trim().length > 0)
  .map((s) => s.trim());

/** A single zeile */
const zeileArb = fc.record({
  text: nonEmptyStringArb,
  orderIndex: fc.nat({ max: 100 }),
});

/** A strophe with id, name, orderIndex, and 1-5 zeilen */
const stropheArb = (index: number) =>
  fc.record({
    id: fc.uuid(),
    name: fc.constantFrom("Vers 1", "Vers 2", "Refrain", "Bridge", "Outro"),
    orderIndex: fc.constant(index),
    zeilen: fc.array(zeileArb, { minLength: 1, maxLength: 5 }),
  });

/** Generate 1-5 strophen with sequential orderIndex */
const strophenArb = fc
  .integer({ min: 1, max: 5 })
  .chain((count) =>
    fc.tuple(...Array.from({ length: count }, (_, i) => stropheArb(i)))
  );

/** Song generator matching Prisma shape */
const songDataArb = fc.record({
  songId: fc.uuid(),
  userId: fc.uuid(),
  titel: nonEmptyStringArb,
  kuenstler: fc.oneof(fc.constant(null), nonEmptyStringArb),
  strophen: strophenArb,
});

/** LLM response generator: schema-conforming, matching strophen count */
const llmResponseArb = (strophenCount: number) =>
  fc
    .record({
      songAnalyse: nonEmptyStringArb,
      emotionsTags: fc.array(nonEmptyStringArb, { minLength: 0, maxLength: 5 }),
      strophenAnalysen: fc
        .tuple(
          ...Array.from({ length: strophenCount }, (_, i) =>
            fc.record({
              stropheIndex: fc.constant(i),
              analyse: nonEmptyStringArb,
            })
          )
        )
        .map((arr) => arr),
    })
    .map((resp) => JSON.stringify(resp));

/** Combined generator: song data + matching LLM response */
const roundTripArb = songDataArb.chain((song) =>
  llmResponseArb(song.strophen.length).map((llmResponse) => ({
    song,
    llmResponse,
  }))
);

// --- Tests ---

describe("Feature: smart-song-analysis, Property 3: Analyse-Round-Trip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    activeAnalyses.clear();
  });

  /**
   * **Validates: Requirements 3.4, 3.5, 4.1, 4.4, 5.2, 5.3, 6.6**
   */
  it("analyzeSong returns consistent result with non-empty songAnalyse, string array emotionsTags, and correct strophenAnalysen count and stropheId mapping", () => {
    fc.assert(
      fc.asyncProperty(roundTripArb, async ({ song, llmResponse }) => {
        // Clear concurrency guard for each run
        activeAnalyses.clear();

        // Setup Prisma mock: song.findUnique returns the generated song
        mockSongFindUnique.mockResolvedValue({
          id: song.songId,
          userId: song.userId,
          titel: song.titel,
          kuenstler: song.kuenstler,
          strophen: song.strophen,
        } as any);

        mockSongUpdate.mockResolvedValue({} as any);
        mockStropheUpdate.mockResolvedValue({} as any);

        // Setup LLM client mock
        mockCreateLLMClient.mockReturnValue({
          chat: vi.fn().mockResolvedValue(llmResponse),
        });

        // Call analyzeSong
        const result = await analyzeSong(song.userId, song.songId);

        // Verify songAnalyse is a non-empty string
        expect(typeof result.songAnalyse).toBe("string");
        expect(result.songAnalyse.trim().length).toBeGreaterThan(0);

        // Verify emotionsTags is a string array
        expect(Array.isArray(result.emotionsTags)).toBe(true);
        for (const tag of result.emotionsTags) {
          expect(typeof tag).toBe("string");
        }

        // Verify strophenAnalysen has correct count
        expect(result.strophenAnalysen).toHaveLength(song.strophen.length);

        // Verify correct stropheId mapping (each stropheId matches the generated strophe ids)
        const expectedStropheIds = song.strophen.map((s) => s.id);
        const actualStropheIds = result.strophenAnalysen.map((sa) => sa.stropheId);
        expect(actualStropheIds).toEqual(expectedStropheIds);

        // Verify each strophenAnalyse has a non-empty analyse string
        for (const sa of result.strophenAnalysen) {
          expect(typeof sa.analyse).toBe("string");
          expect(sa.analyse.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 }
    );
  });
});
