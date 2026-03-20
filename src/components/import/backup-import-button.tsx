"use client";

import { useRef, useState } from "react";
import type {
  ImportValidationResult,
  ImportConflict,
} from "@/lib/backup/backup-types";
import KonfliktDialog from "./konflikt-dialog";
import { AppIcon } from "@/components/ui/iconify-icon";

type Phase = "idle" | "validating" | "conflicts" | "importing" | "done";

export default function BackupImportButton() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [conflicts, setConflicts] = useState<ImportConflict[]>([]);

  function reset() {
    setPhase("idle");
    setError(null);
    setSuccessMessage(null);
    setSelectedFile(null);
    setConflicts([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function executeImport(
    file: File,
    resolutions: Record<string, "overwrite" | "new">,
  ) {
    setPhase("importing");
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("resolutions", JSON.stringify(resolutions));

      const res = await fetch("/api/backup/import/execute", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.error ?? `Import fehlgeschlagen (${res.status})`,
        );
      }

      const result = await res.json();
      setSuccessMessage(
        result.message ?? `${result.imported} Song(s) erfolgreich importiert`,
      );
      setPhase("done");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Import fehlgeschlagen",
      );
      setPhase("idle");
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccessMessage(null);
    setSelectedFile(file);
    setPhase("validating");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/backup/import/validate", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.error ?? `Validierung fehlgeschlagen (${res.status})`,
        );
      }

      const validation: ImportValidationResult = await res.json();

      if (!validation.valid) {
        throw new Error(validation.error ?? "Ungültiges Archiv");
      }

      if (validation.conflicts.length > 0) {
        setConflicts(validation.conflicts);
        setPhase("conflicts");
      } else {
        await executeImport(file, {});
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Validierung fehlgeschlagen",
      );
      setPhase("idle");
    }
  }

  function handleConflictResolve(
    resolutions: Record<string, "overwrite" | "new">,
  ) {
    if (!selectedFile) return;
    setConflicts([]);
    executeImport(selectedFile, resolutions);
  }

  function handleConflictCancel() {
    reset();
  }

  const busy = phase === "validating" || phase === "importing";

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={handleFileChange}
        aria-hidden="true"
        tabIndex={-1}
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (phase === "done") reset();
            fileInputRef.current?.click();
          }}
          disabled={busy}
          aria-label="Backup importieren"
          aria-busy={busy}
          className="inline-flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? (
            <>
              <svg
                className="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
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
              {phase === "validating" ? "Prüfe…" : "Importiert…"}
            </>
          ) : (
            <><AppIcon icon="lucide:download" className="inline mr-1.5 text-base align-[-2px]" /> Backup importieren</>
          )}
        </button>

        {error && (
          <span className="text-sm text-red-600" role="alert">
            {error}
          </span>
        )}

        {successMessage && phase === "done" && (
          <span className="text-sm text-green-600" role="status">
            {successMessage}
          </span>
        )}
      </div>

      {phase === "conflicts" && (
        <KonfliktDialog
          conflicts={conflicts}
          onResolve={handleConflictResolve}
          onCancel={handleConflictCancel}
        />
      )}
    </>
  );
}
