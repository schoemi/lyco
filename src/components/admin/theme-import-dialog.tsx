"use client";

/**
 * ThemeImportDialog – Modal dialog for importing themes from JSON files.
 *
 * Anforderungen: 9.1, 9.3, 9.4, 9.5
 */

import { useState, useRef } from "react";

interface ThemeImportDialogProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ThemeImportDialog({
  onSuccess,
  onCancel,
}: ThemeImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Name collision state
  const [showRename, setShowRename] = useState(false);
  const [newName, setNewName] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setShowRename(false);
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      setFileContent(reader.result as string);
    };
    reader.onerror = () => {
      setError("Datei konnte nicht gelesen werden.");
    };
    reader.readAsText(file);
  }

  async function doImport(content: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/themes/import", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: content,
      });

      if (res.status === 201) {
        onSuccess();
        return;
      }

      const body = await res.json().catch(() => ({}));

      if (res.status === 409) {
        // Name collision – offer rename
        setShowRename(true);
        setNewName("");
        setError(body.error || "Theme-Name existiert bereits.");
        return;
      }

      // 400 or other errors
      if (body.details && Array.isArray(body.details)) {
        setError(body.details.join("; "));
      } else {
        setError(body.error || "Import fehlgeschlagen.");
      }
    } catch {
      setError("Netzwerkfehler beim Import.");
    } finally {
      setLoading(false);
    }
  }

  function handleImport() {
    if (!fileContent) {
      setError("Bitte wählen Sie eine JSON-Datei aus.");
      return;
    }
    doImport(fileContent);
  }

  function handleRetryWithNewName() {
    const trimmed = newName.trim();
    if (!trimmed) {
      setRenameError("Name darf nicht leer sein.");
      return;
    }
    if (trimmed.length > 100) {
      setRenameError("Name darf maximal 100 Zeichen lang sein.");
      return;
    }
    if (!fileContent) return;

    // Parse the JSON, replace the name, and re-import
    try {
      const parsed = JSON.parse(fileContent);
      parsed.name = trimmed;
      const updated = JSON.stringify(parsed);
      setShowRename(false);
      setRenameError(null);
      setError(null);
      doImport(updated);
    } catch {
      setRenameError("Die Datei enthält kein gültiges JSON.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">
          Theme importieren
        </h3>

        {/* File input */}
        <div className="mb-3">
          <label className="mb-1 block text-xs text-gray-600">
            Theme-JSON-Datei auswählen
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="w-full text-sm text-gray-700 file:mr-3 file:rounded file:border file:border-gray-300 file:bg-gray-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-gray-700 hover:file:bg-gray-100"
          />
          {fileName && !showRename && (
            <p className="mt-1 text-xs text-gray-500">Datei: {fileName}</p>
          )}
        </div>

        {/* Error message */}
        {error && !showRename && (
          <p className="mb-3 text-xs text-red-600">{error}</p>
        )}

        {/* Name collision – rename form */}
        {showRename && (
          <div className="mb-3 rounded border border-amber-200 bg-amber-50 p-3">
            <p className="mb-2 text-xs text-amber-800">
              {error || "Ein Theme mit diesem Namen existiert bereits."} Bitte
              vergeben Sie einen neuen Namen:
            </p>
            <input
              type="text"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setRenameError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRetryWithNewName();
                if (e.key === "Escape") onCancel();
              }}
              placeholder="Neuer Theme-Name"
              maxLength={100}
              className="mb-2 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              autoFocus
            />
            {renameError && (
              <p className="mb-2 text-xs text-red-600">{renameError}</p>
            )}
            <button
              type="button"
              onClick={handleRetryWithNewName}
              disabled={loading}
              className="rounded bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
              Mit neuem Namen importieren
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Abbrechen
          </button>
          {!showRename && (
            <button
              type="button"
              onClick={handleImport}
              disabled={loading || !fileContent}
              className="rounded bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? "Importiere…" : "Importieren"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
