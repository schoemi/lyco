import { prisma } from "@/lib/prisma";
import { deriveSongStatus } from "./song-service";
import { sendFreigabeNotification } from "./email-service";
import type {
  FreigabeEmpfaenger,
  GeteilteInhalte,
  SongWithProgress,
} from "../../types/song";

// ─── Song-Freigabe ───────────────────────────────────────────────

export async function createSongFreigabe(
  songId: string,
  empfaengerEmail: string,
  eigentuemerId: string
) {
  const song = await prisma.song.findUnique({ where: { id: songId } });
  if (!song) {
    throw new Error("Song nicht gefunden");
  }
  if (song.userId !== eigentuemerId) {
    throw new Error("Zugriff verweigert");
  }

  const empfaenger = await prisma.user.findUnique({
    where: { email: empfaengerEmail },
  });
  if (!empfaenger) {
    throw new Error("Nutzer nicht gefunden");
  }
  if (empfaenger.id === eigentuemerId) {
    throw new Error("Freigabe an sich selbst ist nicht möglich");
  }

  const existing = await prisma.songFreigabe.findUnique({
    where: { songId_empfaengerId: { songId, empfaengerId: empfaenger.id } },
  });
  if (existing) {
    throw new Error("Song ist bereits für diesen Nutzer freigegeben");
  }

  const freigabe = await prisma.songFreigabe.create({
    data: {
      songId,
      eigentuemerId,
      empfaengerId: empfaenger.id,
    },
  });

  // Send email notification (non-blocking, errors are logged but don't affect freigabe)
  try {
    const eigentuemer = await prisma.user.findUnique({
      where: { id: eigentuemerId },
      select: { name: true },
    });
    await sendFreigabeNotification(
      empfaengerEmail,
      eigentuemer?.name ?? "",
      song.titel,
      "song"
    );
  } catch {
    // Email errors are logged inside sendFreigabeNotification, don't block
  }

  return freigabe;
}

export async function revokeSongFreigabe(
  freigabeId: string,
  eigentuemerId: string
): Promise<void> {
  const freigabe = await prisma.songFreigabe.findUnique({
    where: { id: freigabeId },
  });
  if (!freigabe) {
    throw new Error("Freigabe nicht gefunden");
  }
  if (freigabe.eigentuemerId !== eigentuemerId) {
    throw new Error("Zugriff verweigert");
  }

  await prisma.songFreigabe.delete({ where: { id: freigabeId } });
}

