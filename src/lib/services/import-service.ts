/**
 * Import-Service für Song/Set Backup
 *
 * Parst ZIP-Archive, validiert Manifeste, erkennt Konflikte
 * und führt den Import in die Datenbank durch.
 */

import AdmZip from "adm-zip";
import { randomUUID } from "crypto";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { validateSongManifestFull, validateSetManifest } from "@/lib/backup/backup-schema";
import { deserializeSong } from "@/lib/backup/backup-serializer";
import type { SongCreateData } from "@/lib/backup/backup-serializer";
import type {
  ImportValidationResult,
  ImportSongPreview,
  ImportConflict,
  ImportResult,
  SongManifest,
  SetManifest,
} from "@/lib/backup/backup-types";
import type { MarkupTyp, MarkupZiel, AudioTyp, AudioRolle } from "@/generated/prisma/client";
import { AUDIO_DIR, COVERS_DIR, REFERENZ_DATEN_DIR } from "@/lib/storage";

/**
 * Validiert ein hochgeladenes ZIP-Archiv und erkennt Konflikte.
 *
 * Parst das ZIP, extrahiert und validiert das Manifest (song.json oder set.json),
 * prüft auf Konflikte mit bestehenden Songs des Nutzers und gibt eine
 * Vorschau der enthaltenen Songs zurück.
 *
 * @param userId - ID des authentifizierten Nutzers
 * @param zipBuffer - Buffer des hochgeladenen ZIP-Archivs
 * @returns ImportValidationResult mit Songs-Vorschau, Konflikten und Set-Info
 */
export async function validateImport(
  userId: string,
  zipBuffer: Buffer,
): Promise<ImportValidationResult> {
  // 1. ZIP parsen
  let zip: AdmZip;
  try {
    zip = new AdmZip(zipBuffer);
  } catch {
    return {
      valid: false,
      error: "Archiv konnte nicht gelesen werden",
      isSet: false,
      songs: [],
      conflicts: [],
    };
  }

  const entries = zip.getEntries();

  // 2. Prüfen ob Set oder Einzel-Song
  const setEntry = entries.find((e) => e.entryName === "set.json");
  const rootSongEntry = entries.find((e) => e.entryName === "song.json");

  if (setEntry) {
    return validateSetArchive(userId, zip, entries, setEntry);
  }

  if (rootSongEntry) {
    return validateSingleSongArchive(userId, rootSongEntry);
  }

  // Kein gültiges Manifest gefunden
  return {
    valid: false,
    error: "Ungültiges Archiv-Format",
    isSet: false,
    songs: [],
    conflicts: [],
  };
}


/**
 * Validiert ein Einzel-Song-Archiv (enthält song.json im Wurzelverzeichnis).
 */
async function validateSingleSongArchive(
  userId: string,
  songEntry: AdmZip.IZipEntry,
): Promise<ImportValidationResult> {
  // Manifest parsen
  const manifest = parseSongManifest(songEntry);
  if (!manifest) {
    return {
      valid: false,
      error: "Ungültiges Archiv-Format",
      isSet: false,
      songs: [],
      conflicts: [],
    };
  }

  // Manifest validieren
  const validation = validateSongManifestFull(manifest);
  if (!validation.valid) {
    return {
      valid: false,
      error: `Ungültiges Archiv-Format: ${validation.errors[0]}`,
      isSet: false,
      songs: [],
      conflicts: [],
    };
  }

  const songManifest = manifest as SongManifest;
  const songs: ImportSongPreview[] = [manifestToPreview(songManifest)];

  // Konflikte erkennen
  const conflicts = await detectConflicts(userId, [songManifest]);

  return {
    valid: true,
    isSet: false,
    songs,
    conflicts,
  };
}

/**
 * Validiert ein Set-Archiv (enthält set.json + Song-Unterordner).
 */
