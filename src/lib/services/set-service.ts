import { prisma } from "@/lib/prisma";
import type {
  CreateSetInput,
  UpdateSetInput,
  ReorderSetSongItem,
  SetWithSongCount,
  SetDetail,
  SetSongWithProgress,
} from "../../types/song";
import { deriveSongStatus } from "./song-service";

function validateSetInput(input: { name: string; description?: string }): void {
  if (!input.name || !input.name.trim()) {
    throw new Error("Name ist erforderlich");
  }
  if (input.name.trim().length > 100) {
    throw new Error("Name darf maximal 100 Zeichen lang sein");
  }
  if (input.description !== undefined && input.description !== null && input.description.length > 500) {
    throw new Error("Beschreibung darf maximal 500 Zeichen lang sein");
  }
}

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
      description: set.description ?? null,
      songCount: set._count.songs,
      lastActivity,
      createdAt: set.createdAt.toISOString(),
    });
  }

  return result;
}

export async function createSet(userId: string, input: CreateSetInput) {
  validateSetInput(input);

  return prisma.set.create({
    data: {
      name: input.name.trim(),
      description: input.description ?? null,
      userId,
    },
  });
}

export async function updateSet(userId: string, setId: string, input: UpdateSetInput) {
  validateSetInput(input);

  const set = await prisma.set.findUnique({ where: { id: setId } });
  if (!set) {
    throw new Error("Set nicht gefunden");
  }
  if (set.userId !== userId) {
    throw new Error("Zugriff verweigert");
  }

  return prisma.set.update({
    where: { id: setId },
    data: {
      name: input.name.trim(),
      description: input.description ?? null,
    },
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
    // Determine the next orderIndex (highest existing + 1)
    const maxOrder = await prisma.setSong.aggregate({
      where: { setId },
      _max: { orderIndex: true },
    });
    const nextOrderIndex = (maxOrder._max.orderIndex ?? -1) + 1;

    await prisma.setSong.create({
      data: { setId, songId, orderIndex: nextOrderIndex },
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

export async function getSetDetail(userId: string, setId: string): Promise<SetDetail> {
  const set = await prisma.set.findUnique({
    where: { id: setId },
    include: {
      songs: {
        orderBy: { orderIndex: "asc" },
        include: {
          song: {
            include: {
              strophen: {
                include: {
                  fortschritte: {
                    where: { userId },
                  },
                },
              },
              _count: { select: { sessions: { where: { userId } } } },
            },
          },
        },
      },
    },
  });

  if (!set) {
    throw new Error("Set nicht gefunden");
  }
  if (set.userId !== userId) {
    throw new Error("Zugriff verweigert");
  }

  const songs: SetSongWithProgress[] = set.songs.map((ss) => {
    const song = ss.song;
    const strophenCount = song.strophen.length;
    let progress = 0;
    if (strophenCount > 0) {
      const totalProgress = song.strophen.reduce((sum, s) => {
        const fort = s.fortschritte[0];
        return sum + (fort ? fort.prozent : 0);
      }, 0);
      progress = Math.round(totalProgress / strophenCount);
    }

    return {
      id: song.id,
      titel: song.titel,
      kuenstler: song.kuenstler ?? null,
      sprache: song.sprache ?? null,
      coverUrl: song.coverUrl ?? null,
      progress,
      sessionCount: song._count.sessions,
      status: deriveSongStatus(progress),
      orderIndex: ss.orderIndex,
    };
  });

  return {
    id: set.id,
    name: set.name,
    description: set.description ?? null,
    songCount: songs.length,
    songs,
  };
}

export async function reorderSetSongs(
  userId: string,
  setId: string,
  items: ReorderSetSongItem[]
): Promise<void> {
  const set = await prisma.set.findUnique({ where: { id: setId } });
  if (!set) {
    throw new Error("Set nicht gefunden");
  }
  if (set.userId !== userId) {
    throw new Error("Zugriff verweigert");
  }

  await prisma.$transaction(
    items.map((item) =>
      prisma.setSong.updateMany({
        where: { setId, songId: item.songId },
        data: { orderIndex: item.orderIndex },
      })
    )
  );
}
