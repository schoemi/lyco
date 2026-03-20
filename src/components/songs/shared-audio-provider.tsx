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
  const pendingSeekRef = useRef<number | null>(null);
  const wasPlayingRef = useRef(false);

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
    // Firefox Mobile sometimes reports Infinity initially; wait for a real value
    if (Number.isFinite(audio.duration)) {
      setDurationMs(Math.round(audio.duration * 1000));
    }
    // Resume position from previous track after source switch
    const pendingMs = pendingSeekRef.current;
    if (pendingMs != null && pendingMs > 0) {
      const durationSec = audio.duration;
      const targetSec = pendingMs / 1000;
      // Only seek if within the new track's duration (with small tolerance)
      if (Number.isFinite(durationSec) && targetSec < durationSec) {
        audio.currentTime = targetSec;
      }
      // Auto-resume playback if the user was playing before switching
      if (wasPlayingRef.current) {
        audio.play().catch(() => {});
        wasPlayingRef.current = false;
      }
      pendingSeekRef.current = null;
    }
  }, []);

  // Firefox Mobile may resolve duration late via durationchange
  const handleDurationChange = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    setDurationMs(Math.round(audio.duration * 1000));
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      // Explicitly load if Firefox hasn't started network activity yet
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

  const seekTo = useCallback((ms: number): boolean => {
    if (!isMp3 || !audioRef.current) return false;
    audioRef.current.currentTime = ms / 1000;
    return true;
  }, [isMp3]);

  const switchSource = useCallback((index: number) => {
    const audio = audioRef.current;
    const wasPlaying = audio ? !audio.paused : false;
    // Capture current position before switching
    const positionMs = audio ? Math.round(audio.currentTime * 1000) : 0;
    if (audio && !audio.paused) {
      audio.pause();
    }
    pendingSeekRef.current = positionMs;
    wasPlayingRef.current = wasPlaying;
    setActiveIndex(index);
    setIsPlaying(false);
    setCurrentTimeMs(positionMs);
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
      {/* Single shared audio element — key forces remount on source change
          so Firefox Mobile properly resets its internal decoder state. */}
      {isMp3 && activeQuelle && (
        <audio
          key={activeQuelle.id}
          ref={audioRef}
          src={activeQuelle.url}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onDurationChange={handleDurationChange}
          onEnded={() => setIsPlaying(false)}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          preload="auto"
          playsInline
        />
      )}
      {children}
    </SharedAudioContext.Provider>
  );
}
