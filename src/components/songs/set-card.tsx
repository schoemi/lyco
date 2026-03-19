"use client";

import { useState } from "react";
import { SongCardGrid } from "./song-card-grid";
import type { DashboardSet } from "../../types/song";

interface SetCardProps {
  set: DashboardSet;
}

export function SetCard({ set }: SetCardProps) {
  const [expanded, setExpanded] = useState(true);
  const songCount = set.songs.length;

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        aria-controls={`set-${set.id}-songs`}
        className="flex w-full items-center justify-between gap-2 py-1 text-left"
      >
        <h2 className="text-sm font-semibold text-neutral-700">
          {set.name}
          <span className="ml-2 text-xs font-normal text-neutral-400">
            {songCount} {songCount === 1 ? "Song" : "Songs"}
          </span>
        </h2>
        <svg
          className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div id={`set-${set.id}-songs`} className="mt-2">
          {songCount === 0 ? (
            <p className="py-4 text-center text-sm text-neutral-400">
              Keine Songs in diesem Set
            </p>
          ) : (
            <SongCardGrid songs={set.songs} />
          )}
        </div>
      )}
    </div>
  );
}
