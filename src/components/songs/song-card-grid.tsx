import { SongCard } from "./song-card";
import type { SongWithProgress } from "@/types/song";

interface SongCardGridProps {
  songs: SongWithProgress[];
}

export function SongCardGrid({ songs }: SongCardGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {songs.map((song) => (
        <SongCard key={song.id} song={song} />
      ))}
    </div>
  );
}
