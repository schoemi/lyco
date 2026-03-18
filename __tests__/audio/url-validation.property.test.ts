/**
 * Property 6: Ungültige URLs werden abgelehnt
 *
 * Für jeden String ohne gültiges http/https-Protokoll, leeren String, nur Whitespace:
 * Das Erstellen einer Audio-Quelle soll fehlschlagen und einen Validierungsfehler zurückgeben.
 *
 * **Validates: Requirements 1.5**
 */
// Feature: audio-playback-timecodes, Property 6: Ungültige URLs werden abgelehnt

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

// --- Prisma mock (same pattern as audio-quelle-crud.property.test.ts) ---
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
import { createAudioQuelle } from "@/lib/services/audio-quelle-service";

const mockPrisma = vi.mocked(prisma);

const TEST_USER_ID = "test-user-id";
const TEST_SONG_ID = "test-song-id";

function mockSongOwnership() {
  (mockPrisma.song.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
    id: TEST_SONG_ID,
    userId: TEST_USER_ID,
  });
}

// --- Invalid URL generators ---

/** Empty string */
const emptyStringArb = fc.constant("");

/** Whitespace-only strings */
const whitespaceOnlyArb = fc
  .array(fc.constantFrom(" ", "\t", "\n", "\r"), { minLength: 1, maxLength: 10 })
  .map((chars) => chars.join(""));

/** URLs with non-http/https protocols */
const nonHttpProtocolArb = fc.oneof(
  fc.constant("ftp://example.com/file.mp3"),
  fc.constant("file:///home/user/song.mp3"),
  fc.constant("ws://example.com/stream"),
  fc.constant("data:audio/mp3;base64,abc"),
  fc.constant("mailto:user@example.com"),
  fc.constant("javascript:alert(1)"),
);

/** Strings without any protocol (no ://) */
const noProtocolArb = fc.oneof(
  fc.constant("example.com/song.mp3"),
  fc.constant("just-a-string"),
  fc.constant("www.example.com"),
  fc.string({ minLength: 1, maxLength: 30 }).filter(
    (s) => !s.startsWith("http://") && !s.startsWith("https://") && s.trim().length > 0,
  ),
);

/** Combined generator for all invalid URL types */
const invalidUrlArb = fc.oneof(
  emptyStringArb,
  whitespaceOnlyArb,
  nonHttpProtocolArb,
  noProtocolArb,
);

const audioTypArb = fc.constantFrom("MP3" as const, "SPOTIFY" as const, "YOUTUBE" as const);
const labelArb = fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0);

describe("Property 6: Ungültige URLs werden abgelehnt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createAudioQuelle throws 'Ungültige URL' for any invalid URL", async () => {
    await fc.assert(
      fc.asyncProperty(
        invalidUrlArb,
        audioTypArb,
        labelArb,
        async (url, typ, label) => {
          vi.clearAllMocks();
          mockSongOwnership();

          await expect(
            createAudioQuelle(TEST_SONG_ID, { url, typ, label }, TEST_USER_ID),
          ).rejects.toThrow("Ungültige URL");
        },
      ),
      { numRuns: 100 },
    );
  });
});
