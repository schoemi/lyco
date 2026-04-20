/**
 * Property 7: Upsert überschreibt bestehendes Ergebnis
 *
 * **Validates: Requirements 6.3, 7.2, 10.3**
 *
 * For every song and two consecutive save operations: after the second save,
 * only the second result should be retrievable. A song has at most one
 * BeatErgebnis at any time.
 */
// Feature: beat-detection, Property 7: Upsert überschreibt bestehendes Ergebnis

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

// --- Prisma mock ---
vi.mock("@/lib/prisma", () => ({
  prisma: {
    song: {
      findUnique: vi.fn(),
    },
    beatErgebnis: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  getBeatErgebnis,
  upsertBeatErgebnis,
} from "@/lib/services/beat-ergebnis-service";

const mockPrisma = vi.mocked(prisma);

// --- Constants ---
const TEST_USER_ID = "test-user-id";
const TEST_SONG_ID = "test-song-id";

function mockSongOwnership() {
  (mockPrisma.song.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
    id: TEST_SONG_ID,
    userId: TEST_USER_ID,
  });
}

// --- Generators ---
const bpmArb = fc.integer({ min: 20, max: 300 });
const methodeArb = fc.constantFrom("AUTOMATISCH" as const, "MANUELL" as const);
const konfidenzArb = fc.oneof(
  fc.constant(null),
  fc.integer({ min: 0, max: 100 }),
);
const beatPositionenMsArb = fc.array(
  fc.integer({ min: 0, max: 600000 }),
  { minLength: 0, maxLength: 20 },
);
const frequenzArb = fc.oneof(
  fc.constant(null),
  fc.integer({ min: 20, max: 20000 }),
);

const validInputArb = fc
  .tuple(bpmArb, methodeArb, konfidenzArb, beatPositionenMsArb, frequenzArb, frequenzArb)
  .filter(([_bpm, _methode, _konfidenz, _beats, untergrenze, obergrenze]) => {
    if (untergrenze !== null && obergrenze !== null) {
      return untergrenze < obergrenze;
    }
    return true;
  })
  .map(([bpm, methode, konfidenz, beatPositionenMs, frequenzUntergrenze, frequenzObergrenze]) => ({
    bpm,
    methode,
    konfidenz,
    beatPositionenMs,
    frequenzUntergrenze,
    frequenzObergrenze,
  }));

describe("Property 7: Upsert überschreibt bestehendes Ergebnis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("after two consecutive saves, only the second result is retrievable", async () => {
    await fc.assert(
      fc.asyncProperty(validInputArb, validInputArb, async (input1, input2) => {
        vi.clearAllMocks();

        const fakeId = "beat-ergebnis-id";

        // First upsert
        const storedRecord1 = {
          id: fakeId,
          songId: TEST_SONG_ID,
          bpm: input1.bpm,
          methode: input1.methode,
          konfidenz: input1.konfidenz ?? null,
          beatPositionenMs: input1.beatPositionenMs,
          frequenzUntergrenze: input1.frequenzUntergrenze ?? null,
          frequenzObergrenze: input1.frequenzObergrenze ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockSongOwnership();
        (mockPrisma.beatErgebnis.upsert as ReturnType<typeof vi.fn>).mockResolvedValueOnce(storedRecord1);
        await upsertBeatErgebnis(TEST_SONG_ID, input1, TEST_USER_ID);

        // Second upsert (overwrites the first)
        const storedRecord2 = {
          id: fakeId, // Same ID — upsert overwrites
          songId: TEST_SONG_ID,
          bpm: input2.bpm,
          methode: input2.methode,
          konfidenz: input2.konfidenz ?? null,
          beatPositionenMs: input2.beatPositionenMs,
          frequenzUntergrenze: input2.frequenzUntergrenze ?? null,
          frequenzObergrenze: input2.frequenzObergrenze ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockSongOwnership();
        (mockPrisma.beatErgebnis.upsert as ReturnType<typeof vi.fn>).mockResolvedValueOnce(storedRecord2);
        await upsertBeatErgebnis(TEST_SONG_ID, input2, TEST_USER_ID);

        // Get should return the second result
        mockSongOwnership();
        (mockPrisma.beatErgebnis.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(storedRecord2);

        const result = await getBeatErgebnis(TEST_SONG_ID, TEST_USER_ID);

        expect(result).not.toBeNull();
        expect(result!.bpm).toBe(input2.bpm);
        expect(result!.methode).toBe(input2.methode);
        expect(result!.konfidenz).toBe(input2.konfidenz ?? null);
        expect(result!.beatPositionenMs).toEqual(input2.beatPositionenMs);
        expect(result!.frequenzUntergrenze).toBe(input2.frequenzUntergrenze ?? null);
        expect(result!.frequenzObergrenze).toBe(input2.frequenzObergrenze ?? null);

        // Verify upsert was called with songId as the where clause (ensuring 1:1)
        expect(mockPrisma.beatErgebnis.upsert).toHaveBeenCalledTimes(2);
        const lastCall = (mockPrisma.beatErgebnis.upsert as ReturnType<typeof vi.fn>).mock.calls[1];
        expect(lastCall[0].where).toEqual({ songId: TEST_SONG_ID });
      }),
      { numRuns: 100 },
    );
  });
});
