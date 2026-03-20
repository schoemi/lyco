/**
 * Export-Service für Song- und Set-Backup
 *
 * Erstellt ZIP-Archive mit Song-Manifest und Upload-Dateien.
 */

import { prisma } from "@/lib/prisma";
import { serializeSong, serializeSet } from "@/lib/backup/backup-serializer";
import type { SongExportData } from "@/lib/backup/backup-serializer";
import type { SongManifest } from "@/lib/backup/backup-types";
import { AUDIO_DIR, COVERS_DIR, REFERENZ_DATEN_DIR } from "@/lib/storage";
import archiver, { type Archiver } from "archiver";
import { createReadStream, existsSync } from "fs";
import { join } from "path";
import { PassThrough } from "stream";

/**
 * Exportiert einen Song als ZIP-Archiv.
 *
 * Lädt den Song mit allen Relationen, prüft Eigentümerschaft,
 * erstellt das Song-Manifest und verpackt alles in ein ZIP.
 *
 * @throws Error mit "Song nicht gefunden" bei unbekannter songId
 * @throws Error mit "Zugriff verweigert" wenn userId nicht Eigentümer ist
 */
export async function exportSong(
  userId: string,
  songId: string
): Promise<Buffer> {
  // 1. Song mit allen Relationen laden
  const song = await prisma.song.findUnique({
    where: { id: songId },
    include: {
      strophen: {
        orderBy: { orderIndex: "asc" },
        include: {
          zeilen: {
            orderBy: { orderIndex: "asc" },
            include: { markups: true },
          },
          markups: true,
          interpretationen: { where: { userId } },
          notizen: { where: { userId } },
        },
      },
      audioQuellen: {
        orderBy: { orderIndex: "asc" },
      },
    },
  });

  if (!song) {
    throw new Error("Song nicht gefunden");
  }

  // 2. Eigentümerschaft prüfen
  if (song.userId !== userId) {
    throw new Error("Zugriff verweigert");
  }

  // 3. Song-Daten für Serialisierung aufbereiten
  const songData: SongExportData = {
    id: song.id,
    titel: song.titel,
    kuenstler: song.kuenstler,
    sprache: song.sprache,
    emotionsTags: song.emotionsTags,
    coverUrl: song.coverUrl,
    analyse: song.analyse,
    coachTipp: song.coachTipp,
    strophen: song.strophen.map((s) => ({
      id: s.id,
      name: s.name,
      orderIndex: s.orderIndex,
      analyse: s.analyse,
      zeilen: s.zeilen.map((z) => ({
        id: z.id,
        text: z.text,
        uebersetzung: z.uebersetzung,
        orderIndex: z.orderIndex,
        markups: z.markups.map((m) => ({
          id: m.id,
          typ: m.typ,
          ziel: m.ziel,
          wert: m.wert,
          timecodeMs: m.timecodeMs,
          wortIndex: m.wortIndex,
        })),
      })),
      markups: s.markups.map((m) => ({
        id: m.id,
        typ: m.typ,
        ziel: m.ziel,
        wert: m.wert,
        timecodeMs: m.timecodeMs,
        wortIndex: m.wortIndex,
      })),
      interpretationen: s.interpretationen.map((i) => ({ text: i.text })),
      notizen: s.notizen.map((n) => ({ text: n.text })),
    })),
    audioQuellen: song.audioQuellen.map((aq) => ({
      url: aq.url,
      typ: aq.typ,
      label: aq.label,
      orderIndex: aq.orderIndex,
      rolle: aq.rolle,
    })),
  };

  // 4. Song-Manifest erstellen
  const manifest = serializeSong(songData);

  // 5. ZIP-Archiv erstellen
  return createSongZip(manifest, songData);
}


/**
 * Erstellt ein ZIP-Archiv für einen einzelnen Song.
 *
 * Enthält song.json + Upload-Dateien (Cover, Audio, Referenz-Daten).
 * Fehlende Upload-Dateien werden toleriert (graceful degradation).
 */
async function createSongZip(
  manifest: SongManifest,
  songData: SongExportData,
  prefix = ""
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 6 } });
    const chunks: Buffer[] = [];
    const passthrough = new PassThrough();

    passthrough.on("data", (chunk: Buffer) => chunks.push(chunk));
    passthrough.on("end", () => resolve(Buffer.concat(chunks)));
    passthrough.on("error", reject);
    archive.on("error", reject);

    archive.pipe(passthrough);

    appendSongToArchive(archive, manifest, songData, prefix);

    archive.finalize();
  });
}

/**
 * Fügt Song-Manifest und Upload-Dateien zu einem bestehenden Archiv hinzu.
 *
 * Wird sowohl für Einzel-Song-Export als auch für Set-Export verwendet.
 */
function appendSongToArchive(
  archive: Archiver,
  manifest: SongManifest,
  songData: SongExportData,
  prefix = ""
): void {
  // song.json
  archive.append(JSON.stringify(manifest, null, 2), {
    name: `${prefix}song.json`,
  });

  // Cover-Bild (nur lokale Dateien)
  if (songData.coverUrl && songData.coverUrl.startsWith("/api/uploads/covers/")) {
    const filename = songData.coverUrl.replace("/api/uploads/covers/", "");
    const filePath = join(COVERS_DIR, filename);
    if (existsSync(filePath)) {
      archive.append(createReadStream(filePath), {
        name: `${prefix}uploads/covers/${filename}`,
      });
    }
  }

  // Audio-Dateien (nur MP3 mit lokalen Pfaden)
  for (const aq of songData.audioQuellen) {
    if (aq.typ === "MP3" && aq.url.startsWith("/api/uploads/audio/")) {
      const filename = aq.url.replace("/api/uploads/audio/", "");
      const filePath = join(AUDIO_DIR, filename);
      if (existsSync(filePath)) {
        archive.append(createReadStream(filePath), {
          name: `${prefix}uploads/audio/${filename}`,
        });
      }
    }
  }

  // Referenz-Daten
  const referenzPath = join(REFERENZ_DATEN_DIR, `${songData.id}.json`);
  if (existsSync(referenzPath)) {
    archive.append(createReadStream(referenzPath), {
      name: `${prefix}uploads/referenz-daten/${songData.id}.json`,
    });
  }
}

