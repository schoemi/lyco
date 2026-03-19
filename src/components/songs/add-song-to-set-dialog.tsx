"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface SongOption {
  id: string;
  titel: string;
  kuenstler: string | null;
}

interface AddSongToSetDialogProps {
  open: boolean;
  setId: string;
  existingSongIds: string[];
  onClose: () => void;
  onAdded: () => void;
}

export default function AddSongToSetDialog({
  open,
  setId,
  existingSongIds,
  onClose,
  onAdded,
}: AddSongToSetDialogProps) {
  const [allSongs, setAllSongs] = useState<SongOption[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const triggerRef = useRef<Element | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Capture focus trigger
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement;
    }
  }, [open]);

  // Fetch songs when dialog opens
  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setError(null);

    async function fetchSongs() {
      setFetching(true);
      try {
        const res = await fetch("/api/songs");
        if (!res.ok) throw new Error("Fehler beim Laden der Songs");
        const json = await res.json();
        setAllSongs(json.songs ?? []);
      } catch {
        setError("Songs konnten nicht geladen werden");
      } finally {
        setFetching(false);
      }
    }

    fetchSongs();
  }, [open]);

  // Focus cancel button when dialog opens
  useEffect(() => {
    if (open && !fetching) {
      requestAnimationFrame(() => {
        cancelButtonRef.current?.focus();
      });
    }
  }, [open, fetching]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  const handleClose = useCallback(() => {
    setError(null);
    onClose();
    if (triggerRef.current && triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus();
    }
  }, [onClose]);

  const toggleSong = useCallback((songId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(songId)) {
        next.delete(songId);
      } else {
        next.add(songId);
      }
      return next;
    });
  }, []);

  const handleAdd = useCallback(async () => {
    if (selected.size === 0) return;
    setLoading(true);
    setError(null);

    try {
      for (const songId of selected) {
        const res = await fetch(`/api/sets/${setId}/songs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ songId }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? "Fehler beim Hinzufügen");
        }
      }
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Hinzufügen");
    } finally {
      setLoading(false);
    }
  }, [selected, setId, onAdded]);

  if (!open) return null;

  const existingSet = new Set(existingSongIds);
  const availableSongs = allSongs.filter((s) => !existingSet.has(s.id));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label="Songs zum Set hinzufügen"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">Songs hinzufügen</h2>

        {fetching && (
          <p className="py-4 text-center text-sm text-neutral-500">Songs werden geladen…</p>
        )}

        {!fetching && availableSongs.length === 0 && (
          <p className="py-4 text-center text-sm text-neutral-500">
            Keine weiteren Songs verfügbar.
          </p>
        )}

        {!fetching && availableSongs.length > 0 && (
          <ul className="mb-4 max-h-64 divide-y divide-neutral-100 overflow-y-auto rounded-md border border-neutral-200">
            {availableSongs.map((song) => (
              <li key={song.id}>
                <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-neutral-50">
                  <input
                    type="checkbox"
                    checked={selected.has(song.id)}
                    onChange={() => toggleSong(song.id)}
                    className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="truncate text-sm text-neutral-900">{song.titel}</span>
                  {song.kuenstler && (
                    <span className="truncate text-sm text-neutral-500">– {song.kuenstler}</span>
                  )}
                </label>
              </li>
            ))}
          </ul>
        )}

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
            onClick={handleAdd}
            disabled={loading || selected.size === 0}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Füge hinzu…"
              : `${selected.size} Song${selected.size !== 1 ? "s" : ""} hinzufügen`}
          </button>
        </div>
      </div>
    </div>
  );
}
