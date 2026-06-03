import type {
  DashboardSetStats,
  DashboardSetRolleStats,
} from "@/types/song";

/**
 * Type for a set-song row with the audioQuellen data loaded by the extended Prisma query.
 * Only MP3 audio sources are included (pre-filtered by `where: { typ: "MP3" }`).
 */
export type SetSongWithMp3Quellen = {
  song: {
    id: string;
    kuenstler: string | null;
    audioQuellen: { rolle: string }[];
  };
};

/**
 * Computes set-level stats from the songs of a set.
 * Only considers MP3 audio sources (already filtered by the Prisma query).
 *
 * @param setSongs - The set-song join rows with song and audioQuellen data
 * @returns DashboardSetStats for the set
 */
export function computeSetStats(
  setSongs: SetSongWithMp3Quellen[]
): DashboardSetStats {
  const songs = setSongs.map((ss) => ss.song);
  const playableSongs = songs.filter((s) => s.audioQuellen.length > 0);

  const rolleStats: DashboardSetRolleStats = {
    standard: playableSongs.filter((s) =>
      s.audioQuellen.some((q) => q.rolle === "STANDARD")
    ).length,
    instrumental: playableSongs.filter((s) =>
      s.audioQuellen.some((q) => q.rolle === "INSTRUMENTAL")
    ).length,
    referenzVokal: playableSongs.filter((s) =>
      s.audioQuellen.some((q) => q.rolle === "REFERENZ_VOKAL")
    ).length,
    total: playableSongs.length,
  };

  const distinctArtistCount = new Set(
    songs.map((s) => s.kuenstler).filter((k): k is string => !!k)
  ).size;

  return {
    playableSongCount: playableSongs.length,
    rolleStats,
    totalDurationMs: null, // MVP: Dauer-Feld noch nicht in DB gespeichert
    distinctArtistCount,
  };
}
