/**
 * Feature: smart-song-analysis, Property 5: Zugriffskontrolle
 *
 * For every analysis request (analyzeSong or getAnalysis), access shall only be
 * granted if the user is the owner of the song. Requests on foreign songs
 * (userId !== song.userId) shall receive 403.
 *
 * **Validates: Requirements 5.5, 5.6**
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
  getAnalysis,
  activeAnalyses,
  AnalyseError,
} from "@/lib/services/analyse-service";

const mockSongFindUnique = vi.mocked(prisma.song.findUnique);
const mockSongUpdate = vi.mocked(prisma.song.update);
const mockStropheUpdate = vi.mocked(prisma.strophe.update);
const mockCreateLLMClient = vi.mocked(createLLMClient);

// --- Generators ---

const idArb = fc.uuid();

/** Non-empty alphanumeric string */
const nonEmptyStringArb = fc
  .stringMatching(/^[A-Za-z0-9 ]{1,40}$/)
  .filter((s) => s.trim().length > 0)
  .map((s) => s.trim());

/** Generate two distinct UUIDs (userId !== ownerId) */
const distinctIdPairArb = fc
  .tuple(idArb, idArb)
  .filter(([a, b]) => a !== b);

// --- Tests ---

describe("Feature: smart-song-analysis, Property 5: Zugriffskontrolle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    activeAnalyses.clear();
  });

  /**
   * **Validates: Requirements 5.5, 5.6**
   *
   * Foreign song: analyzeSong throws AnalyseError with 403 when userId !== song.userId
   */
  it("analyzeSong rejects access to foreign songs with 403", () => {
    fc.assert(
      fc.asyncProperty(
        distinctIdPairArb,
        idArb,
        async ([userId, ownerId], songId) => {
          activeAnalyses.clear();

          // Mock Prisma to return a song owned by ownerId
          mockSongFindUnique.mockResolvedValue({
            id: songId,
            userId: ownerId,
            titel: "Test Song",
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

          try {
            await analyzeSong(userId, songId);
            expect.unreachable("Expected AnalyseError to be thrown");
          } catch (error) {
            expect(error).toBeInstanceOf(AnalyseError);
            const analyseError = error as AnalyseError;
            expect(analyseError.statusCode).toBe(403);
            expect(analyseError.message).toBe("Zugriff verweigert");
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 5.5, 5.6**
   *
   * Foreign song: getAnalysis throws AnalyseError with 403 when userId !== song.userId
   */
  it("getAnalysis rejects access to foreign songs with 403", () => {
    fc.assert(
      fc.asyncProperty(
        distinctIdPairArb,
        idArb,
        async ([userId, ownerId], songId) => {
          // Mock Prisma to return a song owned by ownerId
          mockSongFindUnique.mockResolvedValue({
            id: songId,
            userId: ownerId,
            titel: "Test Song",
            kuenstler: null,
            analyse: "Some analysis",
            emotionsTags: ["Tag1"],
            strophen: [
              {
                id: "s1",
                name: "Vers 1",
                orderIndex: 0,
                analyse: "Strophe analysis",
              },
            ],
          } as any);

          try {
            await getAnalysis(userId, songId);
            expect.unreachable("Expected AnalyseError to be thrown");
          } catch (error) {
            expect(error).toBeInstanceOf(AnalyseError);
            const analyseError = error as AnalyseError;
            expect(analyseError.statusCode).toBe(403);
            expect(analyseError.message).toBe("Zugriff verweigert");
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 5.5, 5.6**
   *
   * Own song: analyzeSong does NOT throw 403 when userId === song.userId
   */
  it("analyzeSong grants access to own songs (no 403)", () => {
    fc.assert(
      fc.asyncProperty(idArb, idArb, async (userId, songId) => {
        activeAnalyses.clear();

        const stropheId = `strophe-${songId}`;

        // Mock Prisma to return a song owned by the same userId
        mockSongFindUnique.mockResolvedValue({
          id: songId,
          userId: userId,
          titel: "My Song",
          kuenstler: "Artist",
          strophen: [
            {
              id: stropheId,
              name: "Vers 1",
              orderIndex: 0,
              zeilen: [{ text: "Zeile 1", orderIndex: 0 }],
            },
          ],
        } as any);

        mockSongUpdate.mockResolvedValue({} as any);
        mockStropheUpdate.mockResolvedValue({} as any);

        // Mock LLM client to return a valid response
        const validResponse = JSON.stringify({
          songAnalyse: "Eine tiefgründige Analyse",
          emotionsTags: ["Freude"],
          strophenAnalysen: [
            { stropheIndex: 0, analyse: "Strophe 1 Analyse" },
          ],
        });

        mockCreateLLMClient.mockReturnValue({
          chat: vi.fn().mockResolvedValue(validResponse),
        });

        // Should NOT throw 403
        const result = await analyzeSong(userId, songId);
        expect(result).toBeDefined();
        expect(result.songAnalyse).toBe("Eine tiefgründige Analyse");
      }),
      { numRuns: 100 }
    );
  });
});
