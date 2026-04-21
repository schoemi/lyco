"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ExportFormat } from "@/lib/export/export-types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ExportDialogProps {
  open: boolean;
  songId: string;
  songTitel: string;
  songKuenstler: string | null;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Format definitions
// ---------------------------------------------------------------------------

interface FormatOption {
  value: ExportFormat;
  label: string;
  description: string;
}

const FORMAT_OPTIONS: FormatOption[] = [
  { value: "pdf", label: "PDF", description: "Zum Ausdrucken oder Teilen" },
  { value: "chordpro", label: "ChordPro", description: "Offener Austauschstandard" },
  { value: "onsong", label: "OnSong", description: "Für die OnSong-App" },
  { value: "lyco", label: "Lyco (ZIP)", description: "Vollständiges Backup aller Daten" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ExportDialog({
  open,
  songId,
  songTitel,
  songKuenstler,
  onClose,
}: ExportDialogProps) {
  // --- State ---------------------------------------------------------------
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat | null>(null);
  const [vocalTags, setVocalTags] = useState(true);
  const [instrumental, setInstrumental] = useState(true);
  const [kommentare, setKommentare] = useState(true);
  const [uebersetzungen, setUebersetzungen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Refs ----------------------------------------------------------------
  const triggerRef = useRef<Element | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // --- Capture trigger element ---------------------------------------------
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement;
    }
  }, [open]);

  // --- Reset state when dialog opens ---------------------------------------
  const [prevOpen, setPrevOpen] = useState(open);
  if (open && open !== prevOpen) {
    setPrevOpen(open);
    setSelectedFormat(null);
    setVocalTags(true);
    setInstrumental(true);
    setKommentare(true);
    setUebersetzungen(true);
    setError(null);
    setLoading(false);
  }
  if (!open && open !== prevOpen) {
    setPrevOpen(open);
  }

  // --- Focus management ----------------------------------------------------
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        dialogRef.current?.focus();
      });
    }
  }, [open]);

  // --- Escape key ----------------------------------------------------------
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  // --- Close handler -------------------------------------------------------
  const handleClose = useCallback(() => {
    if (loading) return;
    setError(null);
    onClose();
    if (triggerRef.current && triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus();
    }
  }, [loading, onClose]);

  // --- Export handler ------------------------------------------------------
  const handleExport = useCallback(async () => {
    if (!selectedFormat || loading) return;

    setError(null);
    setLoading(true);

    try {
      let res: Response;

      if (selectedFormat === "lyco") {
        // Lyco-ZIP-Export: kein format-Parameter → API liefert ZIP
        res = await fetch(`/api/songs/${songId}/export`);
      } else {
        const params = new URLSearchParams({
          format: selectedFormat,
          vocalTags: String(vocalTags),
          instrumental: String(instrumental),
          kommentare: String(kommentare),
          uebersetzungen: String(uebersetzungen),
        });
        res = await fetch(`/api/songs/${songId}/export?${params.toString()}`);
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || `Export fehlgeschlagen (${res.status})`);
        return;
      }

      // Trigger file download via blob URL
      const blob = await res.blob();
      const contentDisposition = res.headers.get("Content-Disposition");
      let filename = selectedFormat === "lyco" ? `song-${songId}.zip` : `export.${selectedFormat}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';\n]+)/i);
        if (match) {
          filename = decodeURIComponent(match[1]);
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      handleClose();
    } catch {
      setError("Netzwerkfehler. Bitte versuche es erneut.");
    } finally {
      setLoading(false);
    }
  }, [selectedFormat, loading, vocalTags, instrumental, kommentare, uebersetzungen, songId, handleClose]);

  // --- Early return --------------------------------------------------------
  if (!open) return null;

  // --- Render --------------------------------------------------------------
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label="Song exportieren"
      onClick={handleClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">Song exportieren</h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Dialog schließen"
            className="rounded-md p-1 text-neutral-400 hover:text-neutral-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="mb-4 text-sm text-neutral-500">
          {songTitel}
          {songKuenstler ? ` – ${songKuenstler}` : ""}
        </p>

        {/* Format selection */}
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-neutral-700">Format</legend>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Export-Format">
            {FORMAT_OPTIONS.map((fmt) => {
              const isSelected = selectedFormat === fmt.value;
              return (
                <button
                  key={fmt.value}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setSelectedFormat(fmt.value)}
                  className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                    isSelected
                      ? "border-primary-500 bg-primary-50 text-primary-700 ring-1 ring-primary-500"
                      : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  <span className="font-medium">{fmt.label}</span>
                  <span className="block text-xs text-neutral-500">{fmt.description}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Export options – not applicable for lyco format */}
        {selectedFormat && selectedFormat !== "lyco" && (
          <fieldset className="mt-4">
            <legend className="mb-2 text-sm font-medium text-neutral-700">Optionen</legend>
            <div className="space-y-3">
              <ToggleSwitch
                id="export-vocal-tags"
                label="Vocal-Tags"
                checked={vocalTags}
                onChange={setVocalTags}
              />
              <ToggleSwitch
                id="export-instrumental"
                label="Instrumental-Sektionen"
                checked={instrumental}
                onChange={setInstrumental}
              />
              {selectedFormat === "pdf" && (
                <ToggleSwitch
                  id="export-kommentare"
                  label="Kommentare (Seitenspalte)"
                  checked={kommentare}
                  onChange={setKommentare}
                />
              )}
              {selectedFormat === "pdf" && (
                <ToggleSwitch
                  id="export-uebersetzungen"
                  label="Übersetzungen"
                  checked={uebersetzungen}
                  onChange={setUebersetzungen}
                />
              )}
            </div>
          </fieldset>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-4 rounded-md bg-error-50 p-3" role="alert">
            <p className="text-sm text-error-700">{error}</p>
            <button
              type="button"
              onClick={handleExport}
              className="mt-1 text-sm font-medium text-error-700 underline hover:text-error-800"
            >
              Erneut versuchen
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={!selectedFormat || loading}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Exportiere…
              </span>
            ) : (
              "Exportieren"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ToggleSwitch (internal)
// ---------------------------------------------------------------------------

interface ToggleSwitchProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleSwitch({ id, label, checked, onChange }: ToggleSwitchProps) {
  return (
    <div className="flex items-center justify-between">
      <label htmlFor={id} className="text-sm text-neutral-700">
        {label}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={`${label} ${checked ? "deaktivieren" : "aktivieren"}`}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
          checked ? "bg-primary-600" : "bg-neutral-200"
        }`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
