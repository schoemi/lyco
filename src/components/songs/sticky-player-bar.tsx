"use client";

import { useRef, useState } from "react";
import { formatTimecode } from "@/lib/audio/timecode";
import { useSharedAudio } from "./shared-audio-provider";

interface StickyPlayerBarProps {
  visible: boolean;
}

function formatTime(ms: number): string {
  const raw = formatTimecode(ms);
  return raw.slice(1, -1);
}

/**
 * Bottom-sheet player that slides up when the main AudioPlayer
 * scrolls out of the viewport. Can be collapsed to show only a
 * small handle tab. Shares audio state via SharedAudioProvider.
 */
export default function StickyPlayerBar({ visible }: StickyPlayerBarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const {
    isPlaying,
    currentTimeMs,
    durationMs,
    activeIndex,
    audioQuellen,
    togglePlay,
    switchSource,
    handleProgressClick,
  } = useSharedAudio();

  const activeQuelle = audioQuellen[activeIndex] ?? null;
  const isMp3 = activeQuelle?.typ === "MP3";

  if (!activeQuelle || !isMp3) return null;

  const progress = durationMs > 0 ? (currentTimeMs / durationMs) * 100 : 0;
  const mp3Quellen = audioQuellen
    .map((q, i) => ({ q, i }))
    .filter(({ q }) => q.typ === "MP3");

  // Three visual states via translateY on the body container:
  // 1. !visible → fully off-screen (100% down)
  // 2. visible + collapsed → body off-screen, but handle peeks above
  // 3. visible + expanded → body flush at bottom
  let containerClasses = "fixed inset-x-0 bottom-0 z-50 !m-0 transition-transform duration-300 ease-in-out";
  if (!visible) {
    containerClasses += " translate-y-full pointer-events-none";
  } else if (collapsed) {
    // Push body off-screen but handle (-top-8) still peeks out
    containerClasses += " translate-y-full";
  } else {
    containerClasses += " translate-y-0";
  }

  return (
    <div
      role="complementary"
      aria-label="Audio-Player (fixiert)"
      data-testid="sticky-player"
      className={containerClasses}
    >
      {/* Handle tab — absolutely positioned above the body */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-8">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Player aufklappen" : "Player einklappen"}
          aria-expanded={!collapsed}
          className={`flex h-8 w-20 items-center justify-center rounded-t-xl border border-b-0 border-neutral-300 bg-white shadow-md hover:bg-neutral-50 transition-opacity duration-300 ${
            visible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        >
          <ChevronIcon collapsed={collapsed} />
        </button>
      </div>

      {/* Player body */}
      <div
        ref={bodyRef}
        className="border-t border-neutral-300 bg-white px-4 pb-2 pt-2.5 shadow-2xl"
      >
        <div className="mx-auto max-w-7xl space-y-2">
          {/* Controls row */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause" : "Abspielen"}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-newsong-600 text-white hover:bg-newsong-700"
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>

            {mp3Quellen.length > 1 && (
              <div className="flex shrink-0 gap-1">
                {mp3Quellen.map(({ q, i }) => (
                  <button
                    key={q.id}
                    onClick={() => switchSource(i)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      i === activeIndex
                        ? "bg-newsong-600 text-white"
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                  >
                    {q.label || q.typ}
                  </button>
                ))}
              </div>
            )}

            <span className="ml-auto shrink-0 text-sm tabular-nums text-neutral-600">
              {formatTime(currentTimeMs)} / {formatTime(durationMs)}
            </span>
          </div>

          {/* Progress bar */}
          <div
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Wiedergabefortschritt"
            className="h-2.5 w-full cursor-pointer overflow-hidden rounded-full bg-neutral-200"
            onClick={handleProgressClick}
          >
            <div
              className="h-full rounded-full bg-newsong-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function ChevronIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`h-5 w-5 text-neutral-500 transition-transform duration-200 ${
        collapsed ? "" : "rotate-180"
      }`}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M9.47 6.47a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 1 1-1.06 1.06L10 8.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06l4.25-4.25z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
      <path d="M6.3 2.84A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.27l9.344-5.891a1.5 1.5 0 000-2.538L6.3 2.841z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
      <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z" />
    </svg>
  );
}
