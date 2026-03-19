"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AudioQuelleResponse } from "@/types/audio";

interface SharedAudioState {
  isPlaying: boolean;
  currentTimeMs: number;
  durationMs: number;
  activeIndex: number;
  audioQuellen: AudioQuelleResponse[];
  togglePlay: () => void;
  seekTo: (ms: number) => boolean;
  switchSource: (index: number) => void;
  handleProgressClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

const SharedAudioContext = createContext<SharedAudioState | null>(null);

export function useSharedAudio() {
  const ctx = useContext(SharedAudioContext);
  if (!ctx) throw new Error("useSharedAudio must be used within SharedAudioProvider");
  return ctx;
}

interface SharedAudioProviderProps {
  audioQuellen: AudioQuelleResponse[];
  onTimeUpdate?: (currentTimeMs: number) => void;
  children: ReactNode;
}

export function SharedAudioProvider({ audioQuellen, onTimeUpdate, children }: SharedAudioProviderProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  const activeQuelle = audioQuellen[activeIndex] ?? null;
  const isMp3 = activeQuelle?.typ === "MP3";

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const ms = Math.round(audio.currentTime * 1000);
    setCurrentTimeMs(ms);
    onTimeUpdate?.(ms);
  }, [onTimeUpdate]);

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setDurationMs(Math.round(audio.duration * 1000));
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => {
        // iOS Safari rejects play() without user gesture — ignore gracefully
      });
    } else {
      audio.pause();
    }
  }, []);

  const seekTo = useCallback((ms: number): boolean => {
    if (!isMp3 || !audioRef.current) return false;
    audioRef.current.currentTime = ms / 1000;
    return true;
  }, [isMp3]);

  const switchSource = useCallback((index: number) => {
    const audio = audioRef.current;
    if (audio && !audio.paused) {
      audio.pause();
    }
    setActiveIndex(index);
    setIsPlaying(false);
    setCurrentTimeMs(0);
    setDurationMs(0);
  }, []);

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current;
      if (!audio || !durationMs) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      audio.currentTime = (ratio * durationMs) / 1000;
    },
    [durationMs],
  );

  const value: SharedAudioState = {
    isPlaying,
    currentTimeMs,
    durationMs,
    activeIndex,
    audioQuellen,
    togglePlay,
    seekTo,
    switchSource,
    handleProgressClick,
  };

  return (
    <SharedAudioContext.Provider value={value}>
      {/* Single shared audio element */}
      {isMp3 && activeQuelle && (
        <audio
          ref={audioRef}
          src={activeQuelle.url}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          preload="metadata"
          playsInline
        />
      )}
      {children}
    </SharedAudioContext.Provider>
  );
}
