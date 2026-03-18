"use client";

import {
  forwardRef,
  useImperativeHandle,
} from "react";
import type { AudioQuelleResponse } from "@/types/audio";
import { formatTimecode } from "@/lib/audio/timecode";
import { useSharedAudio } from "./shared-audio-provider";

export interface AudioPlayerHandle {
  seekTo: (ms: number) => boolean;
}

interface AudioPlayerProps {
  audioQuellen: AudioQuelleResponse[];
  onTimeUpdate?: (currentTimeMs: number) => void;
}

function formatTime(ms: number): string {
  const raw = formatTimecode(ms);
  return raw.slice(1, -1);
}

/**
 * Extract Spotify track ID from various URL formats.
 */
function spotifyEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/");
    const trackIdx = parts.indexOf("track");
    const trackId = trackIdx >= 0 ? parts[trackIdx + 1] : parts[parts.length - 1];
    return `https://open.spotify.com/embed/track/${trackId}`;
  } catch {
    return url;
  }
}

/**
 * Extract Apple Music embed URL from various URL formats.
 */
function appleMusicEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname === "embed.music.apple.com") return url;
    if (u.hostname === "music.apple.com") {
      return `https://embed.music.apple.com${u.pathname}${u.search}`;
    }
    return url;
  } catch {
    return url;
  }
}

/**
 * Extract YouTube video ID and build embed URL.
 */
function youtubeEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return `https://www.youtube.com/embed${u.pathname}`;
    if (u.pathname.startsWith("/embed/")) return `https://www.youtube.com${u.pathname}`;
    const v = u.searchParams.get("v");
    if (v) return `https://www.youtube.com/embed/${v}`;
    return url;
  } catch {
    return url;
  }
}

const AudioPlayer = forwardRef<AudioPlayerHandle, AudioPlayerProps>(
  function AudioPlayer({ audioQuellen }, ref) {
    const {
      isPlaying,
      currentTimeMs,
      durationMs,
      activeIndex,
      togglePlay,
      seekTo,
      switchSource,
      handleProgressClick,
    } = useSharedAudio();

    const activeQuelle = audioQuellen[activeIndex] ?? null;
    const isMp3 = activeQuelle?.typ === "MP3";

    useImperativeHandle(ref, () => ({ seekTo }), [seekTo]);

    if (!activeQuelle) {
      return (
        <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-500">
          Keine Audio-Quellen vorhanden.
        </div>
      );
    }

    const progress = durationMs > 0 ? (currentTimeMs / durationMs) * 100 : 0;

    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-4 space-y-3">
        {/* Source switcher */}
        {audioQuellen.length > 1 && (
          <div className="flex gap-1" role="tablist" aria-label="Audio-Quelle wählen">
            {audioQuellen.map((q, i) => (
              <button
                key={q.id}
                role="tab"
                aria-selected={i === activeIndex}
                onClick={() => switchSource(i)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
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

        {/* MP3 player */}
        {isMp3 && (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlay}
                aria-label={isPlaying ? "Pause" : "Abspielen"}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-newsong-600 text-white hover:bg-newsong-700"
              >
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
              </button>
              <span className="min-w-[80px] text-xs tabular-nums text-neutral-600">
                {formatTime(currentTimeMs)} / {formatTime(durationMs)}
              </span>
            </div>

            <div
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Wiedergabefortschritt"
              className="h-2 w-full cursor-pointer overflow-hidden rounded-full bg-neutral-200"
              onClick={handleProgressClick}
            >
              <div
                className="h-full rounded-full bg-newsong-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Spotify embed */}
        {activeQuelle.typ === "SPOTIFY" && (
          <iframe
            title={`Spotify: ${activeQuelle.label || "Audio"}`}
            src={spotifyEmbedUrl(activeQuelle.url)}
            width="100%"
            height="152"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="rounded-lg"
          />
        )}

        {/* YouTube embed */}
        {activeQuelle.typ === "YOUTUBE" && (
          <iframe
            title={`YouTube: ${activeQuelle.label || "Video"}`}
            src={youtubeEmbedUrl(activeQuelle.url)}
            width="100%"
            height="315"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            className="rounded-lg"
          />
        )}

        {/* Apple Music embed */}
        {activeQuelle.typ === "APPLE_MUSIC" && (
          <iframe
            title={`Apple Music: ${activeQuelle.label || "Audio"}`}
            src={appleMusicEmbedUrl(activeQuelle.url)}
            width="100%"
            height="175"
            allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write"
            sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-top-navigation-by-user-activation"
            loading="lazy"
            className="rounded-lg"
          />
        )}
      </div>
    );
  },
);

AudioPlayer.displayName = "AudioPlayer";
export default AudioPlayer;
export { AudioPlayer };

/* ── Inline SVG icons ── */

function PlayIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path d="M6.3 2.84A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.27l9.344-5.891a1.5 1.5 0 000-2.538L6.3 2.841z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z" />
    </svg>
  );
}
