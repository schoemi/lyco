import Link from "next/link";
import { ProgressBar } from "./progress-bar";
import { StatusPunkt } from "@/components/gamification/status-punkt";
import type { SongWithProgress } from "../../types/song";

interface SongRowProps {
  song: SongWithProgress;
}

export function SongRow({ song }: SongRowProps) {
  return (
    <Link
      href={`/songs/${song.id}`}
      className="flex min-h-[44px] items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-gray-50"
      aria-label={`${song.titel}${song.kuenstler ? ` von ${song.kuenstler}` : ""} – ${song.status}`}
    >
      <StatusPunkt fortschritt={song.progress} />
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
