"use client";

import { useState, useCallback, type ReactNode } from "react";
import { CompactView } from "./compact-view";
import { DetailView } from "./detail-view";
import type { TagDefinitionData } from "@/types/vocal-tag";
import type { ViewMode } from "./view-toggle";
import { AppIcon } from "@/components/ui/iconify-icon";

/**
 * LivePreview – Split-screen wrapper: editor on the left, render preview on the right.
 *
 * Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5
 */

export interface LivePreviewProps {
  children: ReactNode;
  text: string;
  tagDefinitions: TagDefinitionData[];
  songId: string;
}

export function LivePreview({
  children,
  text,
  tagDefinitions,
  songId,
}: LivePreviewProps) {
  const [enabled, setEnabled] = useState(false);
  const [previewMode, setPreviewMode] = useState<ViewMode>("compact");

  const toggleEnabled = useCallback(() => {
    setEnabled((prev) => !prev);
  }, []);

  const togglePreviewMode = useCallback(() => {
    setPreviewMode((prev) => (prev === "compact" ? "detail" : "compact"));
  }, []);

  return (
    <div className="live-preview-container">
      <div className="live-preview-controls flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={toggleEnabled}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border transition-colors ${
            enabled
              ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-600"
              : "border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
          aria-label={
            enabled ? "Live-Vorschau deaktivieren" : "Live-Vorschau aktivieren"
          }
          aria-pressed={enabled}
        >
          <AppIcon icon={enabled ? "fa6-solid:eye" : "fa6-solid:eye-slash"} />
          <span>{enabled ? "Vorschau an" : "Vorschau aus"}</span>
        </button>

        {enabled && (
          <button
            type="button"
            onClick={togglePreviewMode}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={
              previewMode === "compact"
                ? "Zur Detail-Ansicht wechseln"
                : "Zur Kompakt-Ansicht wechseln"
            }
          >
            <AppIcon icon={previewMode === "compact" ? "fa6-solid:list" : "fa6-solid:compress"} />
            <span>
              {previewMode === "compact" ? "Detail" : "Kompakt"}
            </span>
          </button>
        )}
      </div>

      <div
        className={`live-preview-layout flex gap-4 ${
          enabled ? "" : "flex-col"
        }`}
      >
        <div
          className={`live-preview-editor ${
            enabled ? "w-1/2" : "w-full"
          } min-w-0`}
        >
          {children}
        </div>

        {enabled && (
          <div className="live-preview-pane w-1/2 min-w-0 border-l border-gray-200 dark:border-gray-700 pl-4 overflow-auto">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
              {previewMode === "compact"
                ? "Kompakt-Vorschau"
                : "Detail-Vorschau"}
            </div>
            {previewMode === "compact" ? (
              <CompactView text={text} tagDefinitions={tagDefinitions} />
            ) : (
              <DetailView text={text} tagDefinitions={tagDefinitions} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
