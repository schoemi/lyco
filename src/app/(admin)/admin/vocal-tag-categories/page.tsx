"use client";

import { useEffect, useState, useCallback } from "react";
import type { TagKategorieData } from "@/types/vocal-tag";
import KategorieCreateDialog from "@/components/admin/kategorie-create-dialog";
import KategorieDeleteDialog from "@/components/admin/kategorie-delete-dialog";
import { AppIcon } from "@/components/ui/iconify-icon";

/**
 * Kategorie-Verwaltungsseite – Admin-Oberfläche zum Anzeigen und Inline-Bearbeiten
 * von Vocal-Tag-Kategorien.
 *
 * Anforderungen: 3.1, 3.2, 3.3, 3.6
 */

interface EditingState {
  id: string;
  field: "title" | "orderIndex";
  value: string;
}

export default function VocalTagCategoriesPage() {
  const [categories, setCategories] = useState<TagKategorieData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TagKategorieData | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tag-categories");
      if (!res.ok) throw new Error("Fehler beim Laden");
      const data = await res.json();
      setCategories(data.categories);
      setError(null);
    } catch {
      setError("Kategorien konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  function startEditing(
    category: TagKategorieData,
    field: EditingState["field"]
  ) {
    const value =
      field === "orderIndex" ? String(category.orderIndex) : category[field];
    setEditing({ id: category.id, field, value });
  }

  async function saveEdit() {
    if (!editing) return;

    const category = categories.find((c) => c.id === editing.id);
    if (!category) return;

    const updatePayload: Record<string, unknown> = {};
    if (editing.field === "orderIndex") {
      const num = parseInt(editing.value, 10);
      if (isNaN(num)) {
        setEditing(null);
        return;
      }
      if (num === category.orderIndex) {
        setEditing(null);
        return;
      }
      updatePayload.orderIndex = num;
    } else {
      const trimmed = editing.value.trim();
      if (!trimmed || trimmed === category[editing.field]) {
        setEditing(null);
        return;
      }
      updatePayload[editing.field] = trimmed;
    }

    setSaving(editing.id);
    try {
      const res = await fetch(`/api/tag-categories/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Fehler beim Speichern");
      }
      const data = await res.json();
      setCategories((prev) =>
        prev
          .map((c) => (c.id === data.category.id ? data.category : c))
          .sort((a, b) => a.orderIndex - b.orderIndex)
      );
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Fehler beim Speichern"
      );
    } finally {
      setSaving(null);
      setEditing(null);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEdit();
    } else if (e.key === "Escape") {
      setEditing(null);
    }
  }

  function renderCell(
    category: TagKategorieData,
    field: EditingState["field"]
  ) {
    const isEditing =
      editing?.id === category.id && editing?.field === field;
    const isSaving = saving === category.id;

    if (isEditing) {
      return (
        <input
          type={field === "orderIndex" ? "number" : "text"}
          value={editing.value}
          onChange={(e) =>
            setEditing((prev) =>
              prev ? { ...prev, value: e.target.value } : null
            )
          }
          onBlur={saveEdit}
          onKeyDown={handleKeyDown}
          autoFocus
          disabled={isSaving}
          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          aria-label={`${field} bearbeiten für ${category.title}`}
        />
      );
    }

    const displayValue =
      field === "orderIndex" ? category.orderIndex : category[field];
    return (
      <button
        type="button"
        onClick={() => startEditing(category, field)}
        className="rounded px-1 py-0.5 text-left hover:bg-gray-100"
        aria-label={`${field} bearbeiten für ${category.title}`}
      >
        {displayValue}
      </button>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Kategorie-Verwaltung
        </h1>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Neue Kategorie
        </button>
      </div>

      <KategorieCreateDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(newCategory) => {
          setCategories((prev) =>
            [...prev, newCategory].sort((a, b) => a.orderIndex - b.orderIndex)
          );
          setShowCreate(false);
        }}
      />

      <KategorieDeleteDialog
        open={deleteTarget !== null}
        category={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={(categoryId) => {
          setCategories((prev) => prev.filter((c) => c.id !== categoryId));
          setDeleteTarget(null);
        }}
      />

      {loading && (
        <p className="text-sm text-gray-500">Lade Kategorien...</p>
      )}
      {error && (
        <div className="mb-4 flex items-center gap-2">
          <p className="text-sm text-red-600">{error}</p>
          <button
            type="button"
            onClick={fetchCategories}
            className="rounded-md border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Erneut versuchen
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Titel
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Slug
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Tags
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Reihenfolge
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {categories.map((category) => (
                <tr
                  key={category.id}
                  className="hover:bg-gray-50 transition-colors"
                  aria-label={category.title}
                >
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                    {renderCell(category, "title")}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700">
                      {category.slug}
                    </code>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    <span className="inline-flex items-center gap-1">
                      <AppIcon
                        icon="lucide:tag"
                        className="text-xs text-gray-400"
                      />
                      {category._count?.tagDefinitions ?? 0}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {renderCell(category, "orderIndex")}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(category)}
                      disabled={deleteLoading === category.id}
                      className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      aria-label={`${category.title} löschen`}
                    >
                      {deleteLoading === category.id ? (
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-red-600" />
                      ) : (
                        <AppIcon icon="lucide:trash-2" className="text-sm" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-sm text-gray-500"
                  >
                    Keine Kategorien vorhanden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
