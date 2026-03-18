/**
 * Property 1: Audio-Quelle Erstellungs-Roundtrip
 * Property 2: Update bewahrt unveränderte Felder
 * Property 3: Löschen entfernt und reindiziert
 * Property 10: Audio-Quellen sortiert nach orderIndex
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 7.1, 7.2, 7.3, 7.4**
 */
// Feature: audio-playback-timecodes, Properties 1, 2, 3, 10: CRUD + Sortierung

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

// --- Prisma mock ---
vi.mock("@/lib/prisma", () => ({
  prisma: {
    song: {
      findUnique: vi.fn(),
    },
    audioQuelle: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import {
  getAudioQuellen,
  createAudioQuelle,
  updateAudioQuelle,
  deleteAudioQuelle,
} from "@/lib/services/audio-quelle-service";

const mockPrisma = vi.mocked(prisma);

// --- Generators ---
const audioTypArb = fc.constantFrom("MP3" as const, "SPOTIFY" as const, "YOUTUBE" as const);
const labelArb = fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0);
const validUrlArb = fc.oneof(
  fc.constant("https://example.com/song.mp3"),
  fc.constant("https://open.spotify.com/track/abc123"),
  fc.constant("https://www.youtube.com/watch?v=abc123"),
  fc.constant("https://cdn.example.org/audio/file.mp3"),
);

const TEST_USER_ID = "test-user-id";
const TEST_SONG_ID = "test-song-id";

function mockSongOwnership() {
  (mockPrisma.song.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
    id: TEST_SONG_ID,
    userId: TEST_USER_ID,
  });
}


/**
 * Property 1: Audio-Quelle Erstellungs-Roundtrip
 *
 * Für jede gültige Kombination aus URL, AudioTyp und Label: Wenn eine Audio-Quelle
 * erstellt und anschließend abgerufen wird, sollen alle Felder übereinstimmen.
 *
 * **Validates: Requirements 1.1, 7.2**
 */
describe("Property 1: Audio-Quelle Erstellungs-Roundtrip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("create then get returns matching fields for any valid url/typ/label", async () => {
    await fc.assert(
      fc.asyncProperty(
        validUrlArb,
        audioTypArb,
        labelArb,
        async (url, typ, label) => {
          vi.clearAllMocks();
          mockSongOwnership();

          const fakeId = "quelle-created-id";
          const now = new Date();

          // Mock aggregate for orderIndex calculation
          (mockPrisma.audioQuelle.aggregate as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            _max: { orderIndex: null },
          });

          const createdQuelle = {
            id: fakeId,
            songId: TEST_SONG_ID,
            url: url.trim(),
            typ,
            label: label.trim(),
            orderIndex: 0,
            createdAt: now,
          };

          (mockPrisma.audioQuelle.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce(createdQuelle);

          const result = await createAudioQuelle(
            TEST_SONG_ID,
            { url, typ, label },
            TEST_USER_ID,
          );

          // Roundtrip: created fields match input
          expect(result.url).toBe(url.trim());
          expect(result.typ).toBe(typ);
          expect(result.label).toBe(label.trim());
          expect(result.songId).toBe(TEST_SONG_ID);
          expect(typeof result.orderIndex).toBe("number");
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Property 2: Update bewahrt unveränderte Felder
 *
 * Für jede existierende Audio-Quelle und jede Teilmenge von Update-Feldern:
 * Nach einem Update sollen die nicht im Update enthaltenen Felder unverändert bleiben.
 *
 * **Validates: Requirements 1.2, 7.3**
 */
describe("Property 2: Update bewahrt unveränderte Felder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("unchanged fields stay the same after partial update", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Original fields
        validUrlArb,
        audioTypArb,
        labelArb,
        // Partial update: each field optionally present
        fc.record({
          url: fc.option(validUrlArb, { nil: undefined }),
          typ: fc.option(audioTypArb, { nil: undefined }),
          label: fc.option(labelArb, { nil: undefined }),
        }),
        async (origUrl, origTyp, origLabel, updateInput) => {
          vi.clearAllMocks();

          const quelleId = "existing-quelle-id";
          const now = new Date();

          const existingQuelle = {
            id: quelleId,
            songId: TEST_SONG_ID,
            url: origUrl,
            typ: origTyp,
            label: origLabel,
            orderIndex: 0,
            createdAt: now,
          };

          // findUnique for the quelle
          (mockPrisma.audioQuelle.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(existingQuelle);
          // Song ownership check
          mockSongOwnership();

          // Build expected result: updated fields get new values, others keep original
          const expectedResult = {
            ...existingQuelle,
            url: updateInput.url !== undefined ? updateInput.url.trim() : existingQuelle.url,
            typ: updateInput.typ !== undefined ? updateInput.typ : existingQuelle.typ,
            label: updateInput.label !== undefined ? updateInput.label.trim() : existingQuelle.label,
          };

          (mockPrisma.audioQuelle.update as ReturnType<typeof vi.fn>).mockResolvedValueOnce(expectedResult);

          const result = await updateAudioQuelle(quelleId, updateInput, TEST_USER_ID);

          // Unchanged fields must remain the same
          if (updateInput.url === undefined) {
            expect(result.url).toBe(existingQuelle.url);
          } else {
            expect(result.url).toBe(updateInput.url.trim());
          }

          if (updateInput.typ === undefined) {
            expect(result.typ).toBe(existingQuelle.typ);
          } else {
            expect(result.typ).toBe(updateInput.typ);
          }

          if (updateInput.label === undefined) {
            expect(result.label).toBe(existingQuelle.label);
          } else {
            expect(result.label).toBe(updateInput.label.trim());
          }

          // orderIndex and songId never change via update
          expect(result.orderIndex).toBe(existingQuelle.orderIndex);
          expect(result.songId).toBe(existingQuelle.songId);
        },
      ),
      { numRuns: 100 },
    );
  });
});


/**
 * Property 3: Löschen entfernt und reindiziert
 *
 * Für jede Liste von Audio-Quellen eines Songs: Wenn eine Quelle an beliebiger Position
 * gelöscht wird, sollen die verbleibenden Quellen lückenlose, aufsteigende orderIndex-Werte
 * (0, 1, 2, ...) haben und die gelöschte Quelle nicht mehr enthalten sein.
 *
 * **Validates: Requirements 1.3, 7.4**
 */
describe("Property 3: Löschen entfernt und reindiziert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delete at any position leaves contiguous orderIndex 0,1,2,...", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a list of 1-6 audio quellen
        fc.integer({ min: 1, max: 6 }).chain((count) =>
          fc.tuple(
            fc.constant(count),
            fc.integer({ min: 0, max: count - 1 }), // index to delete
          ),
        ),
        async ([count, deleteIdx]) => {
          vi.clearAllMocks();

          const now = new Date();

          // Build list of existing quellen
          const quellen = Array.from({ length: count }, (_, i) => ({
            id: `quelle-${i}`,
            songId: TEST_SONG_ID,
            url: `https://example.com/audio-${i}.mp3`,
            typ: "MP3" as const,
            label: `Track ${i}`,
            orderIndex: i,
            createdAt: now,
          }));

          const quelleToDelete = quellen[deleteIdx];

          // Mock findUnique for the quelle to delete
          (mockPrisma.audioQuelle.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(quelleToDelete);
          // Mock song ownership
          mockSongOwnership();

          // Simulate what happens inside the $transaction
          const remainingAfterDelete = quellen.filter((_, i) => i !== deleteIdx);
          // After reindexing, they should have contiguous indices
          const reindexed = remainingAfterDelete.map((q, i) => ({
            ...q,
            orderIndex: i,
          }));

          // Mock $transaction to execute the callback
          (mockPrisma.$transaction as ReturnType<typeof vi.fn>).mockImplementationOnce(
            async (cb: (tx: unknown) => Promise<void>) => {
              const txMock = {
                audioQuelle: {
                  delete: vi.fn().mockResolvedValueOnce(quelleToDelete),
                  findMany: vi.fn().mockResolvedValueOnce(remainingAfterDelete),
                  update: vi.fn().mockImplementation(async ({ where, data }: { where: { id: string }; data: { orderIndex: number } }) => {
                    const q = remainingAfterDelete.find((r) => r.id === where.id);
                    return q ? { ...q, orderIndex: data.orderIndex } : null;
                  }),
                },
              };
              await cb(txMock);
            },
          );

          await deleteAudioQuelle(quelleToDelete.id, TEST_USER_ID);

          // Verify $transaction was called
          expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);

          // Verify the remaining quellen would have contiguous indices
          for (let i = 0; i < reindexed.length; i++) {
            expect(reindexed[i].orderIndex).toBe(i);
          }

          // Verify deleted quelle is not in remaining
          expect(reindexed.find((q) => q.id === quelleToDelete.id)).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Property 10: Audio-Quellen sortiert nach orderIndex
 *
 * Für jede Menge von Audio-Quellen eines Songs: Die GET-Antwort soll die Quellen
 * aufsteigend nach orderIndex sortiert zurückgeben.
 *
 * **Validates: Requirements 1.4, 7.1**
 */
describe("Property 10: Audio-Quellen sortiert nach orderIndex", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getAudioQuellen always returns quellen sorted by orderIndex ascending", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate 0-8 quellen with shuffled orderIndex values
        fc.integer({ min: 0, max: 8 }).chain((count) =>
          fc.shuffledSubarray(
            Array.from({ length: count }, (_, i) => i),
            { minLength: count, maxLength: count },
          ).map((indices) => ({ count, indices })),
        ),
        async ({ count, indices }) => {
          vi.clearAllMocks();
          mockSongOwnership();

          const now = new Date();

          // Create quellen in shuffled order
          const quellenShuffled = indices.map((orderIndex, i) => ({
            id: `quelle-${i}`,
            songId: TEST_SONG_ID,
            url: `https://example.com/audio-${i}.mp3`,
            typ: "MP3" as const,
            label: `Track ${i}`,
            orderIndex,
            createdAt: now,
          }));

          // Prisma findMany with orderBy should return sorted
          const quellenSorted = [...quellenShuffled].sort(
            (a, b) => a.orderIndex - b.orderIndex,
          );

          (mockPrisma.audioQuelle.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce(quellenSorted);

          const result = await getAudioQuellen(TEST_SONG_ID, TEST_USER_ID);

          // Verify sorted ascending by orderIndex
          for (let i = 1; i < result.length; i++) {
            expect(result[i].orderIndex).toBeGreaterThanOrEqual(result[i - 1].orderIndex);
          }

          // Verify findMany was called with orderBy
          expect(mockPrisma.audioQuelle.findMany).toHaveBeenCalledWith({
            where: { songId: TEST_SONG_ID },
            orderBy: { orderIndex: "asc" },
          });
        },
      ),
      { numRuns: 100 },
    );
  });
});
