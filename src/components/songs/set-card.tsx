"use client";

import { useState } from "react";
import { SongRow } from "./song-row";
import type { DashboardSet } from "../../types/song";

interface SetCardProps {
  set: DashboardSet;
}

export function SetCard({ set }: SetCardProps) {
  const [expanded, setExpanded] = useState(true);
  const songCount = set.songs.length;

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        aria-controls={`set-${set.id}-songs`}
        aria-label={`${set.name}, ${songCount} ${songCount === 1 ? "Song" : "Songs"}`}
        className="flex min-h-[44px] w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-neutral-50"
      >
        <span className="text-sm font-semibold text-neutral-900">{set.name}</span>
        <span className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">
            {songCount} {songCount === 1 ? "Song" : "Songs"}
          </span>
          <svg
            className={`h-4 w-4 text-neutral-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {expanded && (
        <div id={`set-${set.id}-songs`} role="list" className="divide-y divide-neutral-100 px-2 pb-2">
          {set.songs.map((song) => (
            <div key={song.id} role="listitem">
              <SongRow song={song} />
            </div>
          ))}
          {songCount === 0 && (
            <p className="px-3 py-4 text-center text-sm text-neutral-400">
              Keine Songs in diesem Set
            </p>
          )}
        </div>
      )}
    </div>
  );
}
