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
import type { AudioRolle } from "@/generated/prisma/client";
import type { AudioQuelleResponse } from "@/types/audio";
import type { PlaylistSong, SetPlaylistResponse } from "@/types/playlist";

// ---------------------------------------------------------------------------
// Volume persistence (shared key with SharedAudioProvider — Req. 6.5)
// ---------------------------------------------------------------------------

const VOLUME_SESSION_KEY = "audio-player-volume";
const DEFAULT_VOLUME = 0.8;

function loadSessionVolume(): number {
  try {
    const stored = sessionStorage.getItem(VOLUME_SESSION_KEY);
    if (stored !== null) {
      const parsed = parseFloat(stored);
      if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) return parsed;
    }
  } catch {
    // sessionStorage unavailable (SSR, private browsing)
  }
  return DEFAULT_VOLUME;
}

function saveSessionVolume(volume: number): void {
  try {
    sessionStorage.setItem(VOLUME_SESSION_KEY, String(volume));
  } catch {
    // ignore – best effort
  }
}

// ---------------------------------------------------------------------------
// Utility: resolveAudioQuelle
// ---------------------------------------------------------------------------
// Selects the best-matching MP3 source for a song given a desired AudioRolle.
//
// Algorithm (Requirements 5.3, 5.4):
//   1. Filter to MP3 sources only (non-MP3 sources are never played)
//   2. Return the source matching the requested rolle, if present
//   3. Fall back to STANDARD if the requested rolle is unavailable
//   4. Return null if no MP3 fallback exists → song will be skipped (Req. 5.4)
// ---------------------------------------------------------------------------
export function resolveAudioQuelle(
  song: PlaylistSong,
  rolle: AudioRolle,
): AudioQuelleResponse | null {
  const mp3Quellen = song.audioQuellen.filter((q) => q.typ === "MP3");
  return (
    mp3Quellen.find((q) => q.rolle === rolle) ??
    mp3Quellen.find((q) => q.rolle === "STANDARD") ??
    null
  );
}

// ---------------------------------------------------------------------------
// Utility: sortPlaylistSongs
// ---------------------------------------------------------------------------
// Sorts an array of PlaylistSongs for playlist playback order.
//
// Sort criteria (Requirement 1.5):
//   Primary:   orderIndex ASC
//   Tiebreaker: titel ASC (alphabetical)
//
// Returns a new sorted array; the original array is not mutated.
// ---------------------------------------------------------------------------
export function sortPlaylistSongs(songs: PlaylistSong[]): PlaylistSong[] {
  return [...songs].sort((a, b) => {
    if (a.orderIndex !== b.orderIndex) {
      return a.orderIndex - b.orderIndex;
    }
    return a.titel.localeCompare(b.titel);
  });
}

// ---------------------------------------------------------------------------
// Context Interface
// ---------------------------------------------------------------------------

export interface SetPlaylistState {
  // Playlist data
  playlistSongs: PlaylistSong[];
  totalSongs: number;
  activeSongIndex: number;
  activeSong: PlaylistSong | null;

  // Playback state
  isPlaying: boolean;
  currentTimeMs: number;
  durationMs: number;
  volume: number; // 0–1, persisted via sessionStorage key "audio-player-volume"

  // Mode (Audio role)
  audioRolle: AudioRolle;

  // Status flags
  isPlaylistActive: boolean;
  isPlaylistEnded: boolean;
  isLoading: boolean;
  skippedSongCount: number; // Songs without MP3 source, from API response (Req. 1.4)

