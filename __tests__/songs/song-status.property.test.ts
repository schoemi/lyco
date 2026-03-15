/**
 * Property 17: Song-Status-Ableitung
 *
 * Für jeden Fortschrittswert im Bereich [0, 100] gilt: Der abgeleitete Status
 * muss deterministisch sein: 0 → "neu", 1–99 → "aktiv", 100 → "gelernt".
 *
 * **Validates: Requirements 10.4**
 */
import { describe, it, expect, vi } from "vitest";
import fc from "fast-check";

// Mock prisma to prevent import errors from song-service
vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

import { deriveSongStatus } from "@/lib/services/song-service";

describe("Property 17: Song-Status-Ableitung", () => {
  it("progress 0 → 'neu', 1–99 → 'aktiv', 100 → 'gelernt'", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (progress) => {
        const status = deriveSongStatus(progress);

        if (progress === 0) {
          expect(status).toBe("neu");
        } else if (progress === 100) {
          expect(status).toBe("gelernt");
        } else {
          expect(status).toBe("aktiv");
        }
      }),
      { numRuns: 20 }
    );
  });
});
