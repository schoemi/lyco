import { prisma } from "@/lib/prisma";
import type {
  CreateSongInput,
  UpdateSongInput,
  ImportSongInput,
  SongWithProgress,
  SongDetail,
  StropheDetail,
  ZeileDetail,
  MarkupResponse,
} from "../../types/song";
import type { Song } from "@/generated/prisma/client";

export function deriveSongStatus(
  progress: number
): "neu" | "aktiv" | "gelernt" {
  if (progress === 0) return "neu";
  if (progress === 100) return "gelernt";
  return "aktiv";
}

export async function listSongs(userId: string): Promise<SongWithProgress[]> {
  const songs = await prisma.song.findMany({
    where: { userId },
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
    orderBy: { updatedAt: "desc" },
  });

  return songs.map((song) => {
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
  });
}

export async function createSong(
  userId: string,
  data: CreateSongInput
): Promise<Song> {
  if (!data.titel || !data.titel.trim()) {
    throw new Error("Titel ist erforderlich");
  }

  return prisma.song.create({
    data: {
      titel: data.titel.trim(),
      kuenstler: data.kuenstler ?? null,
      sprache: data.sprache ?? null,
      emotionsTags: data.emotionsTags ?? [],
      userId,
    },
  });
}

export async function importSong(
  userId: string,
  data: ImportSongInput
): Promise<SongDetail> {
  if (!data.titel || !data.titel.trim()) {
    throw new Error("Titel ist erforderlich");
  }
  if (!data.strophen || data.strophen.length === 0) {
    throw new Error("Mindestens eine Strophe erforderlich");
  }
  for (const strophe of data.strophen) {
    if (!strophe.zeilen || strophe.zeilen.length === 0) {
      throw new Error("Jede Strophe muss mindestens eine Zeile enthalten");
    }
  }

  const song = await prisma.$transaction(async (tx) => {
    const createdSong = await tx.song.create({
      data: {
        titel: data.titel.trim(),
        kuenstler: data.kuenstler ?? null,
        sprache: data.sprache ?? null,
        emotionsTags: data.emotionsTags ?? [],
        coverUrl: data.coverUrl ?? null,
        userId,
      },
    });

    for (let si = 0; si < data.strophen.length; si++) {
      const stropheInput = data.strophen[si];
      const createdStrophe = await tx.strophe.create({
        data: {
          name: stropheInput.name,
          orderIndex: si,
          songId: createdSong.id,
        },
      });

      // Strophe-level markups (ziel=STROPHE)
      if (stropheInput.markups && stropheInput.markups.length > 0) {
        for (const markup of stropheInput.markups) {
          await tx.markup.create({
            data: {
              typ: markup.typ,
              ziel: markup.ziel,
              wert: markup.wert ?? null,
              timecodeMs: markup.timecodeMs ?? null,
              wortIndex: markup.wortIndex ?? null,
              stropheId: createdStrophe.id,
              zeileId: null,
            },
          });
        }
      }

      for (let zi = 0; zi < stropheInput.zeilen.length; zi++) {
        const zeileInput = stropheInput.zeilen[zi];
        const createdZeile = await tx.zeile.create({
          data: {
            text: zeileInput.text,
            uebersetzung: zeileInput.uebersetzung ?? null,
            orderIndex: zi,
            stropheId: createdStrophe.id,
          },
        });

        // Zeile-level markups (ziel=ZEILE or WORT)
        if (zeileInput.markups && zeileInput.markups.length > 0) {
          for (const markup of zeileInput.markups) {
            await tx.markup.create({
              data: {
                typ: markup.typ,
                ziel: markup.ziel,
                wert: markup.wert ?? null,
                timecodeMs: markup.timecodeMs ?? null,
                wortIndex: markup.wortIndex ?? null,
                stropheId: null,
                zeileId: createdZeile.id,
              },
            });
          }
        }
      }
    }

    return createdSong;
  });

  return getSongDetail(userId, song.id);
}

