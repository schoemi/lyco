import { prisma } from "@/lib/prisma";
import { Lernmethode } from "@/generated/prisma/client";
import type { Session } from "@/generated/prisma/client";

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
