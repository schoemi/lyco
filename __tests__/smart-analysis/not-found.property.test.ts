/**
 * Feature: smart-song-analysis, Property 6: 404 bei nicht-existierender Song-ID
 *
 * For every song ID that does not exist in the database, both analyzeSong and
 * getAnalysis shall throw an AnalyseError with statusCode 404 and message
 * "Song nicht gefunden".
 *
 * **Validates: Requirements 5.7**
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
import {
  analyzeSong,
  getAnalysis,
  activeAnalyses,
  AnalyseError,
} from "@/lib/services/analyse-service";

const mockSongFindUnique = vi.mocked(prisma.song.findUnique);

// --- Generators ---

const songIdArb = fc.uuid();
const userIdArb = fc.uuid();

// --- Tests ---

describe("Feature: smart-song-analysis, Property 6: 404 bei nicht-existierender Song-ID", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    activeAnalyses.clear();
  });

  /**
   * **Validates: Requirements 5.7**
   *
   * analyzeSong throws AnalyseError with 404 when song does not exist
   */
  it("analyzeSong throws 404 for non-existing song ID", () => {
    fc.assert(
      fc.asyncProperty(userIdArb, songIdArb, async (userId, songId) => {
        activeAnalyses.clear();

        // Song not found
        mockSongFindUnique.mockResolvedValue(null);

        try {
          await analyzeSong(userId, songId);
          expect.unreachable("Expected AnalyseError to be thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(AnalyseError);
          const analyseError = error as AnalyseError;
          expect(analyseError.statusCode).toBe(404);
          expect(analyseError.message).toBe("Song nicht gefunden");
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 5.7**
   *
   * getAnalysis throws AnalyseError with 404 when song does not exist
   */
  it("getAnalysis throws 404 for non-existing song ID", () => {
    fc.assert(
      fc.asyncProperty(userIdArb, songIdArb, async (userId, songId) => {
        // Song not found
        mockSongFindUnique.mockResolvedValue(null);

        try {
          await getAnalysis(userId, songId);
          expect.unreachable("Expected AnalyseError to be thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(AnalyseError);
          const analyseError = error as AnalyseError;
          expect(analyseError.statusCode).toBe(404);
          expect(analyseError.message).toBe("Song nicht gefunden");
        }
      }),
      { numRuns: 100 }
    );
  });
});
