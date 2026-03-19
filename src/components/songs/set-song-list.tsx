"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { ProgressBar } from "@/components/songs/progress-bar";
import type { SetSongWithProgress } from "@/types/song";

interface SetSongListProps {
  songs: SetSongWithProgress[];
  setId: string;
  onSongRemoved: () => void;
  onReordered: () => void;
}

const statusColors: Record<string, string> = {
  neu: "bg-neutral-400",
  aktiv: "bg-primary-500",
  gelernt: "bg-success-500",
};

const statusLabels: Record<string, string> = {
  neu: "Neu",
  aktiv: "Aktiv",
  gelernt: "Gelernt",
};

export default function SetSongList({ songs, setId, onSongRemoved, onReordered }: SetSongListProps) {
  const router = useRouter();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const handleRemove = useCallback(
    async (songId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (removing) return;
      setRemoving(songId);
      try {
        const res = await fetch(`/api/sets/${setId}/songs/${songId}`, { method: "DELETE" });
        if (res.ok) {
          onSongRemoved();
        }
      } catch {
        // silently ignore
      } finally {
        setRemoving(null);
      }
    },
    [setId, removing, onSongRemoved]
  );

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback(
    async (targetIndex: number) => {
      if (dragIndex === null || dragIndex === targetIndex) {
        setDragIndex(null);
        setDragOverIndex(null);
        return;
      }

      // Reorder locally
      const reordered = [...songs];
      const [moved] = reordered.splice(dragIndex, 1);
      reordered.splice(targetIndex, 0, moved);

      setDragIndex(null);
      setDragOverIndex(null);

      // Persist new order
      const items = reordered.map((song, i) => ({
        songId: song.id,
        orderIndex: i,
      }));

      try {
        const res = await fetch(`/api/sets/${setId}/songs/reorder`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        if (res.ok) {
          onReordered();
        }
      } catch {
        // silently ignore
      }
    },
    [dragIndex, songs, setId, onReordered]
  );

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setDragOverIndex(null);
  }, []);

  if (songs.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-6 py-8 text-center text-sm text-neutral-500">
        Noch keine Songs in diesem Set. Füge Songs hinzu, um loszulegen.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200">
      {songs.map((song, index) => (
        <li
          key={song.id}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={() => handleDrop(index)}
          onDragEnd={handleDragEnd}
          onClick={() => router.push(`/songs/${song.id}`)}
          className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-neutral-50 ${
            dragIndex === index ? "opacity-50" : ""
          } ${dragOverIndex === index && dragIndex !== index ? "border-t-2 border-primary-400" : ""}`}
          role="listitem"
        >
          {/* Drag handle */}
          <span className="cursor-grab text-neutral-400" aria-label="Ziehen zum Sortieren">
            ⠿
          </span>

          {/* Status dot */}
          <span
            className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${statusColors[song.status] ?? "bg-neutral-400"}`}
            role="img"
            aria-label={statusLabels[song.status] ?? song.status}
          />

          {/* Song info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-neutral-900">{song.titel}</span>
              {song.kuenstler && (
                <span className="truncate text-sm text-neutral-500">– {song.kuenstler}</span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-3">
              <ProgressBar value={song.progress} className="max-w-[120px]" />
              <span className="text-xs text-neutral-500">{song.sessionCount} Sessions</span>
            </div>
          </div>

          {/* Remove button */}
          <button
            type="button"
            onClick={(e) => handleRemove(song.id, e)}
            disabled={removing === song.id}
            className="shrink-0 rounded-md px-2 py-1 text-xs text-neutral-500 hover:bg-error-50 hover:text-error-600 disabled:opacity-50"
            aria-label={`${song.titel} aus Set entfernen`}
          >
            {removing === song.id ? "…" : "Entfernen"}
          </button>
        </li>
      ))}
    </ul>
  );
}
