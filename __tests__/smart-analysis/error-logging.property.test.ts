/**
 * Feature: smart-song-analysis, Property 8: Fehler-Logging
 *
 * For every LLM error (Timeout, Rate-Limit, Parse error, Network error),
 * the analyse service shall log the error with console.error containing
 * [AnalyseService], the songId, and error details, and throw an AnalyseError
 * with the correct user-friendly message and statusCode.
 *
 * **Validates: Requirements 2.4, 7.1, 7.2, 7.3, 7.5**
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

// --- Error type definitions ---

interface ErrorSpec {
  type: "timeout" | "rate-limit" | "network";
  errorMessage: string;
  expectedLogContains: string;
  expectedUserMessage: string;
  expectedStatusCode: number;
}

// --- Generators ---

const songIdArb = fc.uuid();
const userIdArb = fc.uuid();

const timeoutMessageArb = fc.oneof(
  fc.constant("Request timeout"),
  fc.constant("Timeout exceeded"),
  fc.constant("ETIMEDOUT"),
  fc.constant("ECONNABORTED"),
  fc.constant("Connection timeout after 30s")
);

const rateLimitMessageArb = fc.oneof(
  fc.constant("429 Too Many Requests"),
  fc.constant("Rate limit exceeded"),
  fc.constant("rate limit reached"),
  fc.constant("Error 429: Rate limited")
);

const networkMessageArb = fc.oneof(
  fc.constant("ECONNREFUSED"),
  fc.constant("Network error"),
  fc.constant("Connection refused"),
  fc.constant("DNS lookup failed"),
  fc.constant("Socket hang up")
);

const errorSpecArb: fc.Arbitrary<ErrorSpec> = fc.oneof(
  timeoutMessageArb.map((msg) => ({
    type: "timeout" as const,
    errorMessage: msg,
    expectedLogContains: "Timeout",
    expectedUserMessage:
      "Die Analyse konnte nicht abgeschlossen werden. Bitte versuche es später erneut.",
    expectedStatusCode: 500,
  })),
  rateLimitMessageArb.map((msg) => ({
    type: "rate-limit" as const,
    errorMessage: msg,
    expectedLogContains: "Rate-Limit",
    expectedUserMessage:
      "Zu viele Anfragen. Bitte warte einen Moment und versuche es erneut.",
    expectedStatusCode: 429,
  })),
  networkMessageArb.map((msg) => ({
    type: "network" as const,
    errorMessage: msg,
    expectedLogContains: "LLM-Fehler",
    expectedUserMessage:
      "Die Analyse konnte nicht abgeschlossen werden. Bitte versuche es später erneut.",
    expectedStatusCode: 500,
  }))
);

const parseErrorResponseArb = fc.oneof(
  fc.constant("This is not JSON at all"),
  fc.constant("<html>Error</html>"),
  fc.constant("Sure, here is the analysis..."),
  fc.constant("{invalid json}}")
);

// --- Helpers ---

function buildMockSong(songId: string, userId: string) {
  return {
    id: songId,
    userId,
    titel: "Test Song",
    kuenstler: "Test Artist",
    analyse: null,
    emotionsTags: [],
    strophen: [
      {
        id: "strophe-1",
        name: "Vers 1",
        orderIndex: 0,
        songId,
        analyse: null,
        zeilen: [
          { id: "z1", text: "Erste Zeile", orderIndex: 0, stropheId: "strophe-1" },
        ],
      },
    ],
  };
}

// --- Collected console.error logs ---
const collectedLogs: string[] = [];

// --- Tests ---

describe("Feature: smart-song-analysis, Property 8: Fehler-Logging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    activeAnalyses.clear();
    collectedLogs.length = 0;
    vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      collectedLogs.push(String(args[0]));
    });
  });

  /**
   * **Validates: Requirements 2.4, 7.1, 7.2, 7.5**
   *
   * For LLM errors (Timeout, Rate-Limit, Network), console.error is called
   * with [AnalyseService], songId, and error details; AnalyseError has
   * correct user-friendly message and statusCode.
   */
  it("logs LLM errors with [AnalyseService], songId, and error details, and returns user-friendly AnalyseError", () => {
    fc.assert(
      fc.asyncProperty(
        songIdArb,
        userIdArb,
        errorSpecArb,
        async (songId, userId, errorSpec) => {
          activeAnalyses.clear();
          const logsBefore = collectedLogs.length;

          const mockSong = buildMockSong(songId, userId);
          mockSongFindUnique.mockResolvedValue(mockSong as any);

          mockCreateLLMClient.mockReturnValue({
            chat: vi.fn().mockRejectedValue(new Error(errorSpec.errorMessage)),
          });

          let caughtError: AnalyseError | undefined;
          try {
            await analyzeSong(userId, songId);
            expect.unreachable("Expected AnalyseError to be thrown");
          } catch (error) {
            caughtError = error as AnalyseError;
          }

          // Verify thrown error
          expect(caughtError).toBeInstanceOf(AnalyseError);
          expect(caughtError!.message).toBe(errorSpec.expectedUserMessage);
          expect(caughtError!.statusCode).toBe(errorSpec.expectedStatusCode);

          // Verify console.error was called — find the log from this iteration
          const newLogs = collectedLogs.slice(logsBefore);
          expect(newLogs.length).toBeGreaterThanOrEqual(1);

          // Find the log that contains our songId
          const relevantLog = newLogs.find((log) => log.includes(songId));
          expect(relevantLog).toBeDefined();
          expect(relevantLog).toContain("[AnalyseService]");
          expect(relevantLog).toContain(songId);
          expect(relevantLog).toContain(errorSpec.expectedLogContains);
          expect(relevantLog).toContain(errorSpec.errorMessage);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 7.3, 7.5**
   *
   * When LLM returns invalid JSON (parse error), console.error is called
   * with [AnalyseService], songId, and "Ungültiges JSON"; AnalyseError has
   * correct user-friendly message and statusCode 500.
   */
  it("logs parse errors with [AnalyseService], songId, and 'Ungültiges JSON', and returns user-friendly AnalyseError", () => {
    fc.assert(
      fc.asyncProperty(
        songIdArb,
        userIdArb,
        parseErrorResponseArb,
        async (songId, userId, invalidResponse) => {
          activeAnalyses.clear();
          const logsBefore = collectedLogs.length;

          const mockSong = buildMockSong(songId, userId);
          mockSongFindUnique.mockResolvedValue(mockSong as any);

          mockCreateLLMClient.mockReturnValue({
            chat: vi.fn().mockResolvedValue(invalidResponse),
          });

          let caughtError: AnalyseError | undefined;
          try {
            await analyzeSong(userId, songId);
            expect.unreachable("Expected AnalyseError to be thrown");
          } catch (error) {
            caughtError = error as AnalyseError;
          }

          // Verify thrown error
          expect(caughtError).toBeInstanceOf(AnalyseError);
          expect(caughtError!.message).toBe(
            "Die Analyse konnte nicht verarbeitet werden. Bitte versuche es erneut."
          );
          expect(caughtError!.statusCode).toBe(500);

          // Verify console.error was called — find the log from this iteration
          const newLogs = collectedLogs.slice(logsBefore);
          expect(newLogs.length).toBeGreaterThanOrEqual(1);

          const relevantLog = newLogs.find((log) => log.includes(songId));
          expect(relevantLog).toBeDefined();
          expect(relevantLog).toContain("[AnalyseService]");
          expect(relevantLog).toContain(songId);
          expect(relevantLog).toContain("Ungültiges JSON");
        }
      ),
      { numRuns: 100 }
    );
  });
});