async function validateSetArchive(
  userId: string,
  zip: AdmZip,
  entries: AdmZip.IZipEntry[],
  setEntry: AdmZip.IZipEntry,
): Promise<ImportValidationResult> {
  // Set-Manifest parsen
  let setManifest: SetManifest;
  try {
    const raw = setEntry.getData().toString("utf-8");
    const parsed = JSON.parse(raw);
    const validation = validateSetManifest(parsed);
    if (!validation.valid) {
      return {
        valid: false,
        error: `Ungültiges Archiv-Format: ${validation.errors[0]}`,
        isSet: true,
        songs: [],
        conflicts: [],
      };
    }
    setManifest = parsed as SetManifest;
  } catch {
    return {
      valid: false,
      error: "Ungültiges Archiv-Format",
      isSet: true,
      songs: [],
      conflicts: [],
    };
  }

  // Song-Manifeste aus Unterordnern laden und validieren
  const songManifests: SongManifest[] = [];
  const songs: ImportSongPreview[] = [];

  for (const songEntry of setManifest.songs) {
    const songJsonPath = `${songEntry.folder}/song.json`;
    const entry = entries.find((e) => e.entryName === songJsonPath);

    if (!entry) {
      return {
        valid: false,
        error: `Ungültiges Archiv-Format: Song-Manifest fehlt in ${songEntry.folder}`,
        isSet: true,
        songs: [],
        conflicts: [],
      };
    }

    const manifest = parseSongManifest(entry);
    if (!manifest) {
      return {
        valid: false,
        error: `Ungültiges Archiv-Format: Ungültiges Song-Manifest in ${songEntry.folder}`,
        isSet: true,
        songs: [],
        conflicts: [],
      };
    }

    const validation = validateSongManifestFull(manifest);
    if (!validation.valid) {
      return {
        valid: false,
        error: `Ungültiges Archiv-Format: ${validation.errors[0]} (in ${songEntry.folder})`,
        isSet: true,
        songs: [],
        conflicts: [],
      };
    }

    const songManifest = manifest as SongManifest;
    songManifests.push(songManifest);
    songs.push(manifestToPreview(songManifest));
  }

  // Konflikte erkennen
  const conflicts = await detectConflicts(userId, songManifests);

  return {
    valid: true,
    isSet: true,
    songs,
    set: { name: setManifest.name, description: setManifest.description },
    conflicts,
  };
}

/**
 * Parst ein song.json aus einem ZIP-Eintrag.
 * Gibt null zurück bei ungültigem JSON.
 */
