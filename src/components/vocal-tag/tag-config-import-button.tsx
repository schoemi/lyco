"use client";

import { useCallback, useRef, useState } from "react";
import type { TagDefinitionData } from "@/types/vocal-tag";
import {
  readJsonFile,
  validateTagConfigJson,
  checkDuplicates,
  type TagConfigImportItem,
} from "@/lib/vocal-tag/tag-config-export";
import { AppIcon } from "@/components/ui/iconify-icon";

/**
 * TagConfigImportButton – Button zum Importieren von Tag-Definitionen aus einer JSON-Datei.
 *
 * - Öffnet einen Datei-Picker für `.json`-Dateien
 * - Validiert das JSON-Format
 * - Prüft auf Duplikate und fragt den Nutzer
 * - Ruft `onImport` mit den zu importierenden Items und der Duplikat-Strategie auf
 *
 * Validates: Requirements 15.2, 15.3, 15.4
 */

export type DuplicateStrategy = "overwrite" | "skip";

export interface TagConfigImportResult {
  items: TagConfigImportItem[];
  duplicateStrategy: DuplicateStrategy;
}

export interface TagConfigImportButtonProps {
  /** Bestehende Tag-Definitionen für Duplikat-Check */
  existingTags: TagDefinitionData[];
  /** Callback mit den importierten Items */
  onImport: (result: TagConfigImportResult) => void;
  /** Deaktiviert den Button */
  disabled?: boolean;
}

export function TagConfigImportButton({
  existingTags,
  onImport,
  disabled = false,
}: TagConfigImportButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [pendingImport, setPendingImport] = useState<{
    newItems: TagConfigImportItem[];
    duplicates: TagConfigImportItem[];
    allItems: TagConfigImportItem[];
  } | null>(null);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      try {
        const content = await readJsonFile(file);
        const validation = validateTagConfigJson(content);

        if (!validation.valid) {
          setErrorMessages(validation.errors);
          setShowErrors(true);
          return;
        }

        const { newItems, duplicates } = checkDuplicates(
          validation.definitions,
          existingTags,
        );

        if (duplicates.length > 0) {
          setPendingImport({
            newItems,
            duplicates,
            allItems: validation.definitions,
          });
          setShowDuplicateDialog(true);
        } else {
          // No duplicates – import directly
          setErrorMessages([]);
          setShowErrors(false);
          onImport({ items: validation.definitions, duplicateStrategy: "skip" });
        }
      } catch {
        setErrorMessages(["Datei konnte nicht gelesen werden."]);
        setShowErrors(true);
      }
    },
    [existingTags, onImport],
  );

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleDismissErrors = useCallback(() => {
    setShowErrors(false);
    setErrorMessages([]);
  }, []);

  const handleDuplicateChoice = useCallback(
    (strategy: DuplicateStrategy) => {
      if (!pendingImport) return;

      onImport({
        items: pendingImport.allItems,
        duplicateStrategy: strategy,
      });

      setShowDuplicateDialog(false);
      setPendingImport(null);
    },
    [pendingImport, onImport],
  );

  const handleCancelDuplicate = useCallback(() => {
    setShowDuplicateDialog(false);
    setPendingImport(null);
  }, []);

  return (
    <div className="relative inline-block">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-label="Tag-Konfiguration aus JSON importieren"
        className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
      >
        <AppIcon icon="fa6-solid:upload" />
        <span>Tags importieren</span>
      </button>

      {/* Fehlermeldungen */}
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

      {/* Duplikat-Dialog */}
      {showDuplicateDialog && pendingImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            role="dialog"
            aria-label="Duplikate gefunden"
            className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-neutral-800"
          >
            <h3 className="mb-2 text-base font-semibold text-gray-900 dark:text-gray-100">
              Duplikate gefunden
            </h3>
            <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
              {pendingImport.duplicates.length === 1
                ? "1 Tag-Kürzel existiert bereits:"
                : `${pendingImport.duplicates.length} Tag-Kürzel existieren bereits:`}
            </p>
            <ul className="mb-4 max-h-32 overflow-y-auto rounded border border-gray-200 bg-gray-50 p-2 text-xs dark:border-neutral-600 dark:bg-neutral-700">
              {pendingImport.duplicates.map((d) => (
                <li key={d.tag} className="py-0.5">
                  <code className="rounded bg-gray-200 px-1 dark:bg-neutral-600">
                    {d.tag}
                  </code>{" "}
                  – {d.label}
                </li>
              ))}
            </ul>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
              Möchten Sie die bestehenden Definitionen überschreiben oder
              überspringen?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleDuplicateChoice("overwrite")}
                className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Überschreiben
              </button>
              <button
                type="button"
                onClick={() => handleDuplicateChoice("skip")}
                className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-neutral-600 dark:bg-neutral-700 dark:text-gray-200 dark:hover:bg-neutral-600"
              >
                Überspringen
              </button>
              <button
                type="button"
                onClick={handleCancelDuplicate}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 dark:border-neutral-600 dark:text-gray-400 dark:hover:bg-neutral-700"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
