import { prisma } from "@/lib/prisma";
import type { Fortschritt } from "@/generated/prisma/client";
import type { StropheProgress } from "../../types/song";
import { hatSongZugriff } from "@/lib/services/freigabe-service";

export async function updateProgress(
  userId: string,
  stropheId: string,
  prozent: number
): Promise<Fortschritt> {
  const strophe = await prisma.strophe.findUnique({
    where: { id: stropheId },
    include: { song: true },
  });
  if (!strophe) {
    throw new Error("Strophe nicht gefunden");
  }
  const hasAccess = await hatSongZugriff(strophe.song.id, userId);
  if (!hasAccess) {
    throw new Error("Zugriff verweigert");
  }

  const clamped = Math.max(0, Math.min(100, Math.round(prozent)));

  return prisma.fortschritt.upsert({
    where: {
      userId_stropheId: { userId, stropheId },
    },
    update: { prozent: clamped },
    create: { userId, stropheId, prozent: clamped },
  });
}

export async function getSongProgress(
  userId: string,
  songId: string
): Promise<StropheProgress[]> {
  const song = await prisma.song.findUnique({ where: { id: songId } });
  if (!song) {
    throw new Error("Song nicht gefunden");
  }
  const hasAccess = await hatSongZugriff(songId, userId);
  if (!hasAccess) {
    throw new Error("Zugriff verweigert");
  }

  const strophen = await prisma.strophe.findMany({
    where: { songId },
    orderBy: { orderIndex: "asc" },
    include: {
      fortschritte: {
        where: { userId },
      },
    },
  });

  return strophen.map((s) => ({
    stropheId: s.id,
    stropheName: s.name,
    prozent: s.fortschritte[0]?.prozent ?? 0,
  }));
}

export async function getOverallSongProgress(
  userId: string,
  songId: string
): Promise<number> {
  const stropheProgresses = await getSongProgress(userId, songId);
  if (stropheProgresses.length === 0) return 0;

  const total = stropheProgresses.reduce((sum, s) => sum + s.prozent, 0);
  return Math.round(total / stropheProgresses.length);
}

export async function getAverageProgress(userId: string): Promise<number> {
  const songs = await prisma.song.findMany({
    where: { userId },
    select: { id: true },
  });

  if (songs.length === 0) return 0;

  let totalProgress = 0;
  for (const song of songs) {
    totalProgress += await getOverallSongProgress(userId, song.id);
  }

  return Math.round(totalProgress / songs.length);
}
