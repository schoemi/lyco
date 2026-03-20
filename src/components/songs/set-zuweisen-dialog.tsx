"use client";

import { useCallback, useEffect, useState } from "react";

interface SetOption {
  id: string;
  name: string;
  songCount: number;
}

interface SetZuweisenDialogProps {
  open: boolean;
  songId: string;
  currentSetIds: string[];
  onClose: () => void;
  onChanged: () => void;
}

export default function SetZuweisenDialog({
  open,
  songId,
  currentSetIds,
  onClose,
  onChanged,
}: SetZuweisenDialogProps) {
  const [sets, setSets] = useState<SetOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [assigned, setAssigned] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setAssigned(new Set(currentSetIds));
      loadSets();
    }
  }, [open, currentSetIds]);

  const loadSets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sets");
      if (!res.ok) throw new Error("Fehler beim Laden der Sets");
      const json = await res.json();
      setSets(
        json.sets.map((s: { id: string; name: string; songCount: number }) => ({
          id: s.id,
          name: s.name,
          songCount: s.songCount,
        }))
      );
    } catch {
      setError("Sets konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleToggle = useCallback(
    async (setId: string) => {
      if (toggling) return;
      setToggling(setId);
      setError(null);

      const isAssigned = assigned.has(setId);

      try {
        if (isAssigned) {
          const res = await fetch(`/api/sets/${setId}/songs/${songId}`, {
            method: "DELETE",
          });
          if (!res.ok) throw new Error("Fehler beim Entfernen");
          setAssigned((prev) => {
            const next = new Set(prev);
            next.delete(setId);
            return next;
          });
        } else {
          const res = await fetch(`/api/sets/${setId}/songs`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ songId }),
          });
          if (!res.ok) throw new Error("Fehler beim Hinzufügen");
          setAssigned((prev) => new Set(prev).add(setId));
        }
        onChanged();
      } catch {
        setError(isAssigned ? "Entfernen fehlgeschlagen" : "Hinzufügen fehlgeschlagen");
      } finally {
        setToggling(null);
      }
    },
    [toggling, assigned, songId, onChanged]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Song einem Set zuweisen"
    >
      <div className="mx-4 w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <h2 className="text-base font-semibold text-neutral-900">Set zuweisen</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            aria-label="Schließen"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto px-4 py-3">
          {loading ? (
            <p className="py-4 text-center text-sm text-neutral-500">Laden…</p>
          ) : sets.length === 0 ? (
            <p className="py-4 text-center text-sm text-neutral-400">
              Noch keine Sets vorhanden. Erstelle zuerst ein Set im Dashboard.
            </p>
          ) : (
            <ul className="space-y-1" role="list">
              {sets.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => handleToggle(s.id)}
                    disabled={toggling === s.id}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-neutral-50 disabled:opacity-50"
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                        assigned.has(s.id)
                          ? "border-newsong-600 bg-newsong-600 text-white"
                          : "border-neutral-300 bg-white"
                      }`}
                      aria-hidden="true"
                    >
                      {assigned.has(s.id) && (
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    <span className="flex-1 text-sm font-medium text-neutral-700">{s.name}</span>
                    <span className="text-xs text-neutral-400">
                      {s.songCount} {s.songCount === 1 ? "Song" : "Songs"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {error && (
            <p className="mt-2 text-sm text-error-600">{error}</p>
          )}
        </div>

        <div className="border-t border-neutral-200 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200"
          >
            Fertig
          </button>
        </div>
      </div>
    </div>
  );
}
