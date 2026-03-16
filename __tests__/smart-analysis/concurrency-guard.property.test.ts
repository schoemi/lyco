/**
 * Feature: smart-song-analysis, Property 7: Concurrency-Guard
 *
 * For every song that already has an active analysis running, a concurrent
 * analysis request shall be rejected with statusCode 409 and the message
 * "Eine Analyse läuft bereits für diesen Song."
 *
 * **Validates: Requirements 7.4**
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

// --- Mocks ---

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
import {
  analyzeSong,
  activeAnalyses,
  AnalyseError,
} from "@/lib/services/analyse-service";

const mockSongFindUnique = vi.mocked(prisma.song.findUnique);
const mockCreateLLMClient = vi.mocked(createLLMClient);

// --- Generators ---

const idArb = fc.uuid();

// --- Tests ---

describe("Feature: smart-song-analysis, Property 7: Concurrency-Guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    activeAnalyses.clear();
  });

  /**
   * **Validates: Requirements 7.4**
   */
  it("rejects concurrent analysis for the same song with 409 and correct message", () => {
    fc.assert(
      fc.asyncProperty(idArb, idArb, async (songId, userId) => {
        activeAnalyses.clear();

        // Pre-populate the activeAnalyses set to simulate an in-flight analysis
        activeAnalyses.add(songId);

        // Mock Prisma to return a valid song (ownership matches)
        mockSongFindUnique.mockResolvedValue({
          id: songId,
          userId,
          titel: "Test",
          kuenstler: null,
          strophen: [
            {
              id: "s1",
              name: "Vers 1",
              orderIndex: 0,
              zeilen: [{ text: "Zeile 1", orderIndex: 0 }],
            },
          ],
        } as any);

        // Mock LLM client (should never be reached)
        mockCreateLLMClient.mockReturnValue({
          chat: vi.fn().mockResolvedValue("{}"),
        });

        // The second call should throw AnalyseError with 409
        try {
          await analyzeSong(userId, songId);
          // If we reach here, the test should fail
          expect.unreachable("Expected AnalyseError to be thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(AnalyseError);
          const analyseError = error as AnalyseError;
          expect(analyseError.statusCode).toBe(409);
          expect(analyseError.message).toBe(
            "Eine Analyse läuft bereits für diesen Song."
          );
        }

        // Clean up for next iteration
        activeAnalyses.delete(songId);
      }),
      { numRuns: 100 }
    );
  });
});