  // Actions
  startPlaylist: () => void;
  stopPlaylist: () => void;
  togglePlay: () => void;
  skipToNext: () => void;
  skipToPrevious: () => void;
  skipToSong: (index: number) => void;
  setAudioRolle: (rolle: AudioRolle) => void;
  setVolume: (volume: number) => void;
  handleProgressClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export interface SetPlaylistProviderProps {
  setId: string;
  children?: ReactNode;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const SetPlaylistContext = createContext<SetPlaylistState | null>(null);

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSetPlaylist(): SetPlaylistState {
  const ctx = useContext(SetPlaylistContext);
  if (!ctx) {
    throw new Error("useSetPlaylist must be used within a SetPlaylistProvider");
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function SetPlaylistProvider({ setId, children }: SetPlaylistProviderProps) {
  // ── Playlist state ────────────────────────────────────────────────────────
  const [playlistSongs, setPlaylistSongs] = useState<PlaylistSong[]>([]);
  const [activeSongIndex, setActiveSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME);
  const [audioRolle, setAudioRolleState] = useState<AudioRolle>("STANDARD");
  const [isPlaylistActive, setIsPlaylistActive] = useState(false);
  const [isPlaylistEnded, setIsPlaylistEnded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [skippedSongCount, setSkippedSongCount] = useState(0);

  // ── Audio element ref ─────────────────────────────────────────────────────
  // The <audio> element is rendered in JSX with key={activeSong.id + ':' + activeQuelle.id}
  // so React forces a remount (and resets the decoder) whenever the song or
  // source changes. This is the same pattern used in SharedAudioProvider.
  const audioRef = useRef<HTMLAudioElement>(null);

  // pendingSeekRef: position (ms) to seek to after the new audio element loads.
  // Used for mode-switching while preserving playback position (Req. 5.5).
  // Task 6.3 writes to this ref; task 6.2 reads it in onLoadedMetadata.
  const pendingSeekRef = useRef<number | null>(null);

  // wasPlayingRef: whether the user was playing before a source switch.
  // Task 6.3 writes to this; onLoadedMetadata resumes playback accordingly.
  const wasPlayingRef = useRef(false);

  // skipOnErrorRef: set of song indices whose source failed to load this cycle.
  // Used by _advanceToNext to skip errored songs (Req. 2.3).
  const skipOnErrorRef = useRef<Set<number>>(new Set());

  // ── Derived values ────────────────────────────────────────────────────────
  const activeSong = playlistSongs[activeSongIndex] ?? null;
  const totalSongs = playlistSongs.length;
  const activeQuelle = activeSong ? resolveAudioQuelle(activeSong, audioRolle) : null;

  // ── Load volume from sessionStorage on mount ──────────────────────────────
  useEffect(() => {
    setVolumeState(loadSessionVolume());
  }, []);

  // ── Sync volume to audio element ─────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume;
  }, [volume]);

  // ── Audio event handlers ──────────────────────────────────────────────────

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTimeMs(Math.round(audio.currentTime * 1000));
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (Number.isFinite(audio.duration)) {
      setDurationMs(Math.round(audio.duration * 1000));
    }
    // Apply a pending seek (from mode switch — task 6.3)
    const pendingMs = pendingSeekRef.current;
    if (pendingMs != null && pendingMs > 0) {
      const durationSec = audio.duration;
      const targetSec = pendingMs / 1000;
      if (Number.isFinite(durationSec) && targetSec < durationSec) {
        audio.currentTime = targetSec;
      }
      pendingSeekRef.current = null;
    }
    // Resume playback if was playing before source switch (task 6.3)
    if (wasPlayingRef.current) {
      audio.play().catch(() => {});
      wasPlayingRef.current = false;
    }
  }, []);

  const handleDurationChange = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    setDurationMs(Math.round(audio.duration * 1000));
  }, []);

  // ── _advanceToNext ────────────────────────────────────────────────────────
  // Moves to the next song. Skips songs whose source failed (Req. 2.3).
  // If no next song is available, marks the playlist as ended (Req. 2.2).
  // Uses a short delay (≤ 2 seconds) before starting the next song (Req. 2.1).
  //
  // Note: this function reads from React state. Because it's called from
  // onEnded (which fires asynchronously from the audio element), we use
  // a ref-based capture of the current index via a closure over the
  // setActiveSongIndex functional updater pattern.
  const _advanceToNext = useCallback(
    (currentIndex: number, songs: PlaylistSong[], rolle: AudioRolle) => {
      // Find the next playable song after currentIndex
      let nextIndex = currentIndex + 1;
      while (nextIndex < songs.length) {
        // Skip songs whose source errored this cycle
        if (skipOnErrorRef.current.has(nextIndex)) {
          nextIndex++;
          continue;
        }
        // Skip songs with no resolvable source for the current rolle
        const nextSong = songs[nextIndex];
        if (!nextSong || !resolveAudioQuelle(nextSong, rolle)) {
          nextIndex++;
          continue;
        }
        break;
      }

      if (nextIndex >= songs.length) {
        // End of playlist (Req. 2.2)
        setIsPlaylistEnded(true);
        setIsPlaying(false);
        return;
      }

      // Advance to the next song after a short delay (Req. 2.1 — max 2 seconds)
      setTimeout(() => {
        setActiveSongIndex(nextIndex);
        setCurrentTimeMs(0);
        setDurationMs(0);
        // isPlaying stays true — onPlay event on the new audio element will confirm
        // We set it true here to ensure UI is responsive immediately
        setIsPlaying(true);
      }, 300); // 300ms is well within the 2-second requirement
    },
    [],
  );

  // We need current state values in the onEnded handler. Use refs to avoid
  // stale closure issues (the audio element's event listeners are set at
  // mount time and don't re-register when state changes).
  const activeSongIndexRef = useRef(activeSongIndex);
  const playlistSongsRef = useRef(playlistSongs);
  const audioRolleRef = useRef(audioRolle);
  const isPlayingRef = useRef(isPlaying);

  useEffect(() => {
    activeSongIndexRef.current = activeSongIndex;
  }, [activeSongIndex]);

  useEffect(() => {
    playlistSongsRef.current = playlistSongs;
  }, [playlistSongs]);

  useEffect(() => {
    audioRolleRef.current = audioRolle;
  }, [audioRolle]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const handleEnded = useCallback(() => {
    _advanceToNext(
      activeSongIndexRef.current,
      playlistSongsRef.current,
      audioRolleRef.current,
    );
  }, [_advanceToNext]);

  const handleError = useCallback(() => {
    // Mark the current song's source as errored so _advanceToNext will skip it
    skipOnErrorRef.current.add(activeSongIndexRef.current);
    // Auto-advance to the next song (Req. 2.3)
    _advanceToNext(
      activeSongIndexRef.current,
      playlistSongsRef.current,
      audioRolleRef.current,
    );
  }, [_advanceToNext]);

  // ── Start new song when activeSongIndex changes ───────────────────────────
  // When isPlaying is true and the index changes (via skip or auto-advance),
  // we need to start playing the new audio element. Since <audio key={...}>
  // remounts, we trigger play after metadata loads (in handleLoadedMetadata).
  // For the initial song start, we set wasPlayingRef before changing the index.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isPlayingRef.current) return;
    // Attempt to play the new element. The element may not be ready yet —
    // handleLoadedMetadata will also attempt to play if wasPlayingRef is set.
    audio.volume = volume;
    audio.play().catch(() => {
      // Browser may reject play() if not ready yet; handleLoadedMetadata handles it
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSongIndex]);

  // ── Actions ───────────────────────────────────────────────────────────────

  // startPlaylist: fetch /api/sets/:setId/playlist, sort songs, set index 0, start playing
  const startPlaylist = useCallback(async () => {
    setIsLoading(true);
    setIsPlaylistActive(true);
    setIsPlaylistEnded(false);
    setActiveSongIndex(0);
    setCurrentTimeMs(0);
    setDurationMs(0);
    skipOnErrorRef.current = new Set();

    try {
      const res = await fetch(`/api/sets/${setId}/playlist`);
      if (!res.ok) {
        throw new Error(`Failed to load playlist: ${res.status}`);
      }
      const data: SetPlaylistResponse = await res.json() as SetPlaylistResponse;
      const sorted = sortPlaylistSongs(data.songs);
      setSkippedSongCount(data.skippedSongCount);

      if (sorted.length === 0) {
        // No playable songs — UI should show a message (handled by consumer)
        setIsLoading(false);
        setIsPlaying(false);
        return;
      }

      setPlaylistSongs(sorted);
      setActiveSongIndex(0);
      setIsLoading(false);
      // Start playing — wasPlayingRef ensures handleLoadedMetadata starts playback
      wasPlayingRef.current = true;
      setIsPlaying(true);
    } catch (err) {
      console.error("SetPlaylistProvider: failed to load playlist", err);
      setIsLoading(false);
      setIsPlaying(false);
    }
  }, [setId]);

  const stopPlaylist = useCallback(() => {
    const audio = audioRef.current;
    if (audio && !audio.paused) {
      audio.pause();
    }
    setIsPlaylistActive(false);
    setIsPlaying(false);
    setIsPlaylistEnded(false);
    setActiveSongIndex(0);
    setCurrentTimeMs(0);
    setDurationMs(0);
    setPlaylistSongs([]);
    setSkippedSongCount(0);
    skipOnErrorRef.current = new Set();
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      setIsPlaying((prev) => !prev);
      return;
    }
    if (audio.paused) {
      if (audio.readyState === 0) {
        audio.load();
      }
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, []);

  // skipToNext: advance to next song, preserve isPlaying state (Req. 6.6)
  const skipToNext = useCallback(() => {
    if (activeSongIndex >= playlistSongs.length - 1) return;

    const audio = audioRef.current;
    const currentlyPlaying = audio ? !audio.paused : isPlayingRef.current;

    if (audio && !audio.paused) {
      audio.pause();
    }

    // If we were playing, wasPlayingRef will trigger auto-play on the new element
    wasPlayingRef.current = currentlyPlaying;
    pendingSeekRef.current = null; // start from beginning of new song

    setActiveSongIndex((prev) => prev + 1);
    setCurrentTimeMs(0);
    setDurationMs(0);
    // Preserve isPlaying state (Req. 6.6): if paused, stay paused
    setIsPlaying(currentlyPlaying);
    setIsPlaylistEnded(false);
  }, [activeSongIndex, playlistSongs.length]);

  // skipToPrevious: go back to previous song, preserve isPlaying state (Req. 6.6)
  const skipToPrevious = useCallback(() => {
    if (activeSongIndex <= 0) return;

    const audio = audioRef.current;
    const currentlyPlaying = audio ? !audio.paused : isPlayingRef.current;

    if (audio && !audio.paused) {
      audio.pause();
    }

    wasPlayingRef.current = currentlyPlaying;
    pendingSeekRef.current = null;

    setActiveSongIndex((prev) => prev - 1);
    setCurrentTimeMs(0);
    setDurationMs(0);
    setIsPlaying(currentlyPlaying);
    setIsPlaylistEnded(false);
  }, [activeSongIndex]);

  // skipToSong: jump to a specific index, preserve isPlaying state (Req. 6.6)
  const skipToSong = useCallback(
    (index: number) => {
      if (index < 0 || index >= playlistSongs.length) return;
      if (index === activeSongIndex) return;

      const audio = audioRef.current;
      const currentlyPlaying = audio ? !audio.paused : isPlayingRef.current;

      if (audio && !audio.paused) {
        audio.pause();
      }

      wasPlayingRef.current = currentlyPlaying;
      pendingSeekRef.current = null;

      setActiveSongIndex(index);
      setCurrentTimeMs(0);
      setDurationMs(0);
      setIsPlaying(currentlyPlaying);
      setIsPlaylistEnded(false);
    },
    [activeSongIndex, playlistSongs.length],
  );

  // setAudioRolle: implemented here for completeness; task 6.3 extends it
  // to save currentTime and set pendingSeekRef for seamless source switching
  const setAudioRolle = useCallback(
    (rolle: AudioRolle) => {
      const audio = audioRef.current;
      const currentlyPlaying = audio ? !audio.paused : isPlayingRef.current;
      const positionMs = audio ? Math.round(audio.currentTime * 1000) : 0;

      if (audio && !audio.paused) {
        audio.pause();
      }

      // Preserve position and play state across the source switch (Req. 5.5)
      pendingSeekRef.current = positionMs;
      wasPlayingRef.current = currentlyPlaying;

      setAudioRolleState(rolle);
      setIsPlaying(false); // will be restored by handleLoadedMetadata if wasPlayingRef is set
    },
    [],
  );

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    saveSessionVolume(clamped);
    const audio = audioRef.current;
    if (audio) audio.volume = clamped;
  }, []);

  // handleProgressClick: seek within the current song
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

  // ── Context value ─────────────────────────────────────────────────────────

  const value: SetPlaylistState = {
    playlistSongs,
    totalSongs,
    activeSongIndex,
    activeSong,
    isPlaying,
    currentTimeMs,
    durationMs,
    volume,
    audioRolle,
    isPlaylistActive,
    isPlaylistEnded,
    isLoading,
    skippedSongCount,
    startPlaylist,
    stopPlaylist,
    togglePlay,
    skipToNext,
    skipToPrevious,
    skipToSong,
    setAudioRolle,
    setVolume,
    handleProgressClick,
  };

  // ── Render ────────────────────────────────────────────────────────────────
  // The <audio> element uses key={activeSong.id + ':' + activeQuelle.id} to
  // force a remount whenever the active song or source changes. This ensures
  // the browser decoder resets cleanly (critical for Firefox Mobile).
  return (
    <SetPlaylistContext.Provider value={value}>
      {isPlaylistActive && activeSong && activeQuelle && (
        <audio
          key={`${activeSong.id}:${activeQuelle.id}`}
          ref={audioRef}
          src={activeQuelle.url}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onDurationChange={handleDurationChange}
          onEnded={handleEnded}
          onError={handleError}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          preload="auto"
          playsInline
        />
      )}
      {children}
    </SetPlaylistContext.Provider>
  );
}

export default SetPlaylistProvider;
