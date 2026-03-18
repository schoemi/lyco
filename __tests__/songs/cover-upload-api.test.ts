/**
 * Unit-Tests für Cover-Upload-Endpunkt
 *
 * Testen: Auth-Fehler (401), Song nicht gefunden (404), fremder Song (403),
 * ungültiges Format (400), zu große Datei (400), erfolgreicher Upload (200)
 *
 * Anforderungen: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
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

const TEST_USER_ID = "user-123";
const OTHER_USER_ID = "user-456";
const TEST_SONG_ID = "song-abc";

function makeParams(): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id: TEST_SONG_ID }) };
}

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

describe("Cover-Upload API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Anforderung 2.6: Auth-Fehler (401) ---
  it("returns 401 when user is not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = makeUploadRequest("cover.jpg", "image/jpeg", 100);
    const response = await POST(request, makeParams());

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toBe("Nicht authentifiziert");
  });

  // --- Song nicht gefunden (404) ---
  it("returns 404 when song does not exist", async () => {
    mockAuth.mockResolvedValue({
      user: { id: TEST_USER_ID, email: "test@example.com" },
    });
    (mockPrisma.song.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const request = makeUploadRequest("cover.jpg", "image/jpeg", 100);
    const response = await POST(request, makeParams());

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.error).toBe("Song nicht gefunden");
  });

  // --- Fremder Song (403) ---
  it("returns 403 when song belongs to another user", async () => {
    mockAuth.mockResolvedValue({
      user: { id: TEST_USER_ID, email: "test@example.com" },
    });
    (mockPrisma.song.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: TEST_SONG_ID,
      userId: OTHER_USER_ID,
    });

    const request = makeUploadRequest("cover.jpg", "image/jpeg", 100);
    const response = await POST(request, makeParams());

    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error).toBe("Zugriff verweigert");
  });

  // --- Anforderung 2.2, 2.4: Ungültiges Format (400) ---
  it("returns 400 for invalid file format (gif)", async () => {
    mockAuth.mockResolvedValue({
      user: { id: TEST_USER_ID, email: "test@example.com" },
    });
    (mockPrisma.song.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: TEST_SONG_ID,
      userId: TEST_USER_ID,
    });

    const request = makeUploadRequest("image.gif", "image/gif", 100);
    const response = await POST(request, makeParams());

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("Nur JPEG, PNG und WebP Dateien sind erlaubt");
  });

  // --- Anforderung 2.3, 2.5: Zu große Datei (400) ---
  it("returns 400 when file exceeds 5 MB", async () => {
    mockAuth.mockResolvedValue({
      user: { id: TEST_USER_ID, email: "test@example.com" },
    });
    (mockPrisma.song.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: TEST_SONG_ID,
      userId: TEST_USER_ID,
    });

    const oversize = 5 * 1024 * 1024 + 1;
    const request = makeUploadRequest("cover.jpg", "image/jpeg", oversize);
    const response = await POST(request, makeParams());

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("Die Datei darf maximal 5 MB groß sein");
  });

  // --- Anforderung 2.1: Erfolgreicher Upload (200) ---
  it("returns 200 with coverUrl on successful upload", async () => {
    mockAuth.mockResolvedValue({
      user: { id: TEST_USER_ID, email: "test@example.com" },
    });
    (mockPrisma.song.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: TEST_SONG_ID,
      userId: TEST_USER_ID,
    });
    (mockPrisma.song.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: TEST_SONG_ID,
      coverUrl: "/api/uploads/covers/mock.jpg",
    });

    const request = makeUploadRequest("cover.jpg", "image/jpeg", 100);
    const response = await POST(request, makeParams());

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.coverUrl).toMatch(/^\/api\/uploads\/covers\/.+\.jpg$/);

    // Verify prisma.song.update was called with the song ID and a coverUrl
    expect(mockPrisma.song.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TEST_SONG_ID },
        data: { coverUrl: expect.stringMatching(/^\/api\/uploads\/covers\//) },
      }),
    );
  });
});
