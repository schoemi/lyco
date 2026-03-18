"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ViewToggle } from "./view-toggle";
import { VocalTagEditor } from "./vocal-tag-editor";
import type { TagDefinitionData } from "@/types/vocal-tag";
import type { StropheDetail } from "@/types/song";

/**
 * VocalTagSection – Integrates the Vocal Tag Editor and read-only views
 * into the Song detail page.
 *
 * - Read mode: Shows ViewToggle (compact/detail) for the song's vocal tag annotations
 * - Edit mode: Shows VocalTagEditor with optional LivePreview
 * - Toggle button to enter/exit vocal tag editing mode
 *
 * Validates: Requirements 11.1, 12.1, 16.4
 */

export interface VocalTagSectionProps {
  /** Song ID for persistence and API calls */
  songId: string;
  /** Song strophes containing the zeilen with text */
  strophen: StropheDetail[];
  /** Song title for export filename */
  songTitel: string;
  /** Callback when vocal tag text changes (updates zeilen text) */
  onTextChanged?: (rawText: string) => void;
}

/**
 * Combines all zeilen text from all strophes into a single string,
 * separated by newlines. Strophes are separated by double newlines.
 */
function combineSongText(strophen: StropheDetail[]): string {
  const sorted = [...strophen].sort((a, b) => a.orderIndex - b.orderIndex);
  return sorted
    .map((strophe) => {
      const sortedZeilen = [...strophe.zeilen].sort(
        (a, b) => a.orderIndex - b.orderIndex,
      );
      return sortedZeilen.map((z) => z.text).join("\n");
    })
    .join("\n\n");
}

export function VocalTagSection({
  songId,
  strophen,
  songTitel,
  onTextChanged,
}: VocalTagSectionProps) {
  const [editingVocalTags, setEditingVocalTags] = useState(false);
  const [tagDefinitions, setTagDefinitions] = useState<TagDefinitionData[]>([]);
  const [loadingTags, setLoadingTags] = useState(true);
  const [tagError, setTagError] = useState<string | null>(null);

  // Combined song text for read-only views
  const songText = useMemo(() => combineSongText(strophen), [strophen]);

  // Fetch tag definitions for read-only views
  useEffect(() => {
    let cancelled = false;

    async function fetchTags() {
      try {
        const res = await fetch("/api/tag-definitions");
        if (!res.ok) {
          throw new Error(`Fehler beim Laden der Tag-Definitionen (${res.status})`);
        }
        const data = await res.json();
        const defs: TagDefinitionData[] = Array.isArray(data) ? data : data.definitions ?? [];
        if (!cancelled) {
          setTagDefinitions(defs);
          setTagError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setTagError(
            err instanceof Error
              ? err.message
              : "Unbekannter Fehler beim Laden der Tag-Definitionen",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingTags(false);
        }
      }
    }

    fetchTags();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleVocalTagChange = useCallback(
    (rawText: string) => {
      onTextChanged?.(rawText);
    },
    [onTextChanged],
  );

  const toggleEditing = useCallback(() => {
    setEditingVocalTags((prev) => !prev);
  }, []);

  // Don't show section if there's no song text and we're not editing
  const hasText = songText.trim().length > 0;
  if (!hasText && !editingVocalTags) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-neutral-900">Vocal Tags</h2>
        <button
          type="button"
          onClick={toggleEditing}
          className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
            editingVocalTags
              ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-600"
              : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"
          }`}
          aria-label={
            editingVocalTags
              ? "Vocal-Tag-Bearbeitung beenden"
              : "Vocal Tags bearbeiten"
          }
          aria-pressed={editingVocalTags}
        >
          {editingVocalTags ? "✏️ Bearbeitung beenden" : "✏️ Vocal Tags bearbeiten"}
        </button>
      </div>

      {editingVocalTags ? (
        /* Edit mode: VocalTagEditor with optional LivePreview */
        <VocalTagEditor
          initialContent={songText}
          onChange={handleVocalTagChange}
          showPreview={true}
          songId={songId}
          exportFilename={songTitel.replace(/[^a-zA-Z0-9äöüÄÖÜß\-_ ]/g, "").trim() || "songtext"}
        />
      ) : (
        /* Read mode: ViewToggle with compact/detail views */
        <>
          {loadingTags ? (
            <div className="flex items-center justify-center p-4 text-sm text-neutral-500">
              <i className="fa-solid fa-spinner fa-spin mr-2" aria-hidden="true" />
              Lade Tag-Definitionen…
            </div>
          ) : tagError ? (
            <div
              role="alert"
              className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-200"
            >
              <i className="fa-solid fa-triangle-exclamation mr-2" aria-hidden="true" />
              {tagError}
            </div>
          ) : (
            <ViewToggle
              text={songText}
              tagDefinitions={tagDefinitions}
              songId={songId}
            />
          )}
        </>
      )}
    </div>
  );
}
