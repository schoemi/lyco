"use client";

import { useState } from "react";
import type { TagKategorieData } from "@/types/vocal-tag";

/**
 * Lösch-Dialog für Tag-Kategorien.
 *
 * Zeigt die Anzahl betroffener Tag-Definitionen und warnt,
 * dass diese Tags keiner Kategorie mehr zugeordnet werden.
 *
 * Anforderungen: 3.5
 */

interface KategorieDeleteDialogProps {
  open: boolean;
  category: TagKategorieData | null;
  onClose: () => void;
  onDeleted: (categoryId: string) => void;
}

export default function KategorieDeleteDialog({
  open,
  category,
  onClose,
  onDeleted,
}: KategorieDeleteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open || !category) return null;

  const affectedCount = category._count?.tagDefinitions ?? 0;

  function handleClose() {
    setError(null);
    onClose();
  }

  async function handleDelete() {
    if (!category) return;

    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/tag-categories/${category.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Fehler beim Löschen");
      }

      onDeleted(category.id);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Fehler beim Löschen"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 cursor-pointer"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="kategorie-delete-dialog-title"
      >
        <h2
          id="kategorie-delete-dialog-title"
          className="mb-4 text-lg font-semibold text-gray-900"
        >
          Kategorie löschen
        </h2>

        <p className="mb-2 text-sm text-gray-700">
          Möchten Sie die Kategorie{" "}
          <strong>&quot;{category.title}&quot;</strong> wirklich löschen?
        </p>

        {affectedCount > 0 && (
          <p className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            {affectedCount === 1
              ? "1 Tag-Definition ist dieser Kategorie zugeordnet und wird keiner Kategorie mehr zugeordnet."
              : `${affectedCount} Tag-Definitionen sind dieser Kategorie zugeordnet und werden keiner Kategorie mehr zugeordnet.`}
          </p>
        )}

        {affectedCount === 0 && (
          <p className="mb-4 text-sm text-gray-500">
            Dieser Kategorie sind keine Tag-Definitionen zugeordnet.
          </p>
        )}

        {error && (
          <p className="mb-4 text-sm text-red-600">{error}</p>
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
