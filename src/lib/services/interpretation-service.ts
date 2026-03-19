import { prisma } from "@/lib/prisma";
import type { Interpretation } from "@/generated/prisma/client";
import { hatSongZugriff } from "@/lib/services/freigabe-service";

export async function upsertInterpretation(
  userId: string,
  stropheId: string,
  text: string
): Promise<Interpretation> {
  if (!text || !text.trim()) {
    throw new Error("Interpretationstext ist erforderlich");
  }

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

  return prisma.interpretation.upsert({
    where: {
      userId_stropheId: { userId, stropheId },
    },
    update: { text: text.trim() },
    create: { userId, stropheId, text: text.trim() },
  });
}

export async function deleteInterpretation(
  userId: string,
  interpretationId: string
): Promise<void> {
  const interpretation = await prisma.interpretation.findUnique({
    where: { id: interpretationId },
  });
  if (!interpretation) {
    throw new Error("Interpretation nicht gefunden");
  }
  if (interpretation.userId !== userId) {
    throw new Error("Zugriff verweigert");
  }

  await prisma.interpretation.delete({ where: { id: interpretationId } });
}

export async function getInterpretationsForSong(
  userId: string,
  songId: string
): Promise<Interpretation[]> {
  const song = await prisma.song.findUnique({ where: { id: songId } });
  if (!song) {
    throw new Error("Song nicht gefunden");
  }
  const hasAccess = await hatSongZugriff(songId, userId);
  if (!hasAccess) {
    throw new Error("Zugriff verweigert");
  }

  return prisma.interpretation.findMany({
    where: {
      userId,
      strophe: { songId },
    },
    orderBy: { updatedAt: "desc" },
  });
}