/**
 * Bereinigt einen Song-Titel für die Verwendung als Ordnername.
 *
 * Konvertiert zu Kleinbuchstaben, ersetzt Leerzeichen und Sonderzeichen
 * durch Bindestriche und entfernt ungültige Zeichen.
 */
function sanitizeFolderName(title: string): string {
  return title
    .toLowerCase()
    .replace(/[äÄ]/g, "ae")
    .replace(/[öÖ]/g, "oe")
    .replace(/[üÜ]/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    || "song";
}

/**
 * Exportiert ein Set mit allen enthaltenen Songs als ZIP-Archiv.
 *
 * Lädt das Set mit allen Songs und deren Relationen, prüft Eigentümerschaft,
 * erstellt das Set-Manifest und verpackt alles in ein ZIP mit nummerierten
 * Song-Unterordnern.
 *
 * @throws Error mit "Set nicht gefunden" bei unbekannter setId
 * @throws Error mit "Zugriff verweigert" wenn userId nicht Eigentümer ist
 */
export async function exportSet(
  userId: string,
  setId: string
): Promise<Buffer> {
  // 1. Set mit allen Songs und deren Relationen laden
  const set = await prisma.set.findUnique({
    where: { id: setId },
    include: {
      songs: {
        orderBy: { orderIndex: "asc" },
        include: {
          song: {
            include: {
              strophen: {
                orderBy: { orderIndex: "asc" },
                include: {
                  zeilen: {
                    orderBy: { orderIndex: "asc" },
                    include: { markups: true },
                  },
                  markups: true,
                  interpretationen: { where: { userId } },
                  notizen: { where: { userId } },
                },
              },
              audioQuellen: {
                orderBy: { orderIndex: "asc" },
              },
            },
          },
        },
      },
    },
  });

  if (!set) {
    throw new Error("Set nicht gefunden");
  }

  // 2. Eigentümerschaft prüfen
  if (set.userId !== userId) {
    throw new Error("Zugriff verweigert");
  }

  // 3. Song-Daten aufbereiten und Ordnernamen generieren
  const songEntries = set.songs.map((setSong, index) => {
    const song = setSong.song;
    const paddedIndex = String(index + 1).padStart(2, "0");
    const folder = `${paddedIndex}_${sanitizeFolderName(song.titel)}`;

    const songData: SongExportData = {
      id: song.id,
      titel: song.titel,
      kuenstler: song.kuenstler,
      sprache: song.sprache,
      emotionsTags: song.emotionsTags,
      coverUrl: song.coverUrl,
      analyse: song.analyse,
      coachTipp: song.coachTipp,
      strophen: song.strophen.map((s) => ({
        id: s.id,
        name: s.name,
        orderIndex: s.orderIndex,
        analyse: s.analyse,
        zeilen: s.zeilen.map((z) => ({
          id: z.id,
          text: z.text,
          uebersetzung: z.uebersetzung,
          orderIndex: z.orderIndex,
          markups: z.markups.map((m) => ({
            id: m.id,
            typ: m.typ,
            ziel: m.ziel,
            wert: m.wert,
            timecodeMs: m.timecodeMs,
            wortIndex: m.wortIndex,
          })),
        })),
        markups: s.markups.map((m) => ({
          id: m.id,
          typ: m.typ,
          ziel: m.ziel,
          wert: m.wert,
          timecodeMs: m.timecodeMs,
          wortIndex: m.wortIndex,
        })),
        interpretationen: s.interpretationen.map((i) => ({ text: i.text })),
        notizen: s.notizen.map((n) => ({ text: n.text })),
      })),
      audioQuellen: song.audioQuellen.map((aq) => ({
        url: aq.url,
        typ: aq.typ,
        label: aq.label,
        orderIndex: aq.orderIndex,
        rolle: aq.rolle,
      })),
    };

    return {
      folder,
      orderIndex: setSong.orderIndex,
      songData,
      manifest: serializeSong(songData),
    };
  });

  // 4. Set-Manifest erstellen
  const setManifest = serializeSet({
    name: set.name,
    description: set.description,
    songs: songEntries.map((e) => ({
      folder: e.folder,
      orderIndex: e.orderIndex,
    })),
  });

  // 5. ZIP-Archiv erstellen
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 6 } });
    const chunks: Buffer[] = [];
    const passthrough = new PassThrough();

    passthrough.on("data", (chunk: Buffer) => chunks.push(chunk));
    passthrough.on("end", () => resolve(Buffer.concat(chunks)));
    passthrough.on("error", reject);
    archive.on("error", reject);

    archive.pipe(passthrough);

    // set.json im Wurzelverzeichnis
    archive.append(JSON.stringify(setManifest, null, 2), {
      name: "set.json",
    });

    // Jeden Song in seinen nummerierten Unterordner
    for (const entry of songEntries) {
      appendSongToArchive(
        archive,
        entry.manifest,
        entry.songData,
        `${entry.folder}/`
      );
    }

    archive.finalize();
  });
}