export async function getSongDetail(
  userId: string,
  songId: string
): Promise<SongDetail> {
  const song = await prisma.song.findUnique({
    where: { id: songId },
    include: {
      audioQuellen: {
        orderBy: { orderIndex: "asc" },
      },
      strophen: {
        orderBy: { orderIndex: "asc" },
        include: {
          zeilen: {
            orderBy: { orderIndex: "asc" },
            include: {
              markups: true,
            },
          },
          markups: true,
          fortschritte: {
            where: { userId },
          },
          notizen: {
            where: { userId },
          },
        },
      },
    },
  });

  if (!song) {
    throw new Error("Song nicht gefunden");
  }
  if (song.userId !== userId) {
    throw new Error("Zugriff verweigert");
  }

  const sessionCount = await prisma.session.count({
    where: { userId, songId },
  });

  const strophen: StropheDetail[] = song.strophen.map((s) => {
    const fort = s.fortschritte[0];
    const notiz = s.notizen[0];

    const zeilen: ZeileDetail[] = s.zeilen.map((z) => ({
      id: z.id,
      text: z.text,
      uebersetzung: z.uebersetzung,
      orderIndex: z.orderIndex,
      markups: z.markups.map(
        (m): MarkupResponse => ({
          id: m.id,
          typ: m.typ,
          ziel: m.ziel,
          wert: m.wert,
          timecodeMs: m.timecodeMs,
          wortIndex: m.wortIndex,
        })
      ),
    }));

    const stropheMarkups: MarkupResponse[] = s.markups.map((m) => ({
      id: m.id,
      typ: m.typ,
      ziel: m.ziel,
      wert: m.wert,
      timecodeMs: m.timecodeMs,
      wortIndex: m.wortIndex,
    }));

    return {
      id: s.id,
      name: s.name,
      orderIndex: s.orderIndex,
      progress: fort ? fort.prozent : 0,
      notiz: notiz ? notiz.text : null,
      analyse: s.analyse ?? null,
      zeilen,
      markups: stropheMarkups,
    };
  });

  const strophenCount = strophen.length;
  let progress = 0;
  if (strophenCount > 0) {
    const totalProgress = strophen.reduce((sum, s) => sum + s.progress, 0);
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
    sessionCount,
    analyse: song.analyse ?? null,
    coachTipp: song.coachTipp ?? null,
    strophen,
    audioQuellen: song.audioQuellen.map((aq) => ({
      id: aq.id,
      url: aq.url,
      typ: aq.typ,
      label: aq.label,
      orderIndex: aq.orderIndex,
    })),
  };
}

export async function updateSong(
  userId: string,
  songId: string,
  data: UpdateSongInput
): Promise<Song> {
  const song = await prisma.song.findUnique({ where: { id: songId } });
  if (!song) {
    throw new Error("Song nicht gefunden");
  }
  if (song.userId !== userId) {
    throw new Error("Zugriff verweigert");
  }

  if (data.titel !== undefined && (!data.titel || !data.titel.trim())) {
    throw new Error("Titel ist erforderlich");
  }

  const updateData: Record<string, unknown> = {};
  if (data.titel !== undefined) updateData.titel = data.titel.trim();
  if (data.kuenstler !== undefined) updateData.kuenstler = data.kuenstler;
  if (data.sprache !== undefined) updateData.sprache = data.sprache;
  if (data.emotionsTags !== undefined)
    updateData.emotionsTags = data.emotionsTags;
  if (data.coverUrl !== undefined) updateData.coverUrl = data.coverUrl;

  return prisma.song.update({
    where: { id: songId },
    data: updateData,
  });
}

export async function deleteSong(
  userId: string,
  songId: string
): Promise<void> {
  const song = await prisma.song.findUnique({ where: { id: songId } });
  if (!song) {
    throw new Error("Song nicht gefunden");
  }
  if (song.userId !== userId) {
    throw new Error("Zugriff verweigert");
  }

  await prisma.song.delete({ where: { id: songId } });
}
