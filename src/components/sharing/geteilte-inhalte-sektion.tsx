"use client";

import { useState } from "react";
import Link from "next/link";
import { ProgressBar } from "@/components/songs/progress-bar";
import { StatusPunkt } from "@/components/gamification/status-punkt";
import type { GeteilteInhalte, SongWithProgress } from "@/types/song";

interface GeteilteInhalteSektionProps {
  geteilteInhalte: GeteilteInhalte;
}

function SharedSongCard({ song, eigentuemerName }: { song: SongWithProgress; eigentuemerName: string }) {
  const statusLabel = song.progress <= 0 ? "neu" : song.progress >= 100 ? "gelernt" : `${Math.round(song.progress)}% gelernt`;
  const ariaLabel = `${song.titel}${song.kuenstler ? `, ${song.kuenstler}` : ""} – ${statusLabel}, geteilt von ${eigentuemerName}`;

  return (
    <Link
      href={`/songs/${song.id}`}
      className="group block overflow-hidden rounded-lg shadow-md transition-shadow hover:shadow-lg"
      aria-label={ariaLabel}
    >
      <div className="relative aspect-square">
        {song.coverUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${song.coverUrl})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-400 to-neutral-600" />
        )}

        <div className="absolute top-2 right-2 z-10">
          <StatusPunkt fortschritt={song.progress} />
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/70 to-transparent px-3 pt-8 pb-0">
          <p className="truncate text-sm font-semibold text-white">{song.titel}</p>
          {song.kuenstler && (
            <p className="truncate text-xs text-white/80">{song.kuenstler}</p>
          )}
          <p className="truncate text-xs text-white/60">von {eigentuemerName}</p>
          <div className="mt-1" />
          <ProgressBar value={song.progress} className="rounded-none" />
        </div>
      </div>
    </Link>
  );
}

export default function GeteilteInhalteSektion({ geteilteInhalte }: GeteilteInhalteSektionProps) {
  const { sets, songs } = geteilteInhalte;

  if (sets.length === 0 && songs.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold text-neutral-700">Mit mir geteilt</h2>

      {/* Shared sets */}
      {sets.map((empfangenesSet) => (
        <SharedSetCard key={empfangenesSet.freigabeId} empfangenesSet={empfangenesSet} />
      ))}

      {/* Individually shared songs */}
      {songs.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {songs.map((empfangenerSong) => (
            <SharedSongCard
              key={empfangenerSong.freigabeId}
              song={empfangenerSong.song}
              eigentuemerName={empfangenerSong.eigentuemerName}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function SharedSetCard({ empfangenesSet }: { empfangenesSet: GeteilteInhalte["sets"][number] }) {
  const [expanded, setExpanded] = useState(false);
  const songCount = empfangenesSet.songs.length;

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        aria-controls={`shared-set-${empfangenesSet.set.id}-songs`}
        className="flex w-full items-center justify-between gap-2 py-1 text-left"
      >
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-neutral-700">
            {empfangenesSet.set.name}
            <span className="ml-2 text-xs font-normal text-neutral-400">
              {songCount} {songCount === 1 ? "Song" : "Songs"}
            </span>
          </h3>
          <p className="truncate text-xs text-neutral-500">
            von {empfangenesSet.eigentuemerName}
            {empfangenesSet.set.description && ` · ${empfangenesSet.set.description}`}
          </p>
        </div>
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
        <div id={`shared-set-${empfangenesSet.set.id}-songs`} className="mt-2">
          {songCount === 0 ? (
            <p className="py-4 text-center text-sm text-neutral-400">
              Keine Songs in diesem Set
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {empfangenesSet.songs.map((song) => (
                <SharedSongCard
                  key={song.id}
                  song={song}
                  eigentuemerName={empfangenesSet.eigentuemerName}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
