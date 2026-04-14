/**
 * Feature: lyco-stage, Property 17: Read-Only-Zugriff in der Setlist-Ansicht
 * Validates: Requirements 5.4
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";
import { fetchStageData } from "../../src/lib/stage/use-stage-data";
import type {
  StageBundleResponse,
  StageProgressResponse,
} from "../../src/types/stage";

function makeBundleResponse(): StageBundleResponse {
  return {
    sets: [],
    songs: [],
    timestamp: new Date().toISOString(),
  };
}

function makeProgressResponse(): StageProgressResponse {
  return {
    progress: [],
    timestamp: new Date().toISOString(),
  };
}

function makeMockFetch(
  bundleResponse: StageBundleResponse,
  progressResponse: StageProgressResponse
) {
  const calls: { url: string; method: string }[] = [];

  const mockFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();

    calls.push({ url, method });

    if (url.includes("/api/stage/bundle")) {
      return new Response(JSON.stringify(bundleResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (url.includes("/api/stage/progress")) {
      return new Response(JSON.stringify(progressResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(null, { status: 404 });
  });

  return { mockFetch, calls };
}

describe("Property 17: Read-Only-Zugriff in der Setlist-Ansicht", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetchStageData only uses GET requests — never POST, PUT, PATCH, or DELETE", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          const { mockFetch, calls } = makeMockFetch(
            makeBundleResponse(),
            makeProgressResponse()
          );

          await fetchStageData(mockFetch as unknown as typeof fetch);

          // All requests must be GET
          for (const call of calls) {
            expect(call.method).toBe("GET");
          }

          // No mutation methods used
          const mutationMethods = ["POST", "PUT", "PATCH", "DELETE"];
          for (const call of calls) {
            expect(mutationMethods).not.toContain(call.method);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("fetchStageData makes exactly 2 fetch calls (bundle + progress)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          const { mockFetch, calls } = makeMockFetch(
            makeBundleResponse(),
            makeProgressResponse()
          );

          await fetchStageData(mockFetch as unknown as typeof fetch);

          expect(calls).toHaveLength(2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("fetchStageData only calls the two read-only stage API endpoints", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          const { mockFetch, calls } = makeMockFetch(
            makeBundleResponse(),
            makeProgressResponse()
          );

          await fetchStageData(mockFetch as unknown as typeof fetch);

          const urls = calls.map((c) => c.url);
          expect(urls).toContain("/api/stage/bundle");
          expect(urls).toContain("/api/stage/progress");

          // No other endpoints called
          for (const url of urls) {
            expect(
              url === "/api/stage/bundle" || url === "/api/stage/progress"
            ).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("fetchStageData with varied bundle/progress data still only uses GET", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 20 }),
            description: fc.option(fc.string(), { nil: null }),
            songs: fc.array(
              fc.record({
                songId: fc.uuid(),
                orderIndex: fc.nat(),
              })
            ),
          })
        ),
        fc.array(
          fc.record({
            stropheId: fc.uuid(),
            prozent: fc.integer({ min: 0, max: 100 }),
          })
        ),
        async (sets, progressEntries) => {
          const bundle: StageBundleResponse = {
            sets,
            songs: [],
            timestamp: new Date().toISOString(),
          };
          const progressData: StageProgressResponse = {
            progress: progressEntries,
            timestamp: new Date().toISOString(),
          };

          const { mockFetch, calls } = makeMockFetch(bundle, progressData);

          await fetchStageData(mockFetch as unknown as typeof fetch);

          for (const call of calls) {
            expect(call.method).toBe("GET");
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