export async function listSongFreigaben(
  songId: string,
  eigentuemerId: string
): Promise<FreigabeEmpfaenger[]> {
  const song = await prisma.song.findUnique({ where: { id: songId } });
  if (!song) {
    throw new Error("Song nicht gefunden");
  }
  if (song.userId !== eigentuemerId) {
    throw new Error("Zugriff verweigert");
  }

  const freigaben = await prisma.songFreigabe.findMany({
    where: { songId },
    include: {
      empfaenger: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return freigaben.map((f) => ({
    id: f.id,
    empfaenger: {
      id: f.empfaenger.id,
      name: f.empfaenger.name ?? "",
      email: f.empfaenger.email,
    },
    erstelltAm: f.createdAt.toISOString(),
  }));
}

// ─── Set-Freigabe ────────────────────────────────────────────────

export async function createSetFreigabe(
  setId: string,
  empfaengerEmail: string,
  eigentuemerId: string
) {
  const set = await prisma.set.findUnique({ where: { id: setId } });
  if (!set) {
    throw new Error("Set nicht gefunden");
  }
  if (set.userId !== eigentuemerId) {
    throw new Error("Zugriff verweigert");
  }

  const empfaenger = await prisma.user.findUnique({
    where: { email: empfaengerEmail },
  });
  if (!empfaenger) {
    throw new Error("Nutzer nicht gefunden");
  }
  if (empfaenger.id === eigentuemerId) {
    throw new Error("Freigabe an sich selbst ist nicht möglich");
  }

  const existing = await prisma.setFreigabe.findUnique({
    where: { setId_empfaengerId: { setId, empfaengerId: empfaenger.id } },
  });
  if (existing) {
    throw new Error("Set ist bereits für diesen Nutzer freigegeben");
  }

  const freigabe = await prisma.setFreigabe.create({
    data: {
      setId,
      eigentuemerId,
      empfaengerId: empfaenger.id,
    },
  });

  // Send email notification (non-blocking, errors are logged but don't affect freigabe)
  try {
    const eigentuemer = await prisma.user.findUnique({
      where: { id: eigentuemerId },
      select: { name: true },
    });
    await sendFreigabeNotification(
      empfaengerEmail,
      eigentuemer?.name ?? "",
      set.name,
      "set"
    );
  } catch {
    // Email errors are logged inside sendFreigabeNotification, don't block
  }

  return freigabe;
}

export async function revokeSetFreigabe(
  freigabeId: string,
  eigentuemerId: string
): Promise<void> {
  const freigabe = await prisma.setFreigabe.findUnique({
    where: { id: freigabeId },
  });
  if (!freigabe) {
    throw new Error("Freigabe nicht gefunden");
  }
  if (freigabe.eigentuemerId !== eigentuemerId) {
    throw new Error("Zugriff verweigert");
  }

  await prisma.setFreigabe.delete({ where: { id: freigabeId } });
}

export async function listSetFreigaben(
  setId: string,
  eigentuemerId: string
): Promise<FreigabeEmpfaenger[]> {
  const set = await prisma.set.findUnique({ where: { id: setId } });
  if (!set) {
    throw new Error("Set nicht gefunden");
  }
  if (set.userId !== eigentuemerId) {
    throw new Error("Zugriff verweigert");
  }

  const freigaben = await prisma.setFreigabe.findMany({
    where: { setId },
    include: {
      empfaenger: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return freigaben.map((f) => ({
    id: f.id,
    empfaenger: {
      id: f.empfaenger.id,
      name: f.empfaenger.name ?? "",
      email: f.empfaenger.email,
    },
    erstelltAm: f.createdAt.toISOString(),
  }));
}

// ─── Zugriffsprüfung ─────────────────────────────────────────────

export async function hatSongZugriff(
  songId: string,
  userId: string
): Promise<boolean> {
  // 1. Check ownership
  const song = await prisma.song.findUnique({
    where: { id: songId },
    select: { userId: true },
  });
  if (!song) return false;
  if (song.userId === userId) return true;

  // 2. Check direct SongFreigabe
  const directFreigabe = await prisma.songFreigabe.findUnique({
    where: { songId_empfaengerId: { songId, empfaengerId: userId } },
  });
  if (directFreigabe) return true;

  // 3. Check if song belongs to a Set that has an active SetFreigabe for this user
  const setFreigabe = await prisma.setFreigabe.findFirst({
    where: {
      empfaengerId: userId,
      set: {
        songs: {
          some: { songId },
        },
      },
    },
  });
  return !!setFreigabe;
}

export async function hatSetZugriff(
  setId: string,
  userId: string
): Promise<boolean> {
  // 1. Check ownership
  const set = await prisma.set.findUnique({
    where: { id: setId },
    select: { userId: true },
  });
  if (!set) return false;
  if (set.userId === userId) return true;

  // 2. Check direct SetFreigabe
  const directFreigabe = await prisma.setFreigabe.findUnique({
    where: { setId_empfaengerId: { setId, empfaengerId: userId } },
  });
  return !!directFreigabe;
}

// ─── Empfangene Freigaben ────────────────────────────────────────

export async function getEmpfangeneFreigaben(
  userId: string
): Promise<GeteilteInhalte> {
  // Fetch received set shares with songs and progress
  const setFreigaben = await prisma.setFreigabe.findMany({
    where: { empfaengerId: userId },
    include: {
      eigentuemer: { select: { name: true } },
      set: {
        select: {
          id: true,
          name: true,
          description: true,
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
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch received song shares (direct, not via set)
  const songFreigaben = await prisma.songFreigabe.findMany({
    where: { empfaengerId: userId },
    include: {
      eigentuemer: { select: { name: true } },
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
    orderBy: { createdAt: "desc" },
  });

  const sets = setFreigaben.map((sf) => ({
    freigabeId: sf.id,
    set: {
      id: sf.set.id,
      name: sf.set.name,
      description: sf.set.description,
    },
    eigentuemerName: sf.eigentuemer.name ?? "",
    songs: sf.set.songs.map((ss) => mapSongWithProgress(ss.song, userId)),
  }));

  const songs = songFreigaben.map((sf) => ({
    freigabeId: sf.id,
    song: mapSongWithProgress(sf.song, userId),
    eigentuemerName: sf.eigentuemer.name ?? "",
  }));

  return { sets, songs };
}

// ─── Helpers ─────────────────────────────────────────────────────

function mapSongWithProgress(
  song: {
    id: string;
    titel: string;
    kuenstler: string | null;
    sprache: string | null;
    emotionsTags: string[];
    coverUrl: string | null;
    strophen: Array<{
      fortschritte: Array<{ prozent: number }>;
    }>;
    _count: { sessions: number };
  },
  _userId: string
): SongWithProgress {
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
    kuenstler: song.kuenstler,
    sprache: song.sprache,
    emotionsTags: song.emotionsTags,
    coverUrl: song.coverUrl ?? null,
    progress,
    sessionCount: song._count.sessions,
    status: deriveSongStatus(progress),
  };
}
