"use client";

import { useState, useRef, useCallback } from "react";

interface PdfUploaderProps {
  onResult: (data: { titel: string; kuenstler: string; text: string }) => void;
  onError: (message: string) => void;
}

type UploadStatus = "idle" | "uploading" | "success" | "error";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export function PdfUploader({ onResult, onError }: PdfUploaderProps) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (file.size > MAX_SIZE) {
        setStatus("error");
        onError("Die Datei ist zu groß. Maximal 5 MB erlaubt.");
        return;
      }

      if (file.type !== "application/pdf") {
        setStatus("error");
        onError("Bitte eine PDF-Datei auswählen.");
        return;
      }

      setStatus("uploading");

      try {
        const form = new FormData();
        form.append("file", file);

        const res = await fetch("/api/songs/parse-pdf", {
          method: "POST",
          body: form,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? `Upload fehlgeschlagen (${res.status})`);
        }

        const data = await res.json();
        setStatus("success");
        onResult(data);
      } catch (err) {
        setStatus("error");
        onError(err instanceof Error ? err.message : "Unbekannter Fehler beim Upload.");
      }
    },
    [onResult, onError]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center min-h-[160px] rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
          dragOver
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400 bg-white"
        }`}
      >
        {status === "idle" && (
          <p className="text-gray-500 text-sm">
            PDF hierher ziehen oder <span className="text-blue-600 underline">Datei auswählen</span>
          </p>
        )}

        {status === "uploading" && (
          <div className="flex items-center gap-2 text-blue-600 text-sm">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span>PDF wird verarbeitet…</span>
          </div>
        )}

        {status === "success" && (
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>PDF erfolgreich verarbeitet</span>
          </div>
        )}

        {status === "error" && (
          <p className="text-red-600 text-sm">
            Fehler – klicke, um es erneut zu versuchen.
          </p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handleChange}
      />

      <div aria-live="polite" className="sr-only">
        {status === "uploading" && "PDF wird hochgeladen und verarbeitet."}
        {status === "success" && "PDF erfolgreich verarbeitet."}
        {status === "error" && "Fehler beim Verarbeiten der PDF."}
      </div>
    </div>
  );
}
