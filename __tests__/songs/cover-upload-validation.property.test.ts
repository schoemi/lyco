/**
 * Property 1: Nur gültige Bildformate werden akzeptiert
 *
 * - Für jede Datei mit ungültigem MIME-Type UND ungültiger Extension: HTTP 400 mit Fehlermeldung
 *   "Nur JPEG, PNG und WebP Dateien sind erlaubt"
 * - Für jede Datei > 5 MB: HTTP 400 mit Fehlermeldung
 *   "Die Datei darf maximal 5 MB groß sein"
 *
 * **Validates: Requirements 2.2, 2.3, 2.4, 2.5**
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import { NextRequest } from "next/server";

// --- Auth mock ---
const { mockAuth } = vi.hoisted(() => {
  const _mockAuth = vi.fn();
  return { mockAuth: _mockAuth };
});

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

// --- Prisma mock ---
vi.mock("@/lib/prisma", () => ({
  prisma: {
    song: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// --- fs/promises mock ---
vi.mock("fs/promises", () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/songs/[id]/cover/upload/route";

const mockPrisma = vi.mocked(prisma);

const TEST_USER_ID = "test-user-id";
const TEST_SONG_ID = "test-song-id";

function setupAuthAndOwnership() {
  mockAuth.mockResolvedValue({
    user: { id: TEST_USER_ID, email: "test@example.com" },
  });
  (mockPrisma.song.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
    id: TEST_SONG_ID,
    userId: TEST_USER_ID,
  });
  (mockPrisma.song.update as ReturnType<typeof vi.fn>).mockResolvedValue({
    id: TEST_SONG_ID,
    coverUrl: "/api/uploads/covers/test.jpg",
  });
}

function makeParams(): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id: TEST_SONG_ID }) };
}

/**
 * Build a NextRequest with a FormData file upload.
 */
function makeUploadRequest(
  filename: string,
  mimeType: string,
  sizeBytes: number,
): NextRequest {
  const content = new Uint8Array(sizeBytes);
  const file = new File([content], filename, { type: mimeType });
  const formData = new FormData();
  formData.append("file", file);

  return new NextRequest(
    new URL(`/api/songs/${TEST_SONG_ID}/cover/upload`, "http://localhost:3000"),
    { method: "POST", body: formData },
  );
}

// --- Generators ---

/** Invalid MIME types that are NOT image/jpeg, image/png, or image/webp */
const invalidMimeTypeArb = fc.oneof(
  fc.constant("application/pdf"),
  fc.constant("text/plain"),
  fc.constant("image/gif"),
  fc.constant("image/svg+xml"),
  fc.constant("image/bmp"),
  fc.constant("image/tiff"),
  fc.constant("application/octet-stream"),
  fc.constant("video/mp4"),
  fc.constant("audio/mpeg"),
);

/** Invalid file extensions that are NOT .jpg, .jpeg, .png, or .webp */
const invalidExtensionArb = fc.oneof(
  fc.constant(".gif"),
  fc.constant(".bmp"),
  fc.constant(".svg"),
  fc.constant(".tiff"),
  fc.constant(".pdf"),
  fc.constant(".txt"),
  fc.constant(".mp4"),
  fc.constant(".exe"),
);

/** Base filename without extension */
const baseNameArb = fc
  .stringMatching(/^[a-z][a-z0-9_-]{0,15}$/)
  .filter((s) => s.length > 0);

/** File size within the 5 MB limit (1 byte to 5 MB) */
const validSizeArb = fc.integer({ min: 1, max: 100 }); // small for perf

/** File size exceeding 5 MB */
const oversizeBytesArb = fc.integer({
  min: 5 * 1024 * 1024 + 1,
  max: 5 * 1024 * 1024 + 512, // keep small to avoid memory issues
});

/** Valid MIME types */
const validMimeTypeArb = fc.constantFrom("image/jpeg", "image/png", "image/webp");

/** Valid extensions */
const validExtensionArb = fc.constantFrom(".jpg", ".jpeg", ".png", ".webp");

describe("Property 1: Nur gültige Bildformate werden akzeptiert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthAndOwnership();
  });

  it("rejects files with invalid MIME type AND invalid extension with HTTP 400", async () => {
    await fc.assert(
      fc.asyncProperty(
        baseNameArb,
        invalidExtensionArb,
        invalidMimeTypeArb,
        validSizeArb,
        async (baseName, ext, mimeType, size) => {
          vi.clearAllMocks();
          setupAuthAndOwnership();

          const filename = `${baseName}${ext}`;
          const request = makeUploadRequest(filename, mimeType, size);
          const response = await POST(request, makeParams());

          expect(response.status).toBe(400);
          const json = await response.json();
          expect(json.error).toBe("Nur JPEG, PNG und WebP Dateien sind erlaubt");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rejects files exceeding 5 MB with HTTP 400 size error", async () => {
    await fc.assert(
      fc.asyncProperty(
        baseNameArb,
        validExtensionArb,
        validMimeTypeArb,
        oversizeBytesArb,
        async (baseName, ext, mimeType, size) => {
          vi.clearAllMocks();
          setupAuthAndOwnership();

          const filename = `${baseName}${ext}`;
          const request = makeUploadRequest(filename, mimeType, size);
          const response = await POST(request, makeParams());

          expect(response.status).toBe(400);
          const json = await response.json();
          expect(json.error).toBe("Die Datei darf maximal 5 MB groß sein");
        },
      ),
      { numRuns: 50 },
    );
  });
});
