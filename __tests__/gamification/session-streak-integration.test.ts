import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    song: {
      findUnique: vi.fn(),
    },
    session: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock streak-service
const mockUpdateStreak = vi.fn();
vi.mock("@/lib/services/streak-service", () => ({
  updateStreak: (...args: unknown[]) => mockUpdateStreak(...args),
}));

import { prisma } from "@/lib/prisma";
import { createSessionWithStreak } from "@/lib/services/session-service";

const mockPrisma = vi.mocked(prisma);

const USER_ID = "user-1";
const SONG_ID = "song-1";
const LERNMETHODE = "LUECKENTEXT" as any;

const mockSong = {
  id: SONG_ID,
  userId: USER_ID,
  titel: "Test Song",
  kuenstler: "Test Artist",
};

const mockSession = {
  id: "session-1",
  userId: USER_ID,
  songId: SONG_ID,
  lernmethode: LERNMETHODE,
  createdAt: new Date(),
};

describe("session-streak-integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: song exists and belongs to user
    mockPrisma.song.findUnique.mockResolvedValue(mockSong as any);

    // Default: $transaction executes the callback with a tx client
    mockPrisma.$transaction.mockImplementation(async (cb: any) => {
      const txClient = {
        session: {
          create: vi.fn().mockResolvedValue(mockSession),
        },
        streak: {
          findUnique: vi.fn(),
          upsert: vi.fn(),
        },
      };
      return cb(txClient);
    });

    // Default: streak update succeeds
    mockUpdateStreak.mockResolvedValue({ streak: 3, lastSessionDate: new Date() });
  });

  // Requirement 10.1, 10.4: Session and streak updated in same transaction
  it("creates session and updates streak in same transaction, returns both", async () => {
    const result = await createSessionWithStreak(USER_ID, SONG_ID, LERNMETHODE);

    expect(result.session).toBeDefined();
    expect(result.streak).toBe(3);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    // updateStreak is called with userId and the tx client
    expect(mockUpdateStreak).toHaveBeenCalledWith(USER_ID, expect.anything());
  });

  // Requirement 10.2: Returns streak value from updateStreak result
  it("returns streak value from updateStreak result", async () => {
    mockUpdateStreak.mockResolvedValue({ streak: 7, lastSessionDate: new Date() });

    const result = await createSessionWithStreak(USER_ID, SONG_ID, LERNMETHODE);

    expect(result.streak).toBe(7);
  });

  // Requirement 10.3: Streak failure does not prevent session creation
  it("when streak update fails, session is still created and streak defaults to 0", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockUpdateStreak.mockRejectedValue(new Error("Streak DB error"));

    const result = await createSessionWithStreak(USER_ID, SONG_ID, LERNMETHODE);

    expect(result.session).toBeDefined();
    expect(result.streak).toBe(0);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  // Validates song ownership before creating session
  it("throws 'Zugriff verweigert' when song belongs to another user", async () => {
    mockPrisma.song.findUnique.mockResolvedValue({
      ...mockSong,
      userId: "other-user",
    } as any);

    await expect(
      createSessionWithStreak(USER_ID, SONG_ID, LERNMETHODE)
    ).rejects.toThrow("Zugriff verweigert");
  });

  // Throws when song doesn't exist
  it("throws 'Song nicht gefunden' when song doesn't exist", async () => {
    mockPrisma.song.findUnique.mockResolvedValue(null);

    await expect(
      createSessionWithStreak(USER_ID, SONG_ID, LERNMETHODE)
    ).rejects.toThrow("Song nicht gefunden");
  });

  // Throws for invalid method
  it("throws 'Ungültige Lernmethode' for invalid method", async () => {
    await expect(
      createSessionWithStreak(USER_ID, SONG_ID, "INVALID_METHOD" as any)
    ).rejects.toThrow("Ungültige Lernmethode");
  });
});
