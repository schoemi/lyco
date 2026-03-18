"use client";

import { useEffect, useRef, useState } from "react";
import type { ZeileDetail } from "../../types/song";
import type { TagDefinitionData } from "@/types/vocal-tag";
import type { StrophenViewMode } from "./strophen-view-toggle";
import { ZeileTagInput } from "./zeile-tag-input";
import { ZeileMarkupView } from "./zeile-markup-view";
import { stripChordPro } from "@/lib/vocal-tag/chordpro-parser";

interface ZeileEditorProps {
  songId: string;
  stropheId: string;
  zeilen: ZeileDetail[];
  onZeilenChanged: (zeilen: ZeileDetail[]) => void;
  editing?: boolean;
  viewMode?: StrophenViewMode;
}

export default function ZeileEditor({ songId, stropheId, zeilen, onZeilenChanged, editing: isEditing = true, viewMode = "normal" }: ZeileEditorProps) {
  const [statusMessage, setStatusMessage] = useState("");
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [addText, setAddText] = useState("");
  const [addUebersetzung, setAddUebersetzung] = useState("");
  const [addValidationError, setAddValidationError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editUebersetzung, setEditUebersetzung] = useState("");
  const [editValidationError, setEditValidationError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [reorderLoading, setReorderLoading] = useState(false);
  const [tagDefinitions, setTagDefinitions] = useState<TagDefinitionData[]>([]);

  const addTextInputRef = useRef<HTMLInputElement>(null);
  const editTextInputRef = useRef<HTMLInputElement>(null);
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);
  const triggerDeleteRef = useRef<HTMLButtonElement | null>(null);

  const sorted = [...zeilen].sort((a, b) => a.orderIndex - b.orderIndex);

  // Focus add text input when form opens
  useEffect(() => {
    if (addFormOpen) {
      requestAnimationFrame(() => addTextInputRef.current?.focus());
    }
  }, [addFormOpen]);

  // Focus edit text input when editing starts
  useEffect(() => {
    if (editingId) {
      requestAnimationFrame(() => editTextInputRef.current?.focus());
    }
  }, [editingId]);

  // Focus cancel button when delete confirmation opens
  useEffect(() => {
    if (deleteConfirmId) {
      requestAnimationFrame(() => cancelDeleteRef.current?.focus());
    }
  }, [deleteConfirmId]);

  // Handle Escape key for delete confirmation
  useEffect(() => {
    if (!deleteConfirmId) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleCancelDelete();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  // Fetch tag definitions for vocal tag support
  useEffect(() => {
    let cancelled = false;
    async function fetchTags() {
      try {
        const res = await fetch("/api/tag-definitions");
        if (!res.ok) return;
        const data = await res.json();
        const defs: TagDefinitionData[] = Array.isArray(data) ? data : data.definitions ?? [];
        if (!cancelled) setTagDefinitions(defs);
      } catch {
        // silently ignore – tag toolbar just won't show
      }
    }
    fetchTags();
    return () => { cancelled = true; };
  }, []);

  function showStatus(msg: string) {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(""), 3000);
  }

  const baseUrl = `/api/songs/${songId}/strophen/${stropheId}/zeilen`;

  // --- Add Zeile ---
  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAddValidationError(null);
    setAddError(null);

    if (!addText.trim()) {
      setAddValidationError("Text ist erforderlich");
      addTextInputRef.current?.focus();
      return;
    }

    setAddLoading(true);
    try {
      const body: { text: string; uebersetzung?: string } = { text: addText.trim() };
      if (addUebersetzung.trim()) {
        body.uebersetzung = addUebersetzung.trim();
      }
      const res = await fetch(baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || "Fehler beim Hinzufügen");
        return;
      }
      const newZeile: ZeileDetail = {
        ...data.zeile,
        markups: data.zeile.markups ?? [],
      };
      onZeilenChanged([...zeilen, newZeile]);
      setAddText("");
      setAddUebersetzung("");
      setAddFormOpen(false);
      showStatus("Zeile hinzugefügt");
    } catch {
      setAddError("Netzwerkfehler");
    } finally {
      setAddLoading(false);
    }
  }

  function handleCancelAdd() {
    setAddText("");
    setAddUebersetzung("");
    setAddValidationError(null);
    setAddError(null);
    setAddFormOpen(false);
  }

  // --- Edit Zeile ---
  function startEdit(zeile: ZeileDetail) {
    setEditingId(zeile.id);
    setEditText(zeile.text);
    setEditUebersetzung(zeile.uebersetzung ?? "");
    setEditValidationError(null);
    setEditError(null);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setEditValidationError(null);
    setEditError(null);

    if (!editText.trim()) {
      setEditValidationError("Text ist erforderlich");
      editTextInputRef.current?.focus();
      return;
    }

    setEditLoading(true);
    try {
      const body: { text: string; uebersetzung?: string } = { text: editText.trim() };
      body.uebersetzung = editUebersetzung.trim() || undefined;
      const res = await fetch(`${baseUrl}/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || "Fehler beim Speichern");
        return;
      }
      const updated = zeilen.map((z) =>
        z.id === editingId
          ? { ...z, text: data.zeile.text, uebersetzung: data.zeile.uebersetzung ?? null }
          : z
      );
      onZeilenChanged(updated);
      setEditingId(null);
      showStatus("Zeile aktualisiert");
    } catch {
      setEditError("Netzwerkfehler");
    } finally {
      setEditLoading(false);
    }
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditText("");
    setEditUebersetzung("");
    setEditValidationError(null);
    setEditError(null);
  }

  // --- Delete Zeile ---
  function startDelete(zeileId: string, triggerButton: HTMLButtonElement) {
    triggerDeleteRef.current = triggerButton;
    setDeleteConfirmId(zeileId);
    setDeleteError(null);
  }

  function handleCancelDelete() {
    setDeleteConfirmId(null);
    setDeleteError(null);
    if (triggerDeleteRef.current) {
      triggerDeleteRef.current.focus();
      triggerDeleteRef.current = null;
    }
  }

  async function handleConfirmDelete() {
    if (!deleteConfirmId) return;
    setDeleteError(null);
    setDeleteLoading(true);

    try {
      const res = await fetch(`${baseUrl}/${deleteConfirmId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setDeleteError(data.error || "Fehler beim Löschen");
        return;
      }
      const remaining = zeilen.filter((z) => z.id !== deleteConfirmId);
      onZeilenChanged(remaining);
      setDeleteConfirmId(null);
      triggerDeleteRef.current = null;
      showStatus("Zeile gelöscht");
    } catch {
      setDeleteError("Netzwerkfehler");
    } finally {
      setDeleteLoading(false);
    }
  }

  // --- Reorder Zeilen ---
  async function handleMove(zeileId: string, direction: "up" | "down") {
    const idx = sorted.findIndex((z) => z.id === zeileId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const a = sorted[idx];
    const b = sorted[swapIdx];

    const newOrder = zeilen.map((z) => {
      if (z.id === a.id) return { ...z, orderIndex: b.orderIndex };
      if (z.id === b.id) return { ...z, orderIndex: a.orderIndex };
      return z;
    });

    setReorderLoading(true);
    try {
      const res = await fetch(`${baseUrl}/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order: [
            { id: a.id, orderIndex: b.orderIndex },
            { id: b.id, orderIndex: a.orderIndex },
          ],
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        showStatus(data.error || "Fehler beim Umsortieren");
        return;
      }
      onZeilenChanged(newOrder);
      const dirLabel = direction === "up" ? "nach oben" : "nach unten";
      showStatus(`Zeile ${dirLabel} verschoben`);
    } catch {
      showStatus("Netzwerkfehler beim Umsortieren");
    } finally {
      setReorderLoading(false);
    }
  }

  const deleteZeile = deleteConfirmId ? zeilen.find((z) => z.id === deleteConfirmId) : null;

  // --- Read-only view ---
  if (!isEditing) {
    return (
      <div className="space-y-0.5">
        {sorted.map((zeile) => (
          <div key={zeile.id}>
            {viewMode === "markup" && tagDefinitions.length > 0 ? (
              <p className="text-sm text-neutral-900">
                <ZeileMarkupView text={zeile.text} tagDefinitions={tagDefinitions} />
              </p>
            ) : (
              <p className="text-sm text-neutral-900">{stripChordPro(zeile.text)}</p>
            )}
            {viewMode === "translation" && zeile.uebersetzung && (
              <p className="text-xs text-neutral-500 italic">{zeile.uebersetzung}</p>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* aria-live status region */}
      <div aria-live="polite" className="sr-only">
        {statusMessage}
      </div>

      {/* Zeile list */}
      {sorted.map((zeile, idx) => (
        <div
          key={zeile.id}
          className="rounded border border-neutral-100 bg-neutral-50 p-3"
        >
          {editingId === zeile.id ? (
            /* Inline edit form */
            <form onSubmit={handleEditSubmit} className="space-y-2" noValidate>
              <div>
                <label htmlFor={`edit-zeile-text-${zeile.id}`} className="block text-sm font-medium text-neutral-700">
                  Text
                </label>
                {tagDefinitions.length > 0 ? (
                  <ZeileTagInput
                    id={`edit-zeile-text-${zeile.id}`}
                    value={editText}
                    onChange={(text) => {
                      setEditText(text);
                      if (editValidationError) setEditValidationError(null);
                    }}
                    tagDefinitions={tagDefinitions}
                    ariaRequired
                    ariaInvalid={editValidationError !== null}
                    ariaDescribedBy={editValidationError ? `edit-zeile-text-error-${zeile.id}` : undefined}
                    ariaLabel={`Zeile ${idx + 1} Text bearbeiten`}
                  />
                ) : (
                  <input
                    ref={editTextInputRef}
                    id={`edit-zeile-text-${zeile.id}`}
                    type="text"
                    value={editText}
                    onChange={(e) => {
                      setEditText(e.target.value);
                      if (editValidationError) setEditValidationError(null);
                    }}
                    aria-required="true"
                    aria-invalid={editValidationError !== null}
                    aria-describedby={editValidationError ? `edit-zeile-text-error-${zeile.id}` : undefined}
                    className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-newsong-500 ${
                      editValidationError ? "border-error-500" : "border-neutral-300"
                    }`}
                  />
                )}
                {editValidationError && (
                  <p id={`edit-zeile-text-error-${zeile.id}`} className="mt-1 text-sm text-error-600" role="alert">
                    {editValidationError}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor={`edit-zeile-uebersetzung-${zeile.id}`} className="block text-sm font-medium text-neutral-700">
                  Übersetzung
                </label>
                <input
                  id={`edit-zeile-uebersetzung-${zeile.id}`}
                  type="text"
                  value={editUebersetzung}
                  onChange={(e) => setEditUebersetzung(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-newsong-500"
                />
              </div>
              {editError && (
                <p className="text-sm text-error-600" role="alert">
                  {editError}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={editLoading}
                  className="rounded-md bg-newsong-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-newsong-700 disabled:opacity-50"
                >
                  {editLoading ? "Speichere..." : "Bestätigen"}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          ) : (
            /* Display mode */
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-neutral-900">{stripChordPro(zeile.text)}</p>
                {viewMode === "translation" && zeile.uebersetzung && (
                  <p className="text-xs text-neutral-500 italic">{zeile.uebersetzung}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleMove(zeile.id, "up")}
                  disabled={idx === 0 || reorderLoading}
                  aria-label={`Zeile ${idx + 1} nach oben verschieben`}
                  className="rounded p-1 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(zeile.id, "down")}
                  disabled={idx === sorted.length - 1 || reorderLoading}
                  aria-label={`Zeile ${idx + 1} nach unten verschieben`}
                  className="rounded p-1 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(zeile)}
                  className="rounded p-1 text-newsong-600 hover:bg-newsong-50"
                  aria-label={`Zeile ${idx + 1} bearbeiten`}
                >
                  ✏️
                </button>
                <button
                  type="button"
                  onClick={(e) => startDelete(zeile.id, e.currentTarget)}
                  className="rounded p-1 text-error-600 hover:bg-error-50"
                  aria-label={`Zeile ${idx + 1} löschen`}
                >
                  🗑️
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add zeile form / button */}
      {addFormOpen ? (
        <form onSubmit={handleAddSubmit} className="space-y-2 rounded border border-dashed border-neutral-300 bg-white p-3" noValidate>
          <div>
            <label htmlFor={`add-zeile-text-${stropheId}`} className="block text-sm font-medium text-neutral-700">
              Text
            </label>
            {tagDefinitions.length > 0 ? (
              <ZeileTagInput
                id={`add-zeile-text-${stropheId}`}
                value={addText}
                onChange={(text) => {
                  setAddText(text);
                  if (addValidationError) setAddValidationError(null);
                }}
                tagDefinitions={tagDefinitions}
                ariaRequired
                ariaInvalid={addValidationError !== null}
                ariaDescribedBy={addValidationError ? `add-zeile-text-error-${stropheId}` : undefined}
                ariaLabel="Neue Zeile Text"
              />
            ) : (
              <input
                ref={addTextInputRef}
                id={`add-zeile-text-${stropheId}`}
                type="text"
                value={addText}
                onChange={(e) => {
                  setAddText(e.target.value);
                  if (addValidationError) setAddValidationError(null);
                }}
                aria-required="true"
                aria-invalid={addValidationError !== null}
                aria-describedby={addValidationError ? `add-zeile-text-error-${stropheId}` : undefined}
                placeholder="Zeilentext eingeben"
                className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-newsong-500 ${
                  addValidationError ? "border-error-500" : "border-neutral-300"
                }`}
              />
            )}
            {addValidationError && (
              <p id={`add-zeile-text-error-${stropheId}`} className="mt-1 text-sm text-error-600" role="alert">
                {addValidationError}
              </p>
            )}
          </div>
          <div>
            <label htmlFor={`add-zeile-uebersetzung-${stropheId}`} className="block text-sm font-medium text-neutral-700">
              Übersetzung
            </label>
            <input
              id={`add-zeile-uebersetzung-${stropheId}`}
              type="text"
              value={addUebersetzung}
              onChange={(e) => setAddUebersetzung(e.target.value)}
              placeholder="Optionale Übersetzung"
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-newsong-500"
            />
          </div>
          {addError && (
            <p className="text-sm text-error-600" role="alert">
              {addError}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={addLoading}
              className="rounded-md bg-newsong-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-newsong-700 disabled:opacity-50"
            >
              {addLoading ? "Erstelle..." : "Hinzufügen"}
            </button>
            <button
              type="button"
              onClick={handleCancelAdd}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Abbrechen
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAddFormOpen(true)}
          className="w-full rounded border border-dashed border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-600 hover:border-newsong-400 hover:text-newsong-600 transition-colors"
        >
          + Zeile hinzufügen
        </button>
      )}

      {/* Delete confirmation inline */}
      {deleteConfirmId && deleteZeile && (
        <div className="rounded border border-error-200 bg-error-50 p-3">
          <p className="mb-2 text-sm text-neutral-700">
            Möchten Sie diese Zeile wirklich löschen?
          </p>
          <p className="mb-2 text-xs text-neutral-500 italic truncate">
            &quot;{deleteZeile.text}&quot;
          </p>
          {deleteError && (
            <p className="mb-2 text-sm text-error-600" role="alert">
              {deleteError}
            </p>
          )}
          <div className="flex gap-2">
            <button
              ref={cancelDeleteRef}
              type="button"
              onClick={handleCancelDelete}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={deleteLoading}
              className="rounded-md bg-error-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-error-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleteLoading ? "Lösche..." : "Löschen"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
