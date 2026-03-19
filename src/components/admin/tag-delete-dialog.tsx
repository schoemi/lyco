"use client";

import { useState } from "react";
import type { TagDefinitionData } from "@/types/vocal-tag";
import { AppIcon } from "@/components/ui/iconify-icon";
import { faClassToIconify } from "@/lib/icon-utils";

/**
 * Bestätigungsdialog beim Löschen einer Tag-Definition.
 * Zeigt die Anzahl betroffener Songs an, wenn der Tag verwendet wird.
 *
 * Anforderungen: 3.8
 */

interface TagDeleteDialogProps {
  open: boolean;
  tag: TagDefinitionData | null;
  affectedSongs: number;
  onClose: () => void;
  onDeleted: (tagId: string) => void;
}

export default function TagDeleteDialog({
  open,
  tag,
  affectedSongs,
  onClose,
  onDeleted,
}: TagDeleteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open || !tag) return null;

  function handleClose() {
    setError(null);
    onClose();
  }

  async function handleDelete() {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/tag-definitions/${tag!.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Fehler beim Löschen");
        return;
      }

      onDeleted(tag!.id);
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tag-delete-title"
      >
        <h2
          id="tag-delete-title"
          className="mb-2 text-lg font-semibold text-gray-900"
        >
          Tag löschen
        </h2>

        <p className="mb-1 text-sm text-gray-600">
          Möchten Sie den Tag{" "}
          <span className="font-medium">
            <AppIcon
              icon={faClassToIconify(tag.icon)}
              color={tag.color}
            />{" "}
            {tag.label}
          </span>{" "}
          (<code className="rounded bg-gray-100 px-1 text-xs">{tag.tag}</code>)
          wirklich löschen?
        </p>

        {affectedSongs > 0 && (
          <div className="my-3 rounded-md bg-amber-50 border border-amber-200 p-3">
            <p className="text-sm font-medium text-amber-800">
              <AppIcon icon="fa6-solid:triangle-exclamation" className="mr-1.5" />
              Dieser Tag wird in{" "}
              <span className="font-bold">{affectedSongs}</span>{" "}
              {affectedSongs === 1 ? "Song" : "Songs"} verwendet.
            </p>
            <p className="mt-1 text-xs text-amber-700">
              Die Tag-Markierungen in den betroffenen Songs werden entfernt.
            </p>
          </div>
        )}

        <p className="mb-4 text-sm text-red-600">
          Diese Aktion kann nicht rückgängig gemacht werden.
        </p>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Lösche..." : "Löschen"}
          </button>
        </div>
      </div>
    </div>
  );
}
