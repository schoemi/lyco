import { prisma } from "@/lib/prisma";
import type { SetWithSongCount } from "../../types/song";

export async function listSets(userId: string): Promise<SetWithSongCount[]> {
  const sets = await prisma.set.findMany({
    where: { userId },
    include: {
      _count: { select: { songs: true } },
      songs: {
        select: { createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // For each set, also check the most recent session on any song in the set
  const result: SetWithSongCount[] = [];

  for (const set of sets) {
    // Find the most recent session for songs in this set
    const latestSession = await prisma.session.findFirst({
      where: {
        song: {
          sets: {
            some: { setId: set.id },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    const lastSetSongDate = set.songs[0]?.createdAt ?? null;
    const lastSessionDate = latestSession?.createdAt ?? null;

    let lastActivity: string | null = null;
    if (lastSetSongDate && lastSessionDate) {
      lastActivity =
        lastSetSongDate > lastSessionDate
          ? lastSetSongDate.toISOString()
          : lastSessionDate.toISOString();
    } else if (lastSetSongDate) {
      lastActivity = lastSetSongDate.toISOString();
    } else if (lastSessionDate) {
      lastActivity = lastSessionDate.toISOString();
    }

    result.push({
      id: set.id,
      name: set.name,
      songCount: set._count.songs,
      lastActivity,
      createdAt: set.createdAt.toISOString(),
    });
  }

  return result;
}

export async function createSet(userId: string, name: string) {
  if (!name || !name.trim()) {
    throw new Error("Name ist erforderlich");
  }

  return prisma.set.create({
    data: {
      name: name.trim(),
      userId,
    },
  });
}

export async function updateSet(userId: string, setId: string, name: string) {
  if (!name || !name.trim()) {
    throw new Error("Name ist erforderlich");
  }

  const set = await prisma.set.findUnique({ where: { id: setId } });
  if (!set) {
    throw new Error("Set nicht gefunden");
  }
  if (set.userId !== userId) {
    throw new Error("Zugriff verweigert");
  }

  return prisma.set.update({
    where: { id: setId },
    data: { name: name.trim() },
  });
}

export async function deleteSet(userId: string, setId: string): Promise<void> {
  const set = await prisma.set.findUnique({ where: { id: setId } });
  if (!set) {
    throw new Error("Set nicht gefunden");
  }
  if (set.userId !== userId) {
    throw new Error("Zugriff verweigert");
  }

  await prisma.set.delete({ where: { id: setId } });
}

export async function addSongToSet(
  userId: string,
  setId: string,
  songId: string
): Promise<void> {
  const set = await prisma.set.findUnique({ where: { id: setId } });
  if (!set) {
    throw new Error("Set nicht gefunden");
  }
  if (set.userId !== userId) {
    throw new Error("Zugriff verweigert");
  }

  try {
    await prisma.setSong.create({
      data: { setId, songId },
    });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      throw new Error("Song ist bereits im Set");
    }
    throw error;
  }
}

export async function removeSongFromSet(
  userId: string,
  setId: string,
  songId: string
): Promise<void> {
  const set = await prisma.set.findUnique({ where: { id: setId } });
  if (!set) {
    throw new Error("Set nicht gefunden");
  }
  if (set.userId !== userId) {
    throw new Error("Zugriff verweigert");
  }

  await prisma.setSong.deleteMany({
    where: { setId, songId },
  });
}
