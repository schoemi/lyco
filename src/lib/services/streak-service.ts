/**
 * Streak-Service: Liest und aktualisiert den Streak-Datensatz eines Nutzers.
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 11.2, 11.3
 */

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { berechneStreak, type StreakResult } from "@/lib/gamification/streak";

type PrismaTransaction = Prisma.TransactionClient;

/**
 * Liest den aktuellen Streak-Wert für einen Nutzer.
 * Gibt 0 zurück wenn kein Datensatz existiert oder der Streak verfallen ist.
 */
export async function getStreak(userId: string): Promise<number> {
  const streak = await prisma.streak.findUnique({
    where: { userId },
  });

  if (!streak) return 0;
  if (!streak.lastSessionDate) return 0;

  const now = new Date();
  const last = streak.lastSessionDate;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate());
  const msPerDay = 86_400_000;
  const diffDays = Math.round((today.getTime() - lastDay.getTime()) / msPerDay);

  if (diffDays > 1) return 0;

  return streak.currentStreak;
}

/**
 * Aktualisiert den Streak nach Session-Abschluss.
 * Kann innerhalb einer Transaktion (tx) oder standalone aufgerufen werden.
 */
export async function updateStreak(
  userId: string,
  tx?: PrismaTransaction
): Promise<StreakResult> {
  const db = tx ?? prisma;

  const existing = await db.streak.findUnique({
    where: { userId },
  });

  const today = new Date();
  const result = berechneStreak({
    currentStreak: existing?.currentStreak ?? 0,
    lastSessionDate: existing?.lastSessionDate ?? null,
    today,
  });

  await db.streak.upsert({
    where: { userId },
    update: {
      currentStreak: result.streak,
      lastSessionDate: result.lastSessionDate,
    },
    create: {
      userId,
      currentStreak: result.streak,
      lastSessionDate: result.lastSessionDate,
    },
  });

  return result;
}
