import Link from "next/link";
import { ProgressBar } from "./progress-bar";
import type { SongWithProgress } from "../../types/song";

interface SongRowProps {
  song: SongWithProgress;
}

const statusColors: Record<SongWithProgress["status"], string> = {
  neu: "bg-gray-400",
  aktiv: "bg-yellow-400",
  gelernt: "bg-green-500",
};

export function SongRow({ song }: SongRowProps) {
  return (
    <Link
      href={`/songs/${song.id}`}
      className="flex min-h-[44px] items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-gray-50"
      aria-label={`${song.titel}${song.kuenstler ? ` von ${song.kuenstler}` : ""} – ${song.status}`}
    >
      <span
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusColors[song.status]}`}
        aria-hidden="true"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-medium text-gray-900">
            {song.titel}
          </span>
          {song.kuenstler && (
            <span className="shrink-0 text-xs text-gray-500">
              {song.kuenstler}
            </span>
          )}
        </div>
        <ProgressBar value={song.progress} />
      </div>
    </Link>
  );
}
