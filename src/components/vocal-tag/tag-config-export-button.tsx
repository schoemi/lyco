"use client";

import { useCallback } from "react";
import type { TagDefinitionData } from "@/types/vocal-tag";
import { downloadTagConfigAsJson } from "@/lib/vocal-tag/tag-config-export";
import { AppIcon } from "@/components/ui/iconify-icon";

/**
 * TagConfigExportButton – Button zum Exportieren aller Tag-Definitionen als JSON-Datei.
 *
 * Validates: Requirements 15.1
 */

export interface TagConfigExportButtonProps {
  /** Aktuelle Tag-Definitionen */
  definitions: TagDefinitionData[];
  /** Deaktiviert den Button */
  disabled?: boolean;
}

export function TagConfigExportButton({
  definitions,
  disabled = false,
}: TagConfigExportButtonProps) {
  const handleExport = useCallback(() => {
    downloadTagConfigAsJson(definitions);
  }, [definitions]);

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={disabled || definitions.length === 0}
      aria-label="Tag-Konfiguration als JSON exportieren"
      className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
    >
      <AppIcon icon="lucide:download" />
      <span>Tags exportieren</span>
    </button>
  );
}
