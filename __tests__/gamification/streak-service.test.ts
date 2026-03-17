import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    streak: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { getStreak, updateStreak } from "@/lib/services/streak-service";

const mockPrisma = vi.mocked(prisma);

describe("streak-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Helper: create a date at midnight
  const day = (y: number, m: number, d: number) => new Date(y, m - 1, d);

  describe("getStreak", () => {
    it("returns 0 when no streak record exists", async () => {
      mockPrisma.streak.findUnique.mockResolvedValue(null);
      const result = await getStreak("user-1");
      expect(result).toBe(0);
    });

    it("returns 0 when lastSessionDate is null", async () => {
      mockPrisma.streak.findUnique.mockResolvedValue({
        id: "s1",
        userId: "user-1",
        currentStreak: 5,
        lastSessionDate: null,
        updatedAt: new Date(),
      } as any);
      const result = await getStreak("user-1");
      expect(result).toBe(0);
    });

    it("returns 0 when streak has expired (lastSessionDate > 1 day ago)", async () => {
      vi.setSystemTime(day(2025, 6, 15));
      mockPrisma.streak.findUnique.mockResolvedValue({
        id: "s1",
        userId: "user-1",
        currentStreak: 10,
        lastSessionDate: day(2025, 6, 13), // 2 days ago
        updatedAt: new Date(),
      } as any);
      const result = await getStreak("user-1");
      expect(result).toBe(0);
    });

    it("returns currentStreak when lastSessionDate is today", async () => {
      vi.setSystemTime(day(2025, 6, 15));
      mockPrisma.streak.findUnique.mockResolvedValue({
        id: "s1",
        userId: "user-1",
        currentStreak: 7,
        lastSessionDate: day(2025, 6, 15), // today
        updatedAt: new Date(),
      } as any);
      const result = await getStreak("user-1");
      expect(result).toBe(7);
    });

    it("returns currentStreak when lastSessionDate is yesterday", async () => {
      vi.setSystemTime(day(2025, 6, 15));
      mockPrisma.streak.findUnique.mockResolvedValue({
        id: "s1",
        userId: "user-1",
        currentStreak: 3,
        lastSessionDate: day(2025, 6, 14), // yesterday
        updatedAt: new Date(),
      } as any);
      const result = await getStreak("user-1");
      expect(result).toBe(3);
    });
  });

  describe("updateStreak", () => {
    it("creates new streak record when none exists (upsert create path)", async () => {
      vi.setSystemTime(day(2025, 6, 15));
      mockPrisma.streak.findUnique.mockResolvedValue(null);
      mockPrisma.streak.upsert.mockResolvedValue({} as any);

      const result = await updateStreak("user-1");

      expect(result.streak).toBe(1);
      expect(result.lastSessionDate).toEqual(expect.any(Date));
      expect(mockPrisma.streak.upsert).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        update: {
          currentStreak: 1,
          lastSessionDate: expect.any(Date),
        },
        create: {
          userId: "user-1",
          currentStreak: 1,
          lastSessionDate: expect.any(Date),
        },
      });
    });

    it("updates existing streak record (upsert update path)", async () => {
      vi.setSystemTime(day(2025, 6, 15));
      mockPrisma.streak.findUnique.mockResolvedValue({
        id: "s1",
        userId: "user-1",
        currentStreak: 4,
        lastSessionDate: day(2025, 6, 14), // yesterday
        updatedAt: new Date(),
      } as any);
      mockPrisma.streak.upsert.mockResolvedValue({} as any);

      const result = await updateStreak("user-1");

      expect(result.streak).toBe(5); // 4 + 1
      expect(mockPrisma.streak.upsert).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        update: {
          currentStreak: 5,
          lastSessionDate: expect.any(Date),
        },
        create: {
          userId: "user-1",
          currentStreak: 5,
          lastSessionDate: expect.any(Date),
        },
      });
    });

    it("uses transaction client when provided", async () => {
      vi.setSystemTime(day(2025, 6, 15));

      const txStreak = {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue({} as any),
      };
      const tx = { streak: txStreak } as any;

      const result = await updateStreak("user-1", tx);

      expect(result.streak).toBe(1);
      // Transaction client was used, not the global prisma
      expect(txStreak.findUnique).toHaveBeenCalledWith({ where: { userId: "user-1" } });
      expect(txStreak.upsert).toHaveBeenCalled();
      // Global prisma should NOT have been called
      expect(mockPrisma.streak.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.streak.upsert).not.toHaveBeenCalled();
    });

    it("returns correct StreakResult shape", async () => {
      vi.setSystemTime(day(2025, 6, 15));
      mockPrisma.streak.findUnique.mockResolvedValue({
        id: "s1",
        userId: "user-1",
        currentStreak: 2,
        lastSessionDate: day(2025, 6, 15), // same day
        updatedAt: new Date(),
      } as any);
      mockPrisma.streak.upsert.mockResolvedValue({} as any);

      const result = await updateStreak("user-1");

      // Same day → streak unchanged
      expect(result).toEqual({
        streak: 2,
        lastSessionDate: day(2025, 6, 15),
      });
      expect(typeof result.streak).toBe("number");
      expect(result.lastSessionDate).toBeInstanceOf(Date);
    });
  });
});
