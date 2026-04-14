"use client";

import { useState, useEffect } from "react";
import type {
  StageBundleResponse,
  StageProgressResponse,
  StageSet,
  StageSong,
} from "@/types/stage";
import { loadLastSyncTimestamp } from "@/lib/stage/storage";

export interface UseStageDataReturn {
  sets: StageSet[];
  songs: Map<string, StageSong>;
  progress: Map<string, number>; // stropheId → prozent
  lastSyncTimestamp: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Pure async function that fetches stage data (bundle + progress).
 * Extracted for testability without React.
 * The Service Worker handles caching automatically via Cache-First strategy.
 */
export async function fetchStageData(fetchFn: typeof fetch = fetch): Promise<{
  sets: StageSet[];
  songs: Map<string, StageSong>;
  progress: Map<string, number>;
  bundleTimestamp: string | null;
}> {
  const [bundleRes, progressRes] = await Promise.all([
    fetchFn("/api/stage/bundle"),
    fetchFn("/api/stage/progress"),
  ]);

  if (!bundleRes.ok) {
    throw new Error(`Bundle fetch failed: ${bundleRes.status}`);
  }
  if (!progressRes.ok) {
    throw new Error(`Progress fetch failed: ${progressRes.status}`);
  }

  const bundle: StageBundleResponse = await bundleRes.json();
  const progressData: StageProgressResponse = await progressRes.json();

  const songsMap = new Map<string, StageSong>();
  for (const song of bundle.songs) {
    songsMap.set(song.id, song);
  }

  const progressMap = new Map<string, number>();
  for (const entry of progressData.progress) {
    progressMap.set(entry.stropheId, entry.prozent);
  }

  return {
    sets: bundle.sets,
    songs: songsMap,
    progress: progressMap,
    bundleTimestamp: bundle.timestamp ?? null,
  };
}

export function useStageData(): UseStageDataReturn {
  const [sets, setSets] = useState<StageSet[]>([]);
  const [songs, setSongs] = useState<Map<string, StageSong>>(new Map());
  const [progress, setProgress] = useState<Map<string, number>>(new Map());
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchStageData();
        if (cancelled) return;

        setSets(data.sets);
        setSongs(data.songs);
        setProgress(data.progress);
        setLastSyncTimestamp(loadLastSyncTimestamp());
      } catch {
        if (cancelled) return;
        setError("Bitte zuerst online synchronisieren");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { sets, songs, progress, lastSyncTimestamp, isLoading, error };
}
