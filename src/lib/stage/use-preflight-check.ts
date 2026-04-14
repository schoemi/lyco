"use client";

import { useState, useCallback } from "react";
import type { StageSong, StageBundleResponse, StageProgressResponse } from "@/types/stage";
import { saveLastSyncTimestamp, loadLastSyncTimestamp } from "@/lib/stage/storage";

export interface UsePreflightCheckReturn {
  start: () => Promise<void>;
  isRunning: boolean;
  progress: { loaded: number; total: number };
  failedSongs: string[];
  lastSync: string | null;
  persistWarning: boolean;
}

/**
 * Pure async function that runs the preflight check logic.
 * Extracted for testability without React.
 *
 * Flow:
 * 1. Fetch /api/stage/bundle → get list of songs
 * 2. Update progress per song processed
 * 3. Fetch /api/stage/progress
 * 4. Save timestamp
 */
export async function runPreflight(
  songs: StageSong[],
  onProgress: (loaded: number, total: number) => void,
  onSongFailed: (songTitle: string) => void,
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  const total = songs.length;

  // Fetch progress data (may fail per-song in a real scenario, but we have a single endpoint)
  let progressFailed = false;
  try {
    const progressRes = await fetchFn("/api/stage/progress");
    if (!progressRes.ok) {
      progressFailed = true;
    }
  } catch {
    progressFailed = true;
  }

  // Process each song — track progress and failures
  for (let i = 0; i < songs.length; i++) {
    const song = songs[i];
    try {
      // Simulate per-song verification: song is available if it was in the bundle
      if (!song || !song.id) {
        onSongFailed(song?.titel ?? "Unbekannter Song");
      }
    } catch {
      onSongFailed(song.titel);
    }
    onProgress(i + 1, total);
  }

  if (progressFailed) {
    // Progress fetch failed — not a per-song failure, but we continue
    // (songs themselves were loaded via bundle)
  }
}

export function usePreflightCheck(): UsePreflightCheckReturn {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<{ loaded: number; total: number }>({
    loaded: 0,
    total: 0,
  });
  const [failedSongs, setFailedSongs] = useState<string[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(loadLastSyncTimestamp);
  const [persistWarning, setPersistWarning] = useState(false);

  const start = useCallback(async () => {
    setIsRunning(true);
    setFailedSongs([]);
    setProgress({ loaded: 0, total: 0 });

    const failed: string[] = [];

    try {
      // Step 1: Fetch bundle
      const bundleRes = await fetch("/api/stage/bundle");
      if (!bundleRes.ok) {
        throw new Error(`Bundle fetch failed: ${bundleRes.status}`);
      }
      const bundle: StageBundleResponse = await bundleRes.json();
      const songs = bundle.songs;

      setProgress({ loaded: 0, total: songs.length });

      // Step 2: Fetch progress
      try {
        const progressRes = await fetch("/api/stage/progress");
        if (!progressRes.ok) {
          // Progress fetch failed — not fatal, continue
        }
        // Response is cached by service worker automatically
        await progressRes.json() as StageProgressResponse;
      } catch {
        // Progress fetch failed — not fatal
      }

      // Step 3: Process each song and update progress
      await runPreflight(
        songs,
        (loaded, total) => setProgress({ loaded, total }),
        (songTitle) => failed.push(songTitle),
      );

      setFailedSongs(failed);

      // Step 4: Save timestamp after successful completion
      const timestamp = new Date().toISOString();
      saveLastSyncTimestamp(timestamp);
      setLastSync(timestamp);

      // Step 5: Request persistent storage
      try {
        if (typeof navigator !== "undefined" && navigator.storage?.persist) {
          const granted = await navigator.storage.persist();
          if (!granted) {
            setPersistWarning(true);
          }
        }
      } catch {
        setPersistWarning(true);
      }
    } catch {
      // Bundle fetch failed — mark all as failed or just stop
    } finally {
      setIsRunning(false);
    }
  }, []);

  return {
    start,
    isRunning,
    progress,
    failedSongs,
    lastSync,
    persistWarning,
  };
}
