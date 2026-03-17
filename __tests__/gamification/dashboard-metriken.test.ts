/**
 * Unit-Tests: Dashboard-Metriken
 *
 * Teste dass die Dashboard-API korrekte Metriken liefert:
 * activeSongCount, totalSessions, averageProgress, streak
 *
 * **Validates: Requirements 9.1, 9.2, 9.3, 9.4**
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Hoisted mocks ---
const {
  mockAuth,
  mockListSongs,
  mockGetAverageProgress,
  mockGetTotalSessionCount,
  mockSetFindMany,
  mockGetFaelligeAnzahl,
  mockGetStreak,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockListSongs: vi.fn(),
  mockGetAverageProgress: vi.fn(),
  mockGetTotalSessionCount: vi.fn(),
  mockSetFindMany: vi.fn(),
  mockGetFaelligeAnzahl: vi.fn(),
  mockGetStreak: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/services/song-service", () => ({ listSongs: mockListSongs }));
vi.mock("@/lib/services/progress-service", () => ({ getAverageProgress: mockGetAverageProgress }));
vi.mock("@/lib/services/session-service", () => ({ getTotalSessionCount: mockGetTotalSessionCount }));
vi.mock("@/lib/services/spaced-repetition-service", () => ({ getFaelligeAnzahl: mockGetFaelligeAnzahl }));
vi.mock("@/lib/services/streak-service", () => ({ getStreak: mockGetStreak }));
vi.mock("@/lib/prisma", () => ({
  prisma: { set: { findMany: mockSetFindMany } },
}));

import { GET as dashboardGET } from "@/app/api/dashboard/route";
import type { DashboardData, SongWithProgress } from "../../src/types/song";

// --- Helpers ---

function makeSong(overrides: Partial<SongWithProgress> & { id: string }): SongWithProgress {
  return {
    titel: "Test Song",
    kuenstler: null,
    sprache: null,
    emotionsTags: [],
    progress: 0,
    sessionCount: 0,
    status: "neu",
    ...overrides,
  };
}

function setupMocks(songs: SongWithProgress[], opts: { avgProgress?: number; totalSessions?: number; streak?: number } = {}) {
  mockAuth.mockResolvedValue({ user: { id: "user-1", email: "test@example.com" } });
  mockListSongs.mockResolvedValue(songs);
  mockSetFindMany.mockResolvedValue([]);
  mockGetAverageProgress.mockResolvedValue(opts.avgProgress ?? 0);
  mockGetTotalSessionCount.mockResolvedValue(opts.totalSessions ?? 0);
  mockGetFaelligeAnzahl.mockResolvedValue(0);
  mockGetStreak.mockResolvedValue(opts.streak ?? 0);
}

describe("Dashboard-Metriken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("activeSongCount equals the number of songs with sessionCount > 0", async () => {
    const songs: SongWithProgress[] = [
      makeSong({ id: "s1", sessionCount: 3, progress: 50, status: "aktiv" }),
      makeSong({ id: "s2", sessionCount: 0, progress: 0, status: "neu" }),
      makeSong({ id: "s3", sessionCount: 1, progress: 10, status: "aktiv" }),
    ];
    setupMocks(songs);

    const res = await dashboardGET();
    const data: DashboardData = await res.json();

    expect(data.activeSongCount).toBe(2);
  });

  it("totalSessions matches the value from getTotalSessionCount", async () => {
    setupMocks([], { totalSessions: 42 });

    const res = await dashboardGET();
    const data: DashboardData = await res.json();

    expect(data.totalSessions).toBe(42);
  });

  it("averageProgress matches the value from getAverageProgress", async () => {
    setupMocks([], { avgProgress: 73 });

    const res = await dashboardGET();
    const data: DashboardData = await res.json();

    expect(data.averageProgress).toBe(73);
  });

  it("streak matches the value from getStreak", async () => {
    setupMocks([], { streak: 5 });

    const res = await dashboardGET();
    const data: DashboardData = await res.json();

    expect(data.streak).toBe(5);
  });

  it("activeSongCount is 0 when all songs have sessionCount 0", async () => {
    const songs: SongWithProgress[] = [
      makeSong({ id: "s1", sessionCount: 0 }),
      makeSong({ id: "s2", sessionCount: 0 }),
    ];
    setupMocks(songs);

    const res = await dashboardGET();
    const data: DashboardData = await res.json();

    expect(data.activeSongCount).toBe(0);
  });

  it("response includes all required DashboardData fields", async () => {
    const songs: SongWithProgress[] = [
      makeSong({ id: "s1", sessionCount: 2, progress: 80, status: "aktiv" }),
    ];
    setupMocks(songs, { avgProgress: 80, totalSessions: 10, streak: 3 });

    const res = await dashboardGET();
    expect(res.status).toBe(200);

    const data: DashboardData = await res.json();

    expect(data).toHaveProperty("sets");
    expect(data).toHaveProperty("allSongs");
    expect(data).toHaveProperty("totalSongs");
    expect(data).toHaveProperty("totalSessions");
    expect(data).toHaveProperty("averageProgress");
    expect(data).toHaveProperty("faelligeStrophenAnzahl");
    expect(data).toHaveProperty("streak");
    expect(data).toHaveProperty("activeSongCount");
  });
});
