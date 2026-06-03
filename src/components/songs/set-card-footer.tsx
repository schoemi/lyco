import Link from "next/link";
import type { DashboardSetStats } from "@/types/song";

/**
 * Formats a duration given in milliseconds to a MM:SS string.
 *
 * Examples:
 *   2730000ms → "45:30"
 *   3600000ms → "60:00"
 *   90000ms   → "1:30"
 *
 * Pure function without side-effects.
 */
export function formatDuration(totalMs: number): string {
  const totalSeconds = Math.floor(totalMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const paddedSeconds = String(seconds).padStart(2, "0");
  return `${minutes}:${paddedSeconds}`;
}

export interface SetCardFooterProps {
  setId: string;
  stats: DashboardSetStats;
}

/**
 * Footer for SetCard showing set statistics in a 3-column grid layout.
 * Left: song count, artist count, duration.
 * Middle: role-based availability stats.
 * Right: quick-play button linking to the set with autoplay.
 */
export function SetCardFooter({ setId, stats }: SetCardFooterProps) {
  const { rolleStats, playableSongCount, distinctArtistCount, totalDurationMs } = stats;
  const isDisabled = rolleStats.total === 0;

  return (
    <div className="mt-3 grid grid-cols-3 gap-2 rounded-md border border-neutral-100 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
      {/* Left third: basic stats */}
      <div className="flex flex-col gap-0.5">
        <span>{playableSongCount} Titel</span>
        <span>{distinctArtistCount} Interpreten</span>
        <span>
          {totalDurationMs !== null
            ? formatDuration(totalDurationMs)
            : "Dauer nicht verfügbar"}
        </span>
      </div>

      {/* Middle third: role stats */}
      <div className="flex flex-col gap-0.5">
        <span>
          Original{" "}
          <span className="font-medium text-neutral-700">
            {rolleStats.standard}/{rolleStats.total}
          </span>
        </span>
        <span>
          Instrumental{" "}
          <span className="font-medium text-neutral-700">
            {rolleStats.instrumental}/{rolleStats.total}
          </span>
        </span>
        <span>
          Vocals{" "}
          <span className="font-medium text-neutral-700">
            {rolleStats.referenzVokal}/{rolleStats.total}
          </span>
        </span>
      </div>

      {/* Right third: play button */}
      <div className="flex items-center justify-center">
        {isDisabled ? (
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-neutral-400 cursor-not-allowed"
          >
            <svg
              className="h-3 w-3"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
            Set abspielen
          </button>
        ) : (
          <Link
            href={`/sets/${setId}?autoplay=true`}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-200 hover:text-neutral-800 transition-colors"
            aria-label="Set abspielen"
          >
            <svg
              className="h-3 w-3"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
            Set abspielen
          </Link>
        )}
      </div>
    </div>
  );
}
