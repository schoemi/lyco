"use client";

import { useState, useRef, useCallback } from "react";
import { parseChordProFile, chordProToImportInput } from "@/lib/chords/chordpro-file-parser";
import type { ImportSongInput } from "@/types/song";

interface ChordProImportPanelProps {
  onImport: (input: ImportSongInput) => void;
  onError: (message: string) => void;
  loading?: boolean;
}

const ACCEPTED_EXTENSIONS = [".chopro", ".cho", ".chordpro"];
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

type ParseStatus = "idle" | "parsing" | "parsed" | "error";

export function ChordProImportPanel({ onImport, onError, loading }: ChordProImportPanelProps) {
  const [status, setStatus] = useState<ParseStatus>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [parsedInput, setParsedInput] = useState<ImportSongInput | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isValidExtension = useCallback((name: string): boolean => {
    const lower = name.toLowerCase();
    return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      if (file.size > MAX_SIZE) {
        setStatus("error");
        onError("Die Datei ist zu groß. Maximal 2 MB erlaubt.");
        return;
      }

      if (!isValidExtension(file.name)) {
        setStatus("error");
        onError("Bitte eine ChordPro-Datei auswählen (.chopro, .cho, .chordpro).");
        return;
      }

      setStatus("parsing");
      setFileName(file.name);

      try {
        const content = await file.text();
        const result = parseChordProFile(content);

        if (result.errors.length > 0) {
          setStatus("error");
          onError(
            `Fehler beim Parsen: ${result.errors.map((e) => `Zeile ${e.line}: ${e.message}`).join("; ")}`
          );
          return;
        }

        const input = chordProToImportInput(result);

        if (result.warnings.length > 0) {
          // Warnings are non-fatal — we still proceed
        }

        setParsedInput(input);
        setStatus("parsed");
      } catch {
        setStatus("error");
        onError("Fehler beim Lesen der Datei.");
      }
    },
    [onError, isValidExtension],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
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
    [handleFile],
  );

  const handleImport = useCallback(() => {
    if (parsedInput) {
      onImport(parsedInput);
    }
  }, [parsedInput, onImport]);

  const handleReset = useCallback(() => {
    setStatus("idle");
    setFileName("");
    setParsedInput(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, []);

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-600">
        Lade eine ChordPro-Datei (.chopro, .cho, .chordpro) hoch. Akkorde, Metadaten und
        Strophenstruktur werden automatisch extrahiert.
      </p>

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
            ? "border-newsong-500 bg-newsong-50"
            : "border-neutral-300 hover:border-neutral-400 bg-white"
        }`}
      >
        {status === "idle" && (
          <p className="text-neutral-500 text-sm">
            ChordPro-Datei hierher ziehen oder{" "}
            <span className="text-newsong-600 underline">Datei auswählen</span>
          </p>
        )}

        {status === "parsing" && (
          <div className="flex items-center gap-2 text-newsong-600 text-sm">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span>Datei wird verarbeitet…</span>
          </div>
        )}

        {status === "parsed" && (
          <div className="flex items-center gap-2 text-success-600 text-sm">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span>{fileName} erfolgreich geparst</span>
          </div>
        )}

        {status === "error" && (
          <p className="text-error-600 text-sm">Fehler – klicke, um es erneut zu versuchen.</p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".chopro,.cho,.chordpro"
        className="hidden"
        onChange={handleChange}
      />

      {status === "parsed" && parsedInput && (
        <div className="space-y-3">
          <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm">
            <p>
              <span className="font-medium">Titel:</span> {parsedInput.titel}
            </p>
            {parsedInput.kuenstler && (
              <p>
                <span className="font-medium">Künstler:</span> {parsedInput.kuenstler}
              </p>
            )}
            {parsedInput.tonart && (
              <p>
                <span className="font-medium">Tonart:</span> {parsedInput.tonart}
              </p>
            )}
            {parsedInput.bpm && (
              <p>
                <span className="font-medium">BPM:</span> {parsedInput.bpm}
              </p>
            )}
            <p>
              <span className="font-medium">Strophen:</span> {parsedInput.strophen.length}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleImport}
              disabled={loading}
              aria-label="ChordPro-Song importieren"
              className="min-h-[44px] flex-1 rounded-md bg-newsong-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-newsong-700 focus:outline-none focus:ring-2 focus:ring-newsong-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Importiere…" : "Song importieren"}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={loading}
              aria-label="Andere Datei auswählen"
              className="min-h-[44px] rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Andere Datei
            </button>
          </div>
        </div>
      )}

      <div aria-live="polite" className="sr-only">
        {status === "parsing" && "ChordPro-Datei wird verarbeitet."}
        {status === "parsed" && "ChordPro-Datei erfolgreich geparst."}
        {status === "error" && "Fehler beim Verarbeiten der ChordPro-Datei."}
      </div>
    </div>
  );
}