function parseSongManifest(entry: AdmZip.IZipEntry): unknown | null {
  try {
    const raw = entry.getData().toString("utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Erstellt eine Song-Vorschau aus einem SongManifest.
 */
function manifestToPreview(manifest: SongManifest): ImportSongPreview {
  return {
    originalId: manifest.originalId,
    titel: manifest.titel,
    kuenstler: manifest.kuenstler,
    strophenCount: manifest.strophen.length,
  };
}

/**
 * Erkennt Konflikte: Prüft ob Original-IDs bereits als Songs
 * des authentifizierten Nutzers in der Datenbank existieren.
 *
 * Nur Songs des Nutzers werden als Konflikte erkannt —
 * Songs anderer Nutzer mit gleicher ID stellen keinen Konflikt dar.
 */
async function detectConflicts(
  userId: string,
  manifests: SongManifest[],
): Promise<ImportConflict[]> {
  if (manifests.length === 0) return [];

  const originalIds = manifests.map((m) => m.originalId);

  // Nur Songs des authentifizierten Nutzers prüfen
  const existingSongs = await prisma.song.findMany({
    where: {
      id: { in: originalIds },
      userId,
    },
    select: {
      id: true,
      titel: true,
    },
  });

  const existingMap = new Map(existingSongs.map((s) => [s.id, s.titel]));

  return manifests
    .filter((m) => existingMap.has(m.originalId))
    .map((m) => ({
      originalId: m.originalId,
      titel: m.titel,
      existingTitle: existingMap.get(m.originalId)!,
    }));
}


// ---------------------------------------------------------------------------
// Import-Ausführung
// ---------------------------------------------------------------------------

/** Tracks files copied during import for cleanup on error */
interface CopiedFile {
  path: string;
}

/**
 * Führt den Import eines ZIP-Archivs durch.
 *
 * Parst das Archiv erneut, wendet die Konfliktauflösungen an und
 * erstellt/aktualisiert Songs in einer Prisma-Transaktion.
 * Upload-Dateien werden ins Dateisystem kopiert.
 *
 * @param userId - ID des authentifizierten Nutzers
 * @param zipBuffer - Buffer des hochgeladenen ZIP-Archivs
 * @param resolutions - Konfliktauflösungen: originalId → 'overwrite' | 'new'
 * @returns ImportResult mit Anzahl importierter Songs
 */
export async function executeImport(
  userId: string,
  zipBuffer: Buffer,
  resolutions: Record<string, "overwrite" | "new">,
): Promise<ImportResult> {
  // 1. ZIP parsen
  let zip: AdmZip;
  try {
    zip = new AdmZip(zipBuffer);
  } catch {
    throw new Error("Archiv konnte nicht gelesen werden");
  }

  const entries = zip.getEntries();
  const setEntry = entries.find((e) => e.entryName === "set.json");
  const rootSongEntry = entries.find((e) => e.entryName === "song.json");

  // 2. Manifeste extrahieren
  let setManifest: SetManifest | null = null;
  const songManifests: { manifest: SongManifest; prefix: string }[] = [];

  if (setEntry) {
    // Set-Archiv
    const raw = setEntry.getData().toString("utf-8");
    const parsed = JSON.parse(raw);
    const validation = validateSetManifest(parsed);
    if (!validation.valid) {
      throw new Error(`Ungültiges Archiv-Format: ${validation.errors[0]}`);
    }
    setManifest = parsed as SetManifest;

    for (const songEntry of setManifest.songs) {
      const songJsonPath = `${songEntry.folder}/song.json`;
      const entry = entries.find((e) => e.entryName === songJsonPath);
      if (!entry) {
        throw new Error(`Song-Manifest fehlt in ${songEntry.folder}`);
      }
      const manifest = parseSongManifest(entry);
      if (!manifest) {
        throw new Error(`Ungültiges Song-Manifest in ${songEntry.folder}`);
      }
      const v = validateSongManifestFull(manifest);
      if (!v.valid) {
        throw new Error(`Ungültiges Archiv-Format: ${v.errors[0]}`);
      }
      songManifests.push({
        manifest: manifest as SongManifest,
        prefix: `${songEntry.folder}/`,
      });
    }
  } else if (rootSongEntry) {
    // Einzel-Song-Archiv
    const manifest = parseSongManifest(rootSongEntry);
    if (!manifest) {
      throw new Error("Ungültiges Archiv-Format");
    }
    const v = validateSongManifestFull(manifest);
    if (!v.valid) {
      throw new Error(`Ungültiges Archiv-Format: ${v.errors[0]}`);
    }
    songManifests.push({ manifest: manifest as SongManifest, prefix: "" });
  } else {
    throw new Error("Ungültiges Archiv-Format");
  }

  // 3. Import durchführen
  const copiedFiles: CopiedFile[] = [];

  try {
    // Map von originalId → neue songId für Set-Zuordnung
    const songIdMap = new Map<string, string>();

    await prisma.$transaction(async (tx) => {
      for (const { manifest, prefix } of songManifests) {
        const songData = deserializeSong(manifest);
        const resolution = resolutions[manifest.originalId];
        const isConflict = resolution === "overwrite" || resolution === "new";

        if (isConflict && resolution === "overwrite") {
          // Überschreiben-Modus: Song-ID beibehalten
          await importSongOverwrite(tx, userId, songData, manifest, entries, prefix, copiedFiles);
          songIdMap.set(manifest.originalId, manifest.originalId);
        } else {
          // Neu-Import-Modus (auch für nicht-konflikthaft)
          const newSongId = await importSongNew(tx, userId, songData, manifest, entries, prefix, copiedFiles);
          songIdMap.set(manifest.originalId, newSongId);
        }
      }

      // Set erstellen falls Set-Archiv
      if (setManifest) {
        const setId = randomUUID();
        await tx.set.create({
          data: {
            id: setId,
            name: setManifest.name,
            description: setManifest.description,
            userId,
          },
        });

        // SetSong-Zuordnungen erstellen
        for (const songEntry of setManifest.songs) {
          // Finde das passende Manifest für diesen Ordner
          const matchingManifest = songManifests.find(
            (sm) => sm.prefix === `${songEntry.folder}/`,
          );
          if (matchingManifest) {
            const songId = songIdMap.get(matchingManifest.manifest.originalId);
            if (songId) {
              await tx.setSong.create({
                data: {
                  setId,
                  songId,
                  orderIndex: songEntry.orderIndex,
                },
              });
            }
          }
        }
      }
    });

    const count = songManifests.length;
    return {
      imported: count,
      message: `${count} Song${count !== 1 ? "s" : ""} erfolgreich importiert`,
    };
  } catch (error) {
    // Cleanup: bereits kopierte Dateien entfernen
    await cleanupCopiedFiles(copiedFiles);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Überschreiben-Modus
// ---------------------------------------------------------------------------

/**
 * Importiert einen Song im Überschreiben-Modus.
 * Löscht alle Kind-Datensätze und erstellt sie neu.
 * Behält die Song-ID bei.
 */
async function importSongOverwrite(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  userId: string,
  songData: SongCreateData,
  manifest: SongManifest,
  entries: AdmZip.IZipEntry[],
  prefix: string,
  copiedFiles: CopiedFile[],
): Promise<void> {
  const songId = manifest.originalId;

  // 1. Alle Kind-Datensätze löschen (Reihenfolge beachten wegen FK)
  // Markups löschen (hängen an Strophen und Zeilen)
  await tx.markup.deleteMany({ where: { strophe: { songId } } });
  await tx.markup.deleteMany({ where: { zeile: { strophe: { songId } } } });
  // Zeilen löschen
  await tx.zeile.deleteMany({ where: { strophe: { songId } } });
  // Interpretationen und Notizen löschen
  await tx.interpretation.deleteMany({ where: { strophe: { songId }, userId } });
  await tx.notiz.deleteMany({ where: { strophe: { songId }, userId } });
  // Strophen löschen
  await tx.strophe.deleteMany({ where: { songId } });
  // AudioQuellen löschen
  await tx.audioQuelle.deleteMany({ where: { songId } });

  // 2. Song-Metadaten aktualisieren
  const newCoverUrl = await processCoverFile(manifest, entries, prefix, songId, copiedFiles);
  await tx.song.update({
    where: { id: songId },
    data: {
      titel: songData.titel,
      kuenstler: songData.kuenstler,
      sprache: songData.sprache,
      emotionsTags: songData.emotionsTags,
      coverUrl: newCoverUrl,
      analyse: songData.analyse,
      coachTipp: songData.coachTipp,
      userId,
    },
  });

  // 3. Strophen, Zeilen, Markups, Interpretationen, Notizen neu erstellen
  await createSongChildren(tx, userId, songId, songData);

  // 4. AudioQuellen erstellen
  await createAudioQuellen(tx, songId, songData, manifest, entries, prefix, copiedFiles);

  // 5. Referenz-Daten kopieren
  await copyReferenzDaten(entries, prefix, songId, copiedFiles);
}

// ---------------------------------------------------------------------------
// Neu-Import-Modus
// ---------------------------------------------------------------------------

/**
 * Importiert einen Song im Neu-Import-Modus.
 * Generiert neue IDs für alle Entitäten.
 */
async function importSongNew(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  userId: string,
  songData: SongCreateData,
  manifest: SongManifest,
  entries: AdmZip.IZipEntry[],
  prefix: string,
  copiedFiles: CopiedFile[],
): Promise<string> {
  const newSongId = randomUUID();

  // 1. Cover-Datei verarbeiten (mit neuer ID)
  const newCoverUrl = await processCoverFile(manifest, entries, prefix, newSongId, copiedFiles);

  // 2. Song erstellen
  await tx.song.create({
    data: {
      id: newSongId,
      titel: songData.titel,
      kuenstler: songData.kuenstler,
      sprache: songData.sprache,
      emotionsTags: songData.emotionsTags,
      coverUrl: newCoverUrl,
      analyse: songData.analyse,
      coachTipp: songData.coachTipp,
      userId,
    },
  });

  // 3. Strophen, Zeilen, Markups, Interpretationen, Notizen erstellen
  await createSongChildren(tx, userId, newSongId, songData);

  // 4. AudioQuellen erstellen (mit neuen Dateinamen)
  await createAudioQuellen(tx, newSongId, songData, manifest, entries, prefix, copiedFiles);

  // 5. Referenz-Daten kopieren (mit neuer Song-ID)
  await copyReferenzDaten(entries, prefix, newSongId, copiedFiles);

  return newSongId;
}

// ---------------------------------------------------------------------------
// Gemeinsame Hilfsfunktionen
// ---------------------------------------------------------------------------

/**
 * Erstellt Strophen, Zeilen, Markups, Interpretationen und Notizen für einen Song.
 */
async function createSongChildren(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  userId: string,
  songId: string,
  songData: SongCreateData,
): Promise<void> {
  for (const stropheData of songData.strophen) {
    const newStropheId = randomUUID();

    await tx.strophe.create({
      data: {
        id: newStropheId,
        name: stropheData.name,
        orderIndex: stropheData.orderIndex,
        analyse: stropheData.analyse,
        songId,
      },
    });

    // Strophen-Level Markups
    for (const markupData of stropheData.markups) {
      await tx.markup.create({
        data: {
          id: randomUUID(),
          typ: markupData.typ as MarkupTyp,
          ziel: markupData.ziel as MarkupZiel,
          wert: markupData.wert,
          timecodeMs: markupData.timecodeMs,
          wortIndex: markupData.wortIndex,
          stropheId: newStropheId,
        },
      });
    }

    // Zeilen
    for (const zeileData of stropheData.zeilen) {
      const newZeileId = randomUUID();

      await tx.zeile.create({
        data: {
          id: newZeileId,
          text: zeileData.text,
          uebersetzung: zeileData.uebersetzung,
          orderIndex: zeileData.orderIndex,
          stropheId: newStropheId,
        },
      });

      // Zeilen-Level Markups
      for (const markupData of zeileData.markups) {
        await tx.markup.create({
          data: {
            id: randomUUID(),
            typ: markupData.typ as MarkupTyp,
            ziel: markupData.ziel as MarkupZiel,
            wert: markupData.wert,
            timecodeMs: markupData.timecodeMs,
            wortIndex: markupData.wortIndex,
            zeileId: newZeileId,
          },
        });
      }
    }

    // Interpretation (falls vorhanden)
    if (stropheData.interpretation) {
      await tx.interpretation.create({
        data: {
          id: randomUUID(),
          userId,
          stropheId: newStropheId,
          text: stropheData.interpretation,
        },
      });
    }

    // Notiz (falls vorhanden)
    if (stropheData.notiz) {
      await tx.notiz.create({
        data: {
          id: randomUUID(),
          userId,
          stropheId: newStropheId,
          text: stropheData.notiz,
        },
      });
    }
  }
}

/**
 * Erstellt AudioQuellen für einen Song und kopiert lokale MP3-Dateien.
 */
async function createAudioQuellen(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  songId: string,
  songData: SongCreateData,
  manifest: SongManifest,
  entries: AdmZip.IZipEntry[],
  prefix: string,
  copiedFiles: CopiedFile[],
): Promise<void> {
  for (const aqData of songData.audioQuellen) {
    let url = aqData.url;

    // Lokale MP3-Dateien aus dem ZIP kopieren
    if (aqData.typ === "MP3" && aqData.url.startsWith("/api/uploads/audio/")) {
      const originalFilename = aqData.url.replace("/api/uploads/audio/", "");
      const zipPath = `${prefix}uploads/audio/${originalFilename}`;
      const entry = entries.find((e) => e.entryName === zipPath);

      if (entry) {
        const ext = getFileExtension(originalFilename);
        const newFilename = `${randomUUID()}${ext}`;
        await mkdir(AUDIO_DIR, { recursive: true });
        const destPath = join(AUDIO_DIR, newFilename);
        await writeFile(destPath, entry.getData());
        copiedFiles.push({ path: destPath });
        url = `/api/uploads/audio/${newFilename}`;
      }
      // Falls Datei im ZIP fehlt: URL beibehalten (Req 10.2)
    }

    await tx.audioQuelle.create({
      data: {
        id: randomUUID(),
        songId,
        url,
        typ: aqData.typ as AudioTyp,
        label: aqData.label,
        orderIndex: aqData.orderIndex,
        rolle: aqData.rolle as AudioRolle,
      },
    });
  }
}

/**
 * Verarbeitet die Cover-Datei aus dem ZIP-Archiv.
 * Kopiert sie ins covers-Verzeichnis mit neuem Dateinamen.
 * Gibt die neue Cover-URL zurück oder null.
 */
async function processCoverFile(
  manifest: SongManifest,
  entries: AdmZip.IZipEntry[],
  prefix: string,
  songId: string,
  copiedFiles: CopiedFile[],
): Promise<string | null> {
  if (!manifest.coverUrl) return null;

  // Nur lokale Cover-Dateien verarbeiten
  if (!manifest.coverUrl.startsWith("/api/uploads/covers/")) {
    return manifest.coverUrl; // Externe URL beibehalten
  }

  const originalFilename = manifest.coverUrl.replace("/api/uploads/covers/", "");
  const zipPath = `${prefix}uploads/covers/${originalFilename}`;
  const entry = entries.find((e) => e.entryName === zipPath);

  if (!entry) {
    return null; // Datei fehlt im ZIP (Req 10.2)
  }

  const ext = getFileExtension(originalFilename);
  const newFilename = `${randomUUID()}${ext}`;
  await mkdir(COVERS_DIR, { recursive: true });
  const destPath = join(COVERS_DIR, newFilename);
  await writeFile(destPath, entry.getData());
  copiedFiles.push({ path: destPath });

  return `/api/uploads/covers/${newFilename}`;
}

/**
 * Kopiert Referenz-Daten aus dem ZIP-Archiv ins Server-Verzeichnis.
 */
async function copyReferenzDaten(
  entries: AdmZip.IZipEntry[],
  prefix: string,
  songId: string,
  copiedFiles: CopiedFile[],
): Promise<void> {
  // Suche nach Referenz-Daten-Dateien im ZIP
  const referenzPrefix = `${prefix}uploads/referenz-daten/`;
  const referenzEntries = entries.filter(
    (e) => e.entryName.startsWith(referenzPrefix) && !e.isDirectory,
  );

  for (const entry of referenzEntries) {
    await mkdir(REFERENZ_DATEN_DIR, { recursive: true });
    const destPath = join(REFERENZ_DATEN_DIR, `${songId}.json`);
    await writeFile(destPath, entry.getData());
    copiedFiles.push({ path: destPath });
  }
}

/**
 * Extrahiert die Dateiendung aus einem Dateinamen.
 */
function getFileExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot) : "";
}

/**
 * Räumt bereits kopierte Dateien auf (bei Fehler im Import).
 */
async function cleanupCopiedFiles(files: CopiedFile[]): Promise<void> {
  for (const file of files) {
    try {
      await unlink(file.path);
    } catch {
      // Ignorieren — Datei existiert möglicherweise nicht
    }
  }
}
