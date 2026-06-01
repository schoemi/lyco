"use client";

import { useState } from "react";
import type { TagKategorieData } from "@/types/vocal-tag";

/**
 * Erstellungs-Dialog für neue Tag-Kategorien.
 *
 * Anforderungen: 3.4
 */

interface KategorieCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (category: TagKategorieData) => void;
}

export default function KategorieCreateDialog({
  open,
  onClose,
  onCreated,
}: KategorieCreateDialogProps) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  function resetForm() {
    setTitle("");
    setSlug("");
    setError(null);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError({ message: "Titel ist erforderlich", field: "title" });
      return;
    }
    if (!slug.trim()) {
      setError({ message: "Slug ist erforderlich", field: "slug" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/tag-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setError({ message: data.error || "Eine Kategorie mit diesem Slug existiert bereits", field: "slug" });
          return;
        }
        setError({ message: data.error || "Fehler beim Erstellen", field: data.field });
        return;
      }

      onCreated(data.category);
      resetForm();
    } catch {
      setError({ message: "Netzwerkfehler" });
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
        aria-labelledby="kategorie-create-dialog-title"
      >
        <h2
          id="kategorie-create-dialog-title"
          className="mb-4 text-lg font-semibold text-gray-900"
        >
          Neue Kategorie erstellen
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="create-kategorie-title"
              className="block text-sm font-medium text-gray-700"
            >
              Titel
            </label>
            <input
              id="create-kategorie-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Technik, Emotion, Dynamik"
              aria-label="Kategorie-Titel"
              className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                error?.field === "title" ? "border-red-500" : "border-gray-300"
              }`}
            />
            {error?.field === "title" && (
              <p className="mt-1 text-sm text-red-600">{error.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="create-kategorie-slug"
              className="block text-sm font-medium text-gray-700"
            >
              Slug
            </label>
            <input
              id="create-kategorie-slug"
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="z.B. technique, emotion, dynamics"
              aria-label="Kategorie-Slug"
              className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                error?.field === "slug" ? "border-red-500" : "border-gray-300"
              }`}
            />
            {error?.field === "slug" && (
              <p className="mt-1 text-sm text-red-600">{error.message}</p>
            )}
          </div>

          {error && !error.field && (
            <p className="text-sm text-red-600">{error.message}</p>
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
