"use client";

import { useState, useEffect, useCallback } from "react";
import { CompactView } from "./compact-view";
import { DetailView } from "./detail-view";
import type { TagDefinitionData } from "@/types/vocal-tag";
import { AppIcon } from "@/components/ui/iconify-icon";

/**
 * ViewToggle – Wraps CompactView and DetailView with a toggle button.
 *
 * Validates: Requirements 11.1, 11.2, 11.3
 */

export type ViewMode = "compact" | "detail";

const STORAGE_KEY_PREFIX = "vocal-tag-view-mode-";

export function getStorageKey(songId: string): string {
  return `${STORAGE_KEY_PREFIX}${songId}`;
}

export function readPersistedMode(songId: string): ViewMode {
  if (typeof window === "undefined") return "compact";
  try {
    const stored = localStorage.getItem(getStorageKey(songId));
    if (stored === "compact" || stored === "detail") return stored;
  } catch {
    // localStorage may be unavailable
  }
  return "compact";
}

export function persistMode(songId: string, mode: ViewMode): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getStorageKey(songId), mode);
  } catch {
    // silently ignore
  }
}

export interface ViewToggleProps {
  text: string;
  tagDefinitions: TagDefinitionData[];
  songId: string;
}

export function ViewToggle({ text, tagDefinitions, songId }: ViewToggleProps) {
  const [mode, setMode] = useState<ViewMode>(() => readPersistedMode(songId));

  useEffect(() => {
    setMode(readPersistedMode(songId));
  }, [songId]);

  const toggle = useCallback(() => {
    setMode((prev) => {
      const next: ViewMode = prev === "compact" ? "detail" : "compact";
      persistMode(songId, next);
      return next;
    });
  }, [songId]);

  return (
    <div className="view-toggle-container">
      <div className="view-toggle-header flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={toggle}
          className="view-toggle-button inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label={
            mode === "compact"
              ? "Zur Detail-Ansicht wechseln"
              : "Zur Kompakt-Ansicht wechseln"
          }
          aria-pressed={mode === "detail"}
        >
          <AppIcon icon={mode === "compact" ? "fa6-solid:list" : "fa6-solid:compress"} />
          <span>
            {mode === "compact" ? "Detail-Ansicht" : "Kompakt-Ansicht"}
          </span>
        </button>
      </div>

      {mode === "compact" ? (
        <CompactView text={text} tagDefinitions={tagDefinitions} />
      ) : (
        <DetailView text={text} tagDefinitions={tagDefinitions} />
      )}
    </div>
  );
}
