"use client";

import { useEffect, useRef, useState } from "react";
import type { SongDetail } from "../../types/song";

interface SongDeleteDialogProps {
  open: boolean;
  song: SongDetail | null;
  onClose: () => void;
  onDeleted: () => void;
}

export default function SongDeleteDialog({ open, song, onClose, onDeleted }: SongDeleteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<Element | null>(null);

  // Capture the element that had focus before the dialog opened
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement;
    }
  }, [open]);

  // Focus the cancel button when the dialog opens
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        cancelButtonRef.current?.focus();
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

  if (!open || !song) return null;

  function handleClose() {
    setError(null);
    onClose();
    // Return focus to the trigger element
    if (triggerRef.current && triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus();
    }
  }

  async function handleDelete() {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/songs/${song!.id}`, { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Fehler beim Löschen");
        return;
      }

      onDeleted();
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label="Song löschen"
      onClick={handleClose}
    >
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-2 text-lg font-semibold text-neutral-900">Song löschen</h2>
        <p className="mb-1 text-sm text-neutral-600">
          Möchten Sie den Song <span className="font-medium">&quot;{song.titel}&quot;</span> wirklich löschen?
        </p>
        <p className="mb-4 text-sm text-error-600">
          Alle zugehörigen Daten (Strophen, Zeilen, Fortschritt, Sessions) werden unwiderruflich gelöscht.
        </p>
        {error && (
          <p className="mb-4 text-sm text-error-600" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={handleClose}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="rounded-md bg-error-600 px-4 py-2 text-sm font-medium text-white hover:bg-error-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Lösche..." : "Löschen"}
          </button>
        </div>
      </div>
    </div>
  );
}
