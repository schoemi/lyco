"use client";

import { useCallback } from "react";
import type { ChordProNode } from "@/types/vocal-tag";
import { exportChordPro } from "@/lib/vocal-tag/chordpro-export";
import { AppIcon } from "@/components/ui/iconify-icon";

/**
 * ChordProExportButton – Button zum Exportieren des Editor-Inhalts als `.chopro`-Datei.
 *
 * Validates: Requirements 13.1, 13.2, 13.3, 13.4
 */

export interface ChordProExportButtonProps {
  /** Aktuelle ChordPro-Nodes aus dem Editor */
  nodes: ChordProNode[];
  /** Dateiname ohne Erweiterung (Standard: "songtext") */
  filename?: string;
  /** Deaktiviert den Button (z.B. wenn Editor leer) */
  disabled?: boolean;
}

export function ChordProExportButton({
  nodes,
  filename = "songtext",
  disabled = false,
}: ChordProExportButtonProps) {
  const handleExport = useCallback(() => {
    exportChordPro(nodes, filename);
  }, [nodes, filename]);

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={disabled}
      aria-label="Als ChordPro-Datei exportieren"
      className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
    >
      <AppIcon icon="fa6-solid:download" />
      <span>ChordPro exportieren</span>
    </button>
  );
}
