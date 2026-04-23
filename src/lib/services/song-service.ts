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
import { hatSongZugriff } from "@/lib/services/freigabe-service";

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
    const lernbareStrophen = song.strophen.filter((s) => !s.istInstrumental);
    const strophenCount = lernbareStrophen.length;
    let progress = 0;
    if (strophenCount > 0) {
      const totalProgress = lernbareStrophen.reduce((sum, s) => {
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

    // Taktbereich-Validierung für Strophe
    if (strophe.startTakt !== undefined && strophe.startTakt !== null) {
      if (!Number.isInteger(strophe.startTakt) || strophe.startTakt < 1) {
        throw new Error("startTakt muss eine positive Ganzzahl sein");
      }
    }
    if (strophe.endTakt !== undefined && strophe.endTakt !== null) {
      if (!Number.isInteger(strophe.endTakt) || strophe.endTakt < 1) {
        throw new Error("endTakt muss eine positive Ganzzahl sein");
      }
    }
    const stropheStartTakt = strophe.startTakt ?? null;
    const stropheEndTakt = strophe.endTakt ?? null;
    if (stropheEndTakt !== null && stropheStartTakt === null) {
      throw new Error("endTakt kann nicht ohne startTakt gesetzt werden");
    }
    if (stropheStartTakt !== null && stropheEndTakt !== null && stropheStartTakt > stropheEndTakt) {
      throw new Error("startTakt muss kleiner oder gleich endTakt sein");
    }

    // Taktbereich-Validierung für Zeilen
    for (const zeile of strophe.zeilen) {
      if (zeile.startTakt !== undefined && zeile.startTakt !== null) {
        if (!Number.isInteger(zeile.startTakt) || zeile.startTakt < 1) {
          throw new Error("startTakt muss eine positive Ganzzahl sein");
        }
      }
      if (zeile.endTakt !== undefined && zeile.endTakt !== null) {
        if (!Number.isInteger(zeile.endTakt) || zeile.endTakt < 1) {
          throw new Error("endTakt muss eine positive Ganzzahl sein");
        }
      }
      const zeileStartTakt = zeile.startTakt ?? null;
      const zeileEndTakt = zeile.endTakt ?? null;
      if (zeileEndTakt !== null && zeileStartTakt === null) {
        throw new Error("endTakt kann nicht ohne startTakt gesetzt werden");
      }
      if (zeileStartTakt !== null && zeileEndTakt !== null && zeileStartTakt > zeileEndTakt) {
        throw new Error("startTakt muss kleiner oder gleich endTakt sein");
      }
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
        tonart: data.tonart ?? null,
        userId,
      },
    });

    // BeatErgebnis mit methode MANUELL erstellen, wenn bpm vorhanden
    if (data.bpm !== undefined && data.bpm !== null) {
      await tx.beatErgebnis.create({
        data: {
          songId: createdSong.id,
          bpm: data.bpm,
          methode: "MANUELL",
          beatPositionenMs: [],
          taktZaehler: data.taktZaehler ?? 4,
          taktNenner: data.taktNenner ?? 4,
        },
      });
    }

    for (let si = 0; si < data.strophen.length; si++) {
      const stropheInput = data.strophen[si];
      const createdStrophe = await tx.strophe.create({
        data: {
          name: stropheInput.name,
          orderIndex: si,
          istInstrumental: stropheInput.istInstrumental ?? false,
          startTakt: stropheInput.startTakt ?? null,
          endTakt: stropheInput.endTakt ?? null,
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
            istKommentar: zeileInput.istKommentar ?? false,
            startTakt: zeileInput.startTakt ?? null,
            endTakt: zeileInput.endTakt ?? null,
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
      beatErgebnis: true,
      sets: {
        include: { set: { select: { id: true, name: true } } },
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

  const istEigentuemer = song.userId === userId;

  if (!istEigentuemer) {
    const hatZugriff = await hatSongZugriff(songId, userId);
    if (!hatZugriff) {
      throw new Error("Zugriff verweigert");
    }
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
      istKommentar: z.istKommentar,
      startTakt: z.startTakt,
      endTakt: z.endTakt,
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
      istInstrumental: s.istInstrumental,
      startTakt: s.startTakt,
      endTakt: s.endTakt,
      zeilen,
      markups: stropheMarkups,
    };
  });

  const lernbareStrophenDetail = strophen.filter((s) => !s.istInstrumental);
  const strophenCount = lernbareStrophenDetail.length;
  let progress = 0;
  if (strophenCount > 0) {
    const totalProgress = lernbareStrophenDetail.reduce((sum, s) => sum + s.progress, 0);
    progress = Math.round(totalProgress / strophenCount);
  }

  return {
    id: song.id,
    titel: song.titel,
    kuenstler: song.kuenstler,
    sprache: song.sprache,
    emotionsTags: song.emotionsTags,
    coverUrl: song.coverUrl ?? null,
    tonart: song.tonart ?? null,
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
      rolle: aq.rolle,
    })),
    sets: song.sets.map((ss) => ({ id: ss.set.id, name: ss.set.name })),
    beatErgebnis: song.beatErgebnis
      ? {
          id: song.beatErgebnis.id,
          songId: song.beatErgebnis.songId,
          bpm: song.beatErgebnis.bpm,
          methode: song.beatErgebnis.methode,
          konfidenz: song.beatErgebnis.konfidenz,
          beatPositionenMs: song.beatErgebnis.beatPositionenMs,
          frequenzUntergrenze: song.beatErgebnis.frequenzUntergrenze,
          frequenzObergrenze: song.beatErgebnis.frequenzObergrenze,
          offsetMs: song.beatErgebnis.offsetMs,
          taktZaehler: song.beatErgebnis.taktZaehler,
          taktNenner: song.beatErgebnis.taktNenner,
        }
      : null,
    ...(istEigentuemer
      ? {}
      : {
          istFreigabe: true,
          eigentuemerName: await prisma.user
            .findUnique({
              where: { id: song.userId },
              select: { name: true },
            })
            .then((u) => u?.name ?? ""),
        }),
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
  if (data.tonart !== undefined) updateData.tonart = data.tonart;

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
