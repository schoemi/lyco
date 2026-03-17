import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listSongs } from "@/lib/services/song-service";
import { getAverageProgress } from "@/lib/services/progress-service";
import { getTotalSessionCount } from "@/lib/services/session-service";
import { getFaelligeAnzahl } from "@/lib/services/spaced-repetition-service";
import type { DashboardData, DashboardSet, SongWithProgress } from "../../../types/song";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get all songs with progress (reuse existing service)
    const allSongs = await listSongs(userId);

    // Build a lookup map for quick access by song ID
    const songMap = new Map<string, SongWithProgress>();
    for (const song of allSongs) {
      songMap.set(song.id, song);
    }

    // Get all sets with their song associations
    const sets = await prisma.set.findMany({
      where: { userId },
      include: {
        songs: {
          include: {
            song: { select: { id: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Build dashboard sets with enriched song data
    const dashboardSets: DashboardSet[] = sets.map((set) => ({
      id: set.id,
      name: set.name,
      songs: set.songs
        .map((ss) => songMap.get(ss.song.id))
        .filter((s): s is SongWithProgress => s !== undefined),
    }));

    // Aggregate values
    const [averageProgress, totalSessions, faelligeStrophenAnzahl] = await Promise.all([
      getAverageProgress(userId),
      getTotalSessionCount(userId),
      getFaelligeAnzahl(userId),
    ]);

    const data: DashboardData = {
      sets: dashboardSets,
      allSongs,
      totalSongs: allSongs.length,
      totalSessions: totalSessions,
      averageProgress,
      faelligeStrophenAnzahl,
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/dashboard error:", error);
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      { error: "Interner Serverfehler", debug: { message, stack } },
      { status: 500 }
    );
  }
}
