import { prisma } from "@/lib/prisma";
import { hatSongZugriff } from "@/lib/services/freigabe-service";

/**
 * Resolves whether a user has access to an uploaded file (audio or cover).
 *
 * For audio files: looks up the AudioQuelle by filename to find the associated songId.
 * For cover files: looks up the Song by coverUrl containing the filename.
 *
 * Then delegates to `hatSongZugriff` to check ownership or Freigabe.
 * Returns `{ allowed: false }` for orphaned files (no DB entry) — conservative approach.
 */
export async function resolveUploadAccess(
  filename: string,
  type: "audio" | "cover",
  userId: string
): Promise<{ allowed: boolean; songId?: string }> {
  if (type === "audio") {
    const audioQuelle = await prisma.audioQuelle.findFirst({
      where: { url: { contains: filename } },
    });

    if (!audioQuelle) {
      // Orphaned file — no DB entry, deny access (conservative)
      return { allowed: false };
    }

    const allowed = await hatSongZugriff(audioQuelle.songId, userId);
    return { allowed, songId: audioQuelle.songId };
  }

  // type === "cover"
  const song = await prisma.song.findFirst({
    where: { coverUrl: { contains: filename } },
  });

  if (!song) {
    // Orphaned file — no DB entry, deny access (conservative)
    return { allowed: false };
  }

  const allowed = await hatSongZugriff(song.id, userId);
  return { allowed, songId: song.id };
}
