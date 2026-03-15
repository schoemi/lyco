import { prisma } from "@/lib/prisma";
import type { Notiz } from "@/generated/prisma/client";

export async function upsertNote(
  userId: string,
  stropheId: string,
  text: string
): Promise<Notiz> {
  if (!text || !text.trim()) {
    throw new Error("Notiztext ist erforderlich");
  }

  const strophe = await prisma.strophe.findUnique({
    where: { id: stropheId },
    include: { song: true },
  });
  if (!strophe) {
    throw new Error("Strophe nicht gefunden");
  }
  if (strophe.song.userId !== userId) {
    throw new Error("Zugriff verweigert");
  }

  return prisma.notiz.upsert({
    where: {
      userId_stropheId: { userId, stropheId },
    },
    update: { text: text.trim() },
    create: { userId, stropheId, text: text.trim() },
  });
}

export async function deleteNote(
  userId: string,
  noteId: string
): Promise<void> {
  const notiz = await prisma.notiz.findUnique({ where: { id: noteId } });
  if (!notiz) {
    throw new Error("Notiz nicht gefunden");
  }
  if (notiz.userId !== userId) {
    throw new Error("Zugriff verweigert");
  }

  await prisma.notiz.delete({ where: { id: noteId } });
}

export async function getNotesForSong(
  userId: string,
  songId: string
): Promise<Notiz[]> {
  const song = await prisma.song.findUnique({ where: { id: songId } });
  if (!song) {
    throw new Error("Song nicht gefunden");
  }
  if (song.userId !== userId) {
    throw new Error("Zugriff verweigert");
  }

  return prisma.notiz.findMany({
    where: {
      userId,
      strophe: { songId },
    },
    orderBy: { updatedAt: "desc" },
  });
}
