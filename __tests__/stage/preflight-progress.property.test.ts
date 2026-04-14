/**
 * Property 15: Preflight-Fortschrittsanzeige
 *
 * Für jede Menge von N Songs im Preflight-Check soll der Fortschrittsbalken
 * nach dem Laden von K Songs den Wert K/N anzeigen (0 ≤ K ≤ N).
 *
 * **Validates: Requirements 4.3**
 */
// Feature: lyco-stage, Property 15: Preflight-Fortschrittsanzeige

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { runPreflight } from "@/lib/stage/use-preflight-check";
import type { StageSong } from "@/types/stage";

function makeSong(index: number): StageSong {
  return {
    id: `song-${index}`,
    titel: `Song ${index}`,
    kuenstler: null,
    strophen: [],
  };
}

describe("Property 15: Preflight-Fortschrittsanzeige", () => {
  it("progress increases monotonically and reaches N/N after all songs", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 100 }),
        async (n) => {
          const songs = Array.from({ length: n }, (_, i) => makeSong(i));
          const progressSnapshots: Array<{ loaded: number; total: number }> = [];

          // Mock fetch — progress endpoint always succeeds
          const mockFetch = async (url: string): Promise<Response> => {
            if (url === "/api/stage/progress") {
              return new Response(JSON.stringify({ progress: [], timestamp: new Date().toISOString() }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
              });
            }
            return new Response(null, { status: 404 });
          };

          await runPreflight(
            songs,
            (loaded, total) => progressSnapshots.push({ loaded, total }),
            () => {},
            mockFetch as typeof fetch,
          );

          // After processing all N songs, we should have N progress snapshots
          expect(progressSnapshots).toHaveLength(n);

          // Each snapshot should have total = N
          for (const snap of progressSnapshots) {
            expect(snap.total).toBe(n);
          }

          // Progress values should be 1, 2, ..., N (monotonically increasing)
          for (let k = 0; k < n; k++) {
            expect(progressSnapshots[k].loaded).toBe(k + 1);
          }

          // Final snapshot: loaded === total === N
          const last = progressSnapshots[n - 1];
          expect(last.loaded).toBe(n);
          expect(last.total).toBe(n);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("progress after K songs shows K/N", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 50 }),
        fc.integer({ min: 1, max: 49 }),
        async (n, kRaw) => {
          const k = Math.min(kRaw, n - 1); // ensure k < n
          const songs = Array.from({ length: n }, (_, i) => makeSong(i));
          const progressSnapshots: Array<{ loaded: number; total: number }> = [];

          const mockFetch = async (): Promise<Response> =>
            new Response(JSON.stringify({ progress: [], timestamp: new Date().toISOString() }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });

          await runPreflight(
            songs,
            (loaded, total) => progressSnapshots.push({ loaded, total }),
            () => {},
            mockFetch as typeof fetch,
          );

          // After K songs processed, snapshot[k-1] should show loaded=K, total=N
          expect(progressSnapshots[k - 1].loaded).toBe(k);
          expect(progressSnapshots[k - 1].total).toBe(n);
        },
      ),
      { numRuns: 100 },
    );
  });
});
