"use client";

import { forwardRef, useCallback, useImperativeHandle, useRef, useState, useEffect } from "react";
import type { AudioQuelleResponse } from "@/types/audio";

export interface AudioPlayButtonHandle {
  seekTo: (ms: number) => boolean;
}

interface AudioPlayButtonProps {
  audioQuellen: AudioQuelleResponse[];
  activeQuelleId: string | null;
}

/**
 * Compact audio play/pause button for karaoke mode.
 * Only supports MP3 sources (native HTML5 audio).
 * Renders nothing if no playable source is selected.
 */
export const AudioPlayButton = forwardRef<AudioPlayButtonHandle, AudioPlayButtonProps>(
  function AudioPlayButton({ audioQuellen, activeQuelleId }, ref) {
    const activeQuelle = activeQuelleId
      ? audioQuellen.find((q) => q.id === activeQuelleId && q.typ === "MP3")
      : audioQuellen.find((q) => q.typ === "MP3");
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    useImperativeHandle(ref, () => ({
      seekTo(ms: number): boolean {
        const audio = audioRef.current;
        if (!audio || !activeQuelle) return false;
        audio.currentTime = ms / 1000;
        return true;
      },
    }), [activeQuelle]);

    // Stop playback when source changes
    useEffect(() => {
      const audio = audioRef.current;
      if (audio && !audio.paused) {
        audio.pause();
        audio.currentTime = 0;
      }
      setIsPlaying(false);
    }, [activeQuelle?.id]);

    const toggle = useCallback(() => {
      const audio = audioRef.current;
      if (!audio) return;
      if (audio.paused) {
        // Firefox Mobile may not have started loading yet with preload="auto"
        if (audio.readyState === 0) {
          audio.load();
        }
        audio.play().catch(() => {
          // iOS Safari / Firefox Mobile may reject play() — ignore gracefully
        });
      } else {
        audio.pause();
      }
    }, []);

    if (!activeQuelle) return null;

    return (
      <>
        <audio
          key={activeQuelle.id}
          ref={audioRef}
          src={activeQuelle.url}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          preload="auto"
          playsInline
        />
        <button
          onClick={toggle}
          aria-label={isPlaying ? "Audio pausieren" : "Audio abspielen"}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white transition-colors duration-200 hover:bg-white/10 active:bg-white/20"
        >
          {isPlaying ? (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <polygon points="6,4 20,12 6,20" />
            </svg>
          )}
        </button>
      </>
    );
  }
);
