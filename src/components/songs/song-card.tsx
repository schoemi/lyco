import Link from "next/link";
import { ProgressBar } from "./progress-bar";
import { StatusPunkt } from "@/components/gamification/status-punkt";
import type { SongWithProgress } from "@/types/song";

interface SongCardProps {
  song: SongWithProgress;
}

function getStatusLabel(progress: number): string {
  if (progress <= 0) return "neu";
  if (progress >= 100) return "gelernt";
  return `${Math.round(progress)}% gelernt`;
}

export function SongCard({ song }: SongCardProps) {
  const statusLabel = getStatusLabel(song.progress);
  const ariaLabel = `${song.titel}${song.kuenstler ? `, ${song.kuenstler}` : ""} – ${statusLabel}`;

  return (
    <Link
      href={`/songs/${song.id}`}
      className="group relative flex flex-col justify-end overflow-hidden rounded-lg shadow-md transition-shadow hover:shadow-lg aspect-[3/4]"
      aria-label={ariaLabel}
    >
      {/* Cover image or gradient placeholder */}
      {song.coverUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${song.coverUrl})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-400 to-neutral-600" />
      )}

      {/* StatusPunkt top-right */}
      <div className="absolute top-2 right-2 z-10">
        <StatusPunkt fortschritt={song.progress} />
      </div>

      {/* Semi-transparent overlay + text at bottom */}
      <div className="relative z-10 bg-gradient-to-t from-black/70 to-transparent px-3 pt-8 pb-0">
        <p className="truncate text-sm font-semibold text-white">{song.titel}</p>
        {song.kuenstler && (
          <p className="truncate text-xs text-white/80">{song.kuenstler}</p>
        )}
        <div className="mt-1" />
      </div>

      {/* ProgressBar flush at bottom edge */}
      <div className="relative z-10">
        <ProgressBar value={song.progress} className="rounded-none" />
      </div>
    </Link>
  );
}
