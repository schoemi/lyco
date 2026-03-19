"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { TagDefinitionData } from "@/types/vocal-tag";
import TagCreateDialog from "@/components/admin/tag-create-dialog";
import TagDeleteDialog from "@/components/admin/tag-delete-dialog";
import { TagConfigExportButton } from "@/components/vocal-tag/tag-config-export-button";
import {
  TagConfigImportButton,
  type TagConfigImportResult,
} from "@/components/vocal-tag/tag-config-import-button";
import { AppIcon } from "@/components/ui/iconify-icon";
import { faClassToIconify } from "@/lib/icon-utils";

/**
 * Tag-Verwaltungsseite – Admin-Oberfläche zum Anzeigen und Inline-Bearbeiten
 * von Vocal-Tag-Definitionen.
 *
 * Anforderungen: 3.1, 3.2, 3.3, 3.7, 3.8, 3.9
 */

interface EditingState {
  id: string;
  field: "label" | "color" | "indexNr";
  value: string;
}

export default function VocalTagsPage() {
  const [tags, setTags] = useState<TagDefinitionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTag, setDeleteTag] = useState<TagDefinitionData | null>(null);
  const [deleteAffectedSongs, setDeleteAffectedSongs] = useState(0);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);
  const dragCounter = useRef(0);

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch("/api/tag-definitions");
      if (!res.ok) throw new Error("Fehler beim Laden");
      const data = await res.json();
      setTags(data.definitions);
      setError(null);
    } catch {
      setError("Tag-Definitionen konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  function startEditing(tag: TagDefinitionData, field: EditingState["field"]) {
    const value =
      field === "indexNr" ? String(tag.indexNr) : tag[field];
    setEditing({ id: tag.id, field, value });
  }

  async function saveEdit() {
    if (!editing) return;

    const tag = tags.find((t) => t.id === editing.id);
    if (!tag) return;

    const updatePayload: Record<string, unknown> = {};
    if (editing.field === "indexNr") {
      const num = parseInt(editing.value, 10);
      if (isNaN(num)) {
        setEditing(null);
        return;
      }
      if (num === tag.indexNr) {
        setEditing(null);
        return;
      }
      updatePayload.indexNr = num;
    } else {
      const trimmed = editing.value.trim();
      if (!trimmed || trimmed === tag[editing.field]) {
        setEditing(null);
        return;
      }
      updatePayload[editing.field] = trimmed;
    }

    setSaving(editing.id);
    try {
      const res = await fetch(`/api/tag-definitions/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Fehler beim Speichern");
      }
      const data = await res.json();
      setTags((prev) =>
        prev
          .map((t) => (t.id === data.definition.id ? data.definition : t))
          .sort((a, b) => a.indexNr - b.indexNr)
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

  async function handleDeleteClick(tag: TagDefinitionData) {
    setDeleteLoading(tag.id);
    try {
      const res = await fetch(`/api/tag-definitions/${tag.id}/count`);
      if (!res.ok) {
        setError("Fehler beim Prüfen der Tag-Verwendung.");
        return;
      }
      const data = await res.json();
      setDeleteAffectedSongs(data.count);
      setDeleteTag(tag);
    } catch {
      setError("Fehler beim Prüfen der Tag-Verwendung.");
    } finally {
      setDeleteLoading(null);
    }
  }

  function handleDragStart(e: React.DragEvent<HTMLTableRowElement>, index: number) {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
    // Make the dragged row semi-transparent
    requestAnimationFrame(() => {
      (e.target as HTMLElement).style.opacity = "0.4";
    });
  }

  function handleDragEnd(e: React.DragEvent<HTMLTableRowElement>) {
    (e.target as HTMLElement).style.opacity = "1";
    setDragIndex(null);
    setDragOverIndex(null);
    dragCounter.current = 0;
  }

  function handleDragEnter(e: React.DragEvent<HTMLTableRowElement>, index: number) {
    e.preventDefault();
    dragCounter.current++;
    if (index !== dragIndex) {
      setDragOverIndex(index);
    }
  }

  function handleDragLeave() {
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOverIndex(null);
    }
  }

  function handleDragOver(e: React.DragEvent<HTMLTableRowElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  async function handleDrop(e: React.DragEvent<HTMLTableRowElement>, dropIndex: number) {
    e.preventDefault();
    dragCounter.current = 0;
    setDragOverIndex(null);

    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      return;
    }

    // Reorder the tags array
    const reordered = [...tags];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);

    // Assign new sequential indexNr values
    const updated = reordered.map((tag, i) => ({ ...tag, indexNr: i + 1 }));
    setTags(updated);
    setDragIndex(null);

    // Persist only the tags whose indexNr actually changed
    const changed = updated.filter((tag) => {
      const original = tags.find((t) => t.id === tag.id);
      return original && original.indexNr !== tag.indexNr;
    });

    if (changed.length === 0) return;

    setReordering(true);
    try {
      await Promise.all(
        changed.map((tag) =>
          fetch(`/api/tag-definitions/${tag.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ indexNr: tag.indexNr }),
          }).then((res) => {
            if (!res.ok) throw new Error("Fehler beim Speichern der Reihenfolge");
          })
        )
      );
      setError(null);
    } catch {
      setError("Reihenfolge konnte nicht gespeichert werden.");
      // Revert to original order
      fetchTags();
    } finally {
      setReordering(false);
    }
  }

  const [importing, setImporting] = useState(false);

  async function handleTagConfigImport(result: TagConfigImportResult) {
    setImporting(true);
    setError(null);
    try {
      for (const item of result.items) {
        const existing = tags.find((t) => t.tag === item.tag);
        if (existing) {
          if (result.duplicateStrategy === "skip") continue;
          // Overwrite: update existing
          await fetch(`/api/tag-definitions/${existing.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              label: item.label,
              icon: item.icon,
              color: item.color,
              indexNr: item.indexNr,
            }),
          });
        } else {
          // Create new
          await fetch("/api/tag-definitions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item),
          });
        }
      }
      await fetchTags();
    } catch {
      setError("Fehler beim Importieren der Tag-Konfiguration.");
    } finally {
      setImporting(false);
    }
  }

  function renderCell(
    tag: TagDefinitionData,
    field: EditingState["field"]
  ) {
    const isEditing =
      editing?.id === tag.id && editing?.field === field;
    const isSaving = saving === tag.id;

    if (isEditing) {
      return (
        <input
          type={field === "color" ? "color" : field === "indexNr" ? "number" : "text"}
          value={editing.value}
          onChange={(e) =>
            setEditing((prev) => (prev ? { ...prev, value: e.target.value } : null))
          }
          onBlur={saveEdit}
          onKeyDown={handleKeyDown}
          autoFocus
          disabled={isSaving}
          className={
            field === "color"
              ? "h-8 w-8 cursor-pointer rounded border border-gray-300"
              : "w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          }
          aria-label={`${field} bearbeiten für ${tag.label}`}
        />
      );
    }

    if (field === "color") {
      return (
        <button
          type="button"
          onClick={() => startEditing(tag, field)}
          className="flex items-center gap-2 rounded px-1 py-0.5 hover:bg-gray-100"
          aria-label={`Farbe bearbeiten für ${tag.label}`}
        >
          <span
            className="inline-block h-5 w-5 rounded border border-gray-200"
            style={{ backgroundColor: tag.color }}
          />
          <span className="text-xs font-mono text-gray-500">{tag.color}</span>
        </button>
      );
    }

    const displayValue = field === "indexNr" ? tag.indexNr : tag[field];
    return (
      <button
        type="button"
        onClick={() => startEditing(tag, field)}
        className="rounded px-1 py-0.5 text-left hover:bg-gray-100"
        aria-label={`${field} bearbeiten für ${tag.label}`}
      >
        {displayValue}
      </button>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Vocal-Tag-Verwaltung
        </h1>
        <div className="flex items-center gap-2">
          <TagConfigExportButton definitions={tags} disabled={loading || importing} />
          <TagConfigImportButton
            existingTags={tags}
            onImport={handleTagConfigImport}
            disabled={loading || importing}
          />
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Neuer Tag
          </button>
        </div>
      </div>

      <TagCreateDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(newTag) => {
          setTags((prev) => [...prev, newTag].sort((a, b) => a.indexNr - b.indexNr));
          setShowCreate(false);
        }}
      />

      <TagDeleteDialog
        open={deleteTag !== null}
        tag={deleteTag}
        affectedSongs={deleteAffectedSongs}
        onClose={() => {
          setDeleteTag(null);
          setDeleteAffectedSongs(0);
        }}
        onDeleted={(tagId) => {
          setTags((prev) => prev.filter((t) => t.id !== tagId));
          setDeleteTag(null);
          setDeleteAffectedSongs(0);
        }}
      />

      {loading && (
        <p className="text-sm text-gray-500">Lade Tag-Definitionen...</p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {reordering && (
        <p className="text-sm text-blue-600">Reihenfolge wird gespeichert...</p>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-10 px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <span className="sr-only">Sortieren</span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Icon
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Label
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Kürzel
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Farbe
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Nr.
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tags.map((tag, index) => (
                <tr
                  key={tag.id}
                  draggable={!editing && !reordering}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnd={handleDragEnd}
                  onDragEnter={(e) => handleDragEnter(e, index)}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`hover:bg-gray-50 transition-colors ${
                    dragOverIndex === index && dragIndex !== index
                      ? "border-t-2 border-blue-500"
                      : ""
                  } ${dragIndex === index ? "opacity-40" : ""}`}
                  aria-label={`${tag.label} (${tag.tag})`}
                >
                  <td className="whitespace-nowrap px-2 py-3 text-sm">
                    <span
                      className="cursor-grab text-gray-400 hover:text-gray-600 select-none"
                      aria-label={`${tag.label} ziehen zum Sortieren`}
                    >
                      ⠿
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <AppIcon
                      icon={faClassToIconify(tag.icon)}
                      color={tag.color}
                    />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                    {renderCell(tag, "label")}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700">
                      {tag.tag}
                    </code>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    {renderCell(tag, "color")}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {renderCell(tag, "indexNr")}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(tag)}
                      disabled={deleteLoading === tag.id}
                      className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      aria-label={`${tag.label} löschen`}
                    >
                      {deleteLoading === tag.id ? (
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-red-600" />
                      ) : (
                        <AppIcon icon="fa6-solid:trash-can" className="text-sm" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
              {tags.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-sm text-gray-500"
                  >
                    Keine Tag-Definitionen vorhanden.
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
