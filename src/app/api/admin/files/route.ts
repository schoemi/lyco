import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readdir, stat } from "fs/promises";
import { join } from "path";

interface FileInfo {
  filename: string;
  type: "audio" | "cover";
  sizeBytes: number;
  createdAt: string;
  linked: boolean;
  linkedSongs: { id: string; titel: string; kuenstler: string | null }[];
}

async function getAdminSession() {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 }) };
  }
  if (session.user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 }) };
  }
  return { session };
}

async function scanDirectory(dir: string, type: "audio" | "cover"): Promise<Omit<FileInfo, "linked" | "linkedSongs">[]> {
  try {
    const entries = await readdir(dir);
    const files: Omit<FileInfo, "linked" | "linkedSongs">[] = [];
    for (const entry of entries) {
      if (entry.startsWith(".")) continue;
      const filepath = join(dir, entry);
      try {
        const s = await stat(filepath);
        if (s.isFile()) {
          files.push({
            filename: entry,
            type,
            sizeBytes: s.size,
            createdAt: s.birthtime.toISOString(),
          });
        }
      } catch {
        // skip unreadable files
      }
    }
    return files;
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const result = await getAdminSession();
    if ("error" in result && result.error) return result.error;

    const baseDir = join(process.cwd(), "data", "uploads");

    // Scan both directories
    const [audioFiles, coverFiles] = await Promise.all([
      scanDirectory(join(baseDir, "audio"), "audio"),
      scanDirectory(join(baseDir, "covers"), "cover"),
    ]);

    // Fetch all audio quellen with song info (for audio files)
    const audioQuellen = await prisma.audioQuelle.findMany({
      where: { url: { startsWith: "/api/uploads/audio/" } },
      select: {
        url: true,
        song: { select: { id: true, titel: true, kuenstler: true } },
      },
    });

    // Build lookup: filename -> songs
    const audioLinkMap = new Map<string, { id: string; titel: string; kuenstler: string | null }[]>();
    for (const aq of audioQuellen) {
      const fname = aq.url.replace("/api/uploads/audio/", "");
      if (!audioLinkMap.has(fname)) audioLinkMap.set(fname, []);
      audioLinkMap.get(fname)!.push(aq.song);
    }

    // Fetch all songs with cover URLs (for cover files)
    const songsWithCovers = await prisma.song.findMany({
      where: { coverUrl: { startsWith: "/api/uploads/covers/" } },
      select: { id: true, titel: true, kuenstler: true, coverUrl: true },
    });

    const coverLinkMap = new Map<string, { id: string; titel: string; kuenstler: string | null }[]>();
    for (const song of songsWithCovers) {
      const fname = song.coverUrl!.replace("/api/uploads/covers/", "");
      if (!coverLinkMap.has(fname)) coverLinkMap.set(fname, []);
      coverLinkMap.get(fname)!.push({ id: song.id, titel: song.titel, kuenstler: song.kuenstler });
    }

    // Merge file info with link data
    const files: FileInfo[] = [
      ...audioFiles.map((f) => {
        const songs = audioLinkMap.get(f.filename) ?? [];
        return { ...f, linked: songs.length > 0, linkedSongs: songs };
      }),
      ...coverFiles.map((f) => {
        const songs = coverLinkMap.get(f.filename) ?? [];
        return { ...f, linked: songs.length > 0, linkedSongs: songs };
      }),
    ];

    // Sort: unlinked first, then by date descending
    files.sort((a, b) => {
      if (a.linked !== b.linked) return a.linked ? 1 : -1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const totalSize = files.reduce((sum, f) => sum + f.sizeBytes, 0);

    return NextResponse.json({
      files,
      summary: {
        total: files.length,
        linked: files.filter((f) => f.linked).length,
        unlinked: files.filter((f) => !f.linked).length,
        totalSizeBytes: totalSize,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/files error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
