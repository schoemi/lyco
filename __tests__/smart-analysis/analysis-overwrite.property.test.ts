/**
 * Feature: smart-song-analysis, Property 4: Analyse-Überschreibung
 *
 * For every song with an existing analysis, a re-analysis shall completely
 * overwrite the previous song analysis and all strophe analyses, so that
 * only the new values are stored.
 *
 * **Validates: Requirements 3.7, 4.6**
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

/** A strophe with id, name, orderIndex, and 1-3 zeilen */
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
  fc.record({
    songAnalyse: nonEmptyStringArb,
    emotionsTags: fc.array(nonEmptyStringArb, { minLength: 1, maxLength: 5 }),
    strophenAnalysen: fc.tuple(
      ...Array.from({ length: strophenCount }, (_, i) =>
        fc.record({
          stropheIndex: fc.constant(i),
          analyse: nonEmptyStringArb,
        })
      )
    ),
  });

/**
 * Combined generator: song data + two DIFFERENT LLM responses.
 * We filter to ensure the two responses differ in songAnalyse, emotionsTags,
 * and at least one strophenAnalyse.
 */
const overwriteArb = songDataArb.chain((song) =>
  fc
    .tuple(
      llmResponseArb(song.strophen.length),
      llmResponseArb(song.strophen.length)
    )
    .filter(
      ([r1, r2]) =>
        r1.songAnalyse !== r2.songAnalyse ||
        JSON.stringify(r1.emotionsTags) !== JSON.stringify(r2.emotionsTags) ||
        JSON.stringify(r1.strophenAnalysen) !== JSON.stringify(r2.strophenAnalysen)
    )
    .map(([first, second]) => ({ song, first, second }))
);

// --- Tests ---

describe("Feature: smart-song-analysis, Property 4: Analyse-Überschreibung", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    activeAnalyses.clear();
  });

  /**
   * **Validates: Requirements 3.7, 4.6**
   */
  it("second analyzeSong call overwrites first: only second response data is stored and returned", () => {
    fc.assert(
      fc.asyncProperty(overwriteArb, async ({ song, first, second }) => {
        // Clear concurrency guard
        activeAnalyses.clear();
        vi.clearAllMocks();

        // Prisma findUnique always returns the same song
        const prismaSong = {
          id: song.songId,
          userId: song.userId,
          titel: song.titel,
          kuenstler: song.kuenstler,
          strophen: song.strophen,
        } as any;

        mockSongFindUnique.mockResolvedValue(prismaSong);
        mockSongUpdate.mockResolvedValue({} as any);
        mockStropheUpdate.mockResolvedValue({} as any);

        // --- First call: LLM returns first response ---
        mockCreateLLMClient.mockReturnValue({
          chat: vi.fn().mockResolvedValue(JSON.stringify(first)),
        });

        await analyzeSong(song.userId, song.songId);

        // Clear concurrency guard between calls
        activeAnalyses.clear();

        // Record how many update calls happened in the first run
        const songUpdateCallsAfterFirst = mockSongUpdate.mock.calls.length;
        const stropheUpdateCallsAfterFirst = mockStropheUpdate.mock.calls.length;

        // --- Second call: LLM returns second response ---
        mockCreateLLMClient.mockReturnValue({
          chat: vi.fn().mockResolvedValue(JSON.stringify(second)),
        });

        const result = await analyzeSong(song.userId, song.songId);

        // --- Verify: the second song.update contains only second response data ---
        const secondSongUpdateCall =
          mockSongUpdate.mock.calls[songUpdateCallsAfterFirst];
        expect(secondSongUpdateCall).toBeDefined();
        expect(secondSongUpdateCall[0]).toEqual({
          where: { id: song.songId },
          data: {
            analyse: second.songAnalyse,
            emotionsTags: second.emotionsTags,
          },
        });

        // --- Verify: the second strophe.update calls contain only second response data ---
        const secondStropheUpdateCalls = mockStropheUpdate.mock.calls.slice(
          stropheUpdateCallsAfterFirst
        );

        expect(secondStropheUpdateCalls).toHaveLength(
          second.strophenAnalysen.length
        );

        for (let i = 0; i < second.strophenAnalysen.length; i++) {
          const strophe = song.strophen[second.strophenAnalysen[i].stropheIndex];
          expect(secondStropheUpdateCalls[i][0]).toEqual({
            where: { id: strophe.id },
            data: { analyse: second.strophenAnalysen[i].analyse },
          });
        }

        // --- Verify: returned result matches second response ---
        expect(result.songAnalyse).toBe(second.songAnalyse);
        expect(result.emotionsTags).toEqual(second.emotionsTags);
        expect(result.strophenAnalysen).toHaveLength(
          second.strophenAnalysen.length
        );

        for (let i = 0; i < second.strophenAnalysen.length; i++) {
          const strophe = song.strophen[second.strophenAnalysen[i].stropheIndex];
          expect(result.strophenAnalysen[i].stropheId).toBe(strophe.id);
          expect(result.strophenAnalysen[i].analyse).toBe(
            second.strophenAnalysen[i].analyse
          );
        }
      }),
      { numRuns: 100 }
    );
  });
});
