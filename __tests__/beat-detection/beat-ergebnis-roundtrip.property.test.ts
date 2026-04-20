/**
 * Property 6: BeatErgebnis Round-Trip (Speichern und Laden)
 *
 * **Validates: Requirements 6.1**
 *
 * For every valid BeatErgebnisSpeichernInput: after saving via the service
 * and loading, the returned BeatErgebnisResponse should contain the same
 * values for bpm, methode, konfidenz, beatPositionenMs, frequenzUntergrenze,
 * frequenzObergrenze.
 */
// Feature: beat-detection, Property 6: BeatErgebnis Round-Trip (Speichern und Laden)

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
    // If both are present, untergrenze must be < obergrenze
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

describe("Property 6: BeatErgebnis Round-Trip (Speichern und Laden)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upsert then get returns matching fields for any valid input", async () => {
    await fc.assert(
      fc.asyncProperty(validInputArb, async (input) => {
        vi.clearAllMocks();

        const fakeId = "beat-ergebnis-id";

        const storedRecord = {
          id: fakeId,
          songId: TEST_SONG_ID,
          bpm: input.bpm,
          methode: input.methode,
          konfidenz: input.konfidenz ?? null,
          beatPositionenMs: input.beatPositionenMs,
          frequenzUntergrenze: input.frequenzUntergrenze ?? null,
          frequenzObergrenze: input.frequenzObergrenze ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Mock ownership for upsert call
        mockSongOwnership();

        // Mock upsert
        (mockPrisma.beatErgebnis.upsert as ReturnType<typeof vi.fn>).mockResolvedValueOnce(storedRecord);

        const upsertResult = await upsertBeatErgebnis(TEST_SONG_ID, input, TEST_USER_ID);

        // Mock ownership for get call
        mockSongOwnership();

        // Mock findUnique for get
        (mockPrisma.beatErgebnis.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(storedRecord);

        const getResult = await getBeatErgebnis(TEST_SONG_ID, TEST_USER_ID);

        // Round-trip: all fields must match
        expect(getResult).not.toBeNull();
        expect(getResult!.bpm).toBe(input.bpm);
        expect(getResult!.methode).toBe(input.methode);
        expect(getResult!.konfidenz).toBe(input.konfidenz ?? null);
        expect(getResult!.beatPositionenMs).toEqual(input.beatPositionenMs);
        expect(getResult!.frequenzUntergrenze).toBe(input.frequenzUntergrenze ?? null);
        expect(getResult!.frequenzObergrenze).toBe(input.frequenzObergrenze ?? null);

        // Also verify upsert result matches
        expect(upsertResult.bpm).toBe(input.bpm);
        expect(upsertResult.methode).toBe(input.methode);
        expect(upsertResult.konfidenz).toBe(input.konfidenz ?? null);
        expect(upsertResult.beatPositionenMs).toEqual(input.beatPositionenMs);
        expect(upsertResult.frequenzUntergrenze).toBe(input.frequenzUntergrenze ?? null);
        expect(upsertResult.frequenzObergrenze).toBe(input.frequenzObergrenze ?? null);
      }),
      { numRuns: 100 },
    );
  });
});
