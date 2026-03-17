import { prisma } from "@/lib/prisma";
import { Lernmethode } from "@/generated/prisma/client";
import type { Session } from "@/generated/prisma/client";
import { updateStreak } from "@/lib/services/streak-service";

export interface SessionCreateResult {
  session: Session;
  streak: number;
}

const VALID_LERNMETHODEN = Object.values(Lernmethode);

export async function createSession(
  userId: string,
  songId: string,
  lernmethode: Lernmethode
): Promise<Session> {
  if (!VALID_LERNMETHODEN.includes(lernmethode)) {
    throw new Error("Ungültige Lernmethode");
  }

  const song = await prisma.song.findUnique({ where: { id: songId } });
  if (!song) {
    throw new Error("Song nicht gefunden");
  }
  if (song.userId !== userId) {
    throw new Error("Zugriff verweigert");
  }

  return prisma.session.create({
    data: {
      userId,
      songId,
      lernmethode,
    },
  });
}

export async function getSessionCount(
  userId: string,
  songId: string
): Promise<number> {
  return prisma.session.count({
    where: { userId, songId },
  });
}

export async function getTotalSessionCount(userId: string): Promise<number> {
  return prisma.session.count({
    where: { userId },
  });
}

/**
 * Erstellt eine Session und aktualisiert den Streak in derselben Transaktion.
 * Bei Streak-Fehler wird der Fehler geloggt, die Session aber trotzdem erstellt.
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */
export async function createSessionWithStreak(
  userId: string,
  songId: string,
  lernmethode: Lernmethode
): Promise<SessionCreateResult> {
  if (!VALID_LERNMETHODEN.includes(lernmethode)) {
    throw new Error("Ungültige Lernmethode");
  }

  const song = await prisma.song.findUnique({ where: { id: songId } });
  if (!song) {
    throw new Error("Song nicht gefunden");
  }
  if (song.userId !== userId) {
    throw new Error("Zugriff verweigert");
  }

  return prisma.$transaction(async (tx) => {
    const session = await tx.session.create({
      data: {
        userId,
        songId,
        lernmethode,
      },
    });

    let streak = 0;
    try {
      const result = await updateStreak(userId, tx);
      streak = result.streak;
    } catch (error) {
      console.error("Streak-Aktualisierung fehlgeschlagen:", error);
    }

    return { session, streak };
  });
}
