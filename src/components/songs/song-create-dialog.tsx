"use client";

import { useEffect, useRef, useState } from "react";
import type { SongWithProgress } from "../../types/song";

interface SongCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (song: SongWithProgress) => void;
}

export default function SongCreateDialog({ open, onClose, onCreated }: SongCreateDialogProps) {
  const [titel, setTitel] = useState("");
  const [kuenstler, setKuenstler] = useState("");
  const [sprache, setSprache] = useState("");
  const [emotionsTagsRaw, setEmotionsTagsRaw] = useState("");
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<Element | null>(null);

  // Capture the element that had focus before the dialog opened
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement;
    }
  }, [open]);

  // Focus the title field when the dialog opens
  useEffect(() => {
    if (open) {
      // Use requestAnimationFrame to ensure the DOM has rendered
      requestAnimationFrame(() => {
        titleInputRef.current?.focus();
      });
    }
  }, [open]);

  // Handle Escape key to close dialog
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

  if (!open) return null;

  function resetForm() {
    setTitel("");
    setKuenstler("");
    setSprache("");
    setEmotionsTagsRaw("");
    setError(null);
    setValidationError(null);
  }

  function handleClose() {
    resetForm();
    onClose();
    // Return focus to the trigger element
    if (triggerRef.current && triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setValidationError(null);

    // Client-side validation: title is required
    if (!titel.trim()) {
      setValidationError("Titel ist erforderlich");
      titleInputRef.current?.focus();
      return;
    }

    setLoading(true);

    try {
      const emotionsTags = emotionsTagsRaw
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      const res = await fetch("/api/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titel: titel.trim(),
          kuenstler: kuenstler.trim() || undefined,
          sprache: sprache.trim() || undefined,
          emotionsTags: emotionsTags.length > 0 ? emotionsTags : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError({ message: data.error || "Fehler beim Erstellen", field: data.field });
        return;
      }

      onCreated(data.song);
      resetForm();
    } catch {
      setError({ message: "Netzwerkfehler" });
    } finally {
      setLoading(false);
    }
  }

  const hasTitleError = validationError !== null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label="Neuen Song erstellen"
      onClick={handleClose}
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Neuen Song erstellen</h2>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="song-titel" className="block text-sm font-medium text-gray-700">
              Titel
            </label>
            <input
              ref={titleInputRef}
              id="song-titel"
              type="text"
              value={titel}
              onChange={(e) => {
                setTitel(e.target.value);
                if (validationError) setValidationError(null);
              }}
              aria-required="true"
              aria-invalid={hasTitleError}
              aria-describedby={hasTitleError ? "song-titel-error" : undefined}
              className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                hasTitleError ? "border-red-500" : "border-gray-300"
              }`}
            />
            {hasTitleError && (
              <p id="song-titel-error" className="mt-1 text-sm text-red-600" role="alert">
                {validationError}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="song-kuenstler" className="block text-sm font-medium text-gray-700">
              Künstler
            </label>
            <input
              id="song-kuenstler"
              type="text"
              value={kuenstler}
              onChange={(e) => setKuenstler(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="song-sprache" className="block text-sm font-medium text-gray-700">
              Sprache
            </label>
            <input
              id="song-sprache"
              type="text"
              value={sprache}
              onChange={(e) => setSprache(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="song-emotions-tags" className="block text-sm font-medium text-gray-700">
              Emotions-Tags (kommagetrennt)
            </label>
            <input
              id="song-emotions-tags"
              type="text"
              value={emotionsTagsRaw}
              onChange={(e) => setEmotionsTagsRaw(e.target.value)}
              placeholder="z.B. fröhlich, melancholisch, energisch"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error.message}
            </p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Erstelle..." : "Erstellen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
