"use client";

import { useCallback, useRef, useState } from "react";
import type { ChordProNode } from "@/types/vocal-tag";
import {
  importChordProFile,
  formatImportErrors,
} from "@/lib/vocal-tag/chordpro-import";

/**
 * ChordProImportButton – Button zum Importieren einer `.chopro`-Datei in den Editor.
 *
 * - Öffnet einen Datei-Picker für `.chopro`-Dateien
 * - Parst die Datei mit dem ChordPro-Parser
 * - Zeigt Fehlermeldungen mit Zeilennummer bei ungültiger Syntax
 * - Zeigt Bestätigungsdialog bei bestehendem Editor-Inhalt
 * - Ruft `onImport` mit den geparsten Nodes auf
 *
 * Validates: Requirements 14.1, 14.2, 14.3, 14.4
 */

export interface ChordProImportButtonProps {
  /** Bekannte Tag-Kürzel für den Parser */
  knownTags: string[];
  /** Callback mit den importierten Nodes */
  onImport: (nodes: ChordProNode[], warnings: string[]) => void;
  /** Ob der Editor bereits Inhalt hat (für Bestätigungsdialog) */
  hasExistingContent?: boolean;
  /** Deaktiviert den Button */
  disabled?: boolean;
}

export function ChordProImportButton({
  knownTags,
  onImport,
  hasExistingContent = false,
  disabled = false,
}: ChordProImportButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [showErrors, setShowErrors] = useState(false);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Reset file input so same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      const result = await importChordProFile(file, knownTags);

      // Show errors if any
      if (result.errors.length > 0) {
        const formatted = formatImportErrors(result.errors);
        setErrorMessages(formatted);
        setShowErrors(true);
        return;
      }

      // Confirmation dialog if editor has existing content
      if (hasExistingContent) {
        const confirmed = window.confirm(
          "Der Editor enthält bereits Inhalt. Möchten Sie den Inhalt durch den Import ersetzen?",
        );
        if (!confirmed) return;
      }

      setErrorMessages([]);
      setShowErrors(false);
      onImport(result.nodes, result.warnings);
    },
    [knownTags, hasExistingContent, onImport],
  );

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleDismissErrors = useCallback(() => {
    setShowErrors(false);
    setErrorMessages([]);
  }, []);

  return (
    <div className="relative inline-block">
      <input
        ref={fileInputRef}
        type="file"
        accept=".chopro"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-label="ChordPro-Datei importieren"
        className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
      >
        <i className="fa-solid fa-upload" aria-hidden="true" />
        <span>ChordPro importieren</span>
      </button>

      {showErrors && errorMessages.length > 0 && (
        <div
          role="alert"
          className="absolute left-0 top-full z-50 mt-2 w-80 rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-800 shadow-lg dark:border-red-700 dark:bg-red-950 dark:text-red-200"
        >
          <div className="mb-1.5 font-semibold">Import-Fehler:</div>
          <ul className="list-inside list-disc space-y-0.5">
            {errorMessages.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
          <button
            type="button"
            onClick={handleDismissErrors}
            className="mt-2 text-xs font-medium text-red-600 underline hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
            aria-label="Fehlermeldungen schließen"
          >
            Schließen
          </button>
        </div>
      )}
    </div>
  );
}
