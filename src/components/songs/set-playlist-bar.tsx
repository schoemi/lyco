"use client";

import { useState } from "react";
import type { AudioRolle } from "@/generated/prisma/client";
import { resolveAudioQuelle, useSetPlaylist } from "./set-playlist-provider";
import PlaylistAudioRolleSelector from "./playlist-audio-rolle-selector";

/**
 * Fixierter Bottom-Player für den Set-Playlist-Modus.
 *
 * Gibt null zurück wenn isPlaylistActive === false.
 * Unterstützt Collapsed/Expanded-Toggle ohne Wiedergabe-Unterbrechung (Req. 7.4).
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */
export default function SetPlaylistBar() {
  const {
    isPlaylistActive,
    isPlaying,
    isPlaylistEnded,
    isLoading,
    activeSong,
    activeSongIndex,
    totalSongs,
    currentTimeMs,
    durationMs,
    volume,
    audioRolle,
    togglePlay,
    skipToNext,
    skipToPrevious,
    setVolume,
    setAudioRolle,
    handleProgressClick,
  } = useSetPlaylist();

  const [collapsed, setCollapsed] = useState(false);

  // Null guard (Req. 7.1, 7.2) — bar only renders when playlist is active
  if (!isPlaylistActive) return null;

  // Compute which audio roles have a source for the active song (Req. 5.1)
  const ALL_ROLLEN: AudioRolle[] = ["STANDARD", "INSTRUMENTAL", "REFERENZ_VOKAL"];
  const availableRollen: AudioRolle[] = activeSong
    ? ALL_ROLLEN.filter((rolle) => resolveAudioQuelle(activeSong, rolle) !== null)
    : [];

  const progress = durationMs > 0 ? (currentTimeMs / durationMs) * 100 : 0;
  const isFirst = activeSongIndex === 0;
  const isLast = activeSongIndex >= totalSongs - 1;

  const formatTime = (ms: number): string => {
    const totalSec = Math.floor(ms / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div
      role="complementary"
      aria-label="Set-Playlist-Player"
      className="fixed bottom-0 inset-x-0 z-50 border-t border-neutral-200 bg-white shadow-2xl"
    >
      {collapsed ? (
        /* ── Collapsed layout ─────────────────────────────────────────────── */
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2">
          {/* Song title */}
          <span className="truncate text-sm font-medium text-neutral-800">
            {activeSong ? activeSong.titel : "—"}
          </span>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Play/Pause button */}
          <button
            type="button"
            onClick={togglePlay}
            disabled={isPlaylistEnded || isLoading}
            aria-label={isPlaying ? "Pause" : "Abspielen"}
            aria-disabled={isPlaylistEnded || isLoading}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-newsong-600 text-white hover:bg-newsong-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>

          {/* Expand button */}
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            aria-label="Player aufklappen"
            aria-expanded={false}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100"
          >
            <ChevronUpIcon />
          </button>
        </div>
      ) : (
        /* ── Expanded layout ──────────────────────────────────────────────── */
        <div className="mx-auto max-w-7xl px-4 py-2 space-y-2">
          {/* Top row: collapse button */}
          <div className="flex justify-start">
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label="Player einklappen"
              aria-expanded={true}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100"
            >
              <ChevronDownIcon />
              <span>Einklappen</span>
            </button>
          </div>

          {/* Controls row */}
          <div className="flex items-center gap-3">
            {/* Prev button */}
            <button
              type="button"
              onClick={skipToPrevious}
              disabled={isFirst || isLoading}
              aria-label="Vorheriger Song"
              aria-disabled={isFirst || isLoading}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <SkipPrevIcon />
            </button>

            {/* Play/Pause button */}
            <button
              type="button"
              onClick={togglePlay}
              disabled={isPlaylistEnded || isLoading}
              aria-label={isPlaying ? "Pause" : "Abspielen"}
              aria-disabled={isPlaylistEnded || isLoading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-newsong-600 text-white hover:bg-newsong-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>

            {/* Next button */}
            <button
              type="button"
              onClick={skipToNext}
              disabled={isLast || isLoading || isPlaylistEnded}
              aria-label="Nächster Song"
              aria-disabled={isLast || isLoading || isPlaylistEnded}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <SkipNextIcon />
            </button>

            {/* Song info */}
            <div className="ml-2 flex-1 min-w-0">
              {activeSong ? (
                <>
                  <p className="truncate text-sm font-medium text-neutral-800">
                    {activeSong.titel}
                  </p>
                  {activeSong.kuenstler && (
                    <p className="truncate text-xs text-neutral-500">
                      {activeSong.kuenstler}
                    </p>
                  )}
                  <p className="text-xs text-neutral-400">
                    Song {activeSongIndex + 1} von {totalSongs}
                  </p>
                </>
              ) : (
                <p className="text-sm text-neutral-400">—</p>
              )}
            </div>

            {/* Audio role selector — shows available roles for the active song (Req. 5.1) */}
            <div className="shrink-0 hidden sm:block">
              <PlaylistAudioRolleSelector
                availableRollen={availableRollen}
                selectedRolle={audioRolle}
                onChange={setAudioRolle}
              />
            </div>

            {/* Volume control */}
            <div className="shrink-0 flex items-center gap-1.5">
              <VolumeIcon />
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(volume * 100)}
                onChange={(e) => setVolume(Number(e.target.value) / 100)}
                aria-label="Lautstärke"
                className="w-20 accent-newsong-600"
              />
            </div>
          </div>

          {/* End-of-playlist indicator */}
          {isPlaylistEnded && (
            <p className="text-center text-xs text-neutral-500 font-medium">
              Playlist beendet
            </p>
          )}

          {/* Progress bar — only shown when duration is known (Req. 4.5) */}
          {durationMs > 0 ? (
            <div className="space-y-1">
              <div
                role="progressbar"
                aria-valuenow={Math.round(progress)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Wiedergabefortschritt"
                className="relative h-2 w-full cursor-pointer overflow-hidden rounded-full bg-neutral-200"
                onClick={handleProgressClick}
              >
                <div
                  className="h-full rounded-full bg-newsong-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs tabular-nums text-neutral-500">
                <span>{formatTime(currentTimeMs)}</span>
                <span>{formatTime(durationMs)}</span>
              </div>
            </div>
          ) : (
            /* Duration unknown — only show elapsed time (Req. 4.5) */
            currentTimeMs > 0 && (
              <div className="text-right text-xs tabular-nums text-neutral-500 pr-1">
                {formatTime(currentTimeMs)}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

/* ── Icons ── */

function PlayIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M6.3 2.84A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.27l9.344-5.891a1.5 1.5 0 000-2.538L6.3 2.841z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z" />
    </svg>
  );
}

function SkipPrevIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M7.712 4.819a.75.75 0 011.065.006l6.958 7.158a.75.75 0 010 1.037l-6.958 7.158a.75.75 0 01-1.07-1.05L13.223 13H3.75a.75.75 0 010-1.5h9.473L7.706 5.876a.75.75 0 01.006-1.057z" />
      <path d="M3 4.75A.75.75 0 013.75 4h.5a.75.75 0 010 1.5h-.5A.75.75 0 013 4.75zM3 15.25A.75.75 0 013.75 15h.5a.75.75 0 010 1.5h-.5A.75.75 0 013 15.25z" />
    </svg>
  );
}

function SkipNextIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M12.288 4.819a.75.75 0 00-1.065.006L4.265 11.983a.75.75 0 000 1.037l6.958 7.158a.75.75 0 001.07-1.05L6.777 13H16.25a.75.75 0 000-1.5H6.777l5.517-5.624a.75.75 0 00-.006-1.057z" />
      <path d="M17 4.75A.75.75 0 0116.25 4h-.5a.75.75 0 000 1.5h.5A.75.75 0 0017 4.75zM17 15.25A.75.75 0 0016.25 15h-.5a.75.75 0 000 1.5h.5A.75.75 0 0017 15.25z" />
    </svg>
  );
}

function ChevronUpIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M9.47 6.47a.75.75 0 011.06 0l4.25 4.25a.75.75 0 11-1.06 1.06L10 8.06l-3.72 3.72a.75.75 0 01-1.06-1.06l4.25-4.25z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function VolumeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4 shrink-0 text-neutral-500"
      aria-hidden="true"
    >
      <path d="M9.293 3.293a1 1 0 011.414 0l3 3A1 1 0 0114 7v6a1 1 0 01-.293.707l-3 3A1 1 0 019 16V4a1 1 0 01.293-.707z" />
      <path d="M3 8a1 1 0 011-1h1.586l.707-.707A1 1 0 0 1 8 7v6a1 1 0 01-1.707.707L5.586 13H4a1 1 0 01-1-1V8z" />
    </svg>
  );
}
