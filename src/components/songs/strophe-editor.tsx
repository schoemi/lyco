"use client";

import { useEffect, useRef, useState } from "react";
import type { StropheDetail, ZeileDetail } from "../../types/song";
import ZeileEditor from "./zeile-editor";
import TimecodeEingabe from "@/components/songs/timecode-eingabe";
import { formatTimecode } from "@/lib/audio/timecode";

interface StropheEditorProps {
  songId: string;
  strophen: StropheDetail[];
  onStrophenChanged: (strophen: StropheDetail[]) => void;
  editing?: boolean;
  showTranslations?: boolean;
  onSeekTo?: (timecodeMs: number) => void;
}

export default function StropheEditor({ songId, strophen, onStrophenChanged, editing: isEditing = true, showTranslations = true, onSeekTo }: StropheEditorProps) {
  const [statusMessage, setStatusMessage] = useState("");
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addValidationError, setAddValidationError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editValidationError, setEditValidationError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [reorderLoading, setReorderLoading] = useState(false);

  const addNameInputRef = useRef<HTMLInputElement>(null);
  const editNameInputRef = useRef<HTMLInputElement>(null);
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);
  const triggerDeleteRef = useRef<HTMLButtonElement | null>(null);

  const sorted = [...strophen].sort((a, b) => a.orderIndex - b.orderIndex);

  // Focus add name input when form opens
  useEffect(() => {
    if (addFormOpen) {
      requestAnimationFrame(() => addNameInputRef.current?.focus());
    }
  }, [addFormOpen]);

  // Focus edit name input when editing starts
  useEffect(() => {
    if (editingId) {
      requestAnimationFrame(() => editNameInputRef.current?.focus());
    }
  }, [editingId]);

  // Focus cancel button when delete confirmation opens
  useEffect(() => {
    if (deleteConfirmId) {
      requestAnimationFrame(() => cancelDeleteRef.current?.focus());
    }
  }, [deleteConfirmId]);

  // Handle Escape key for delete confirmation dialog
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

  function showStatus(msg: string) {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(""), 3000);
  }

  // --- Add Strophe ---
  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAddValidationError(null);
    setAddError(null);

    if (!addName.trim()) {
      setAddValidationError("Name ist erforderlich");
      addNameInputRef.current?.focus();
      return;
    }

    setAddLoading(true);
    try {
      const res = await fetch(`/api/songs/${songId}/strophen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: addName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || "Fehler beim Hinzufügen");
        return;
      }
      const newStrophe: StropheDetail = {
        ...data.strophe,
        progress: data.strophe.progress ?? 0,
        notiz: data.strophe.notiz ?? null,
        zeilen: data.strophe.zeilen ?? [],
        markups: data.strophe.markups ?? [],
      };
      onStrophenChanged([...strophen, newStrophe]);
      setAddName("");
      setAddFormOpen(false);
      showStatus(`Strophe "${newStrophe.name}" hinzugefügt`);
    } catch {
      setAddError("Netzwerkfehler");
    } finally {
      setAddLoading(false);
    }
  }

  function handleCancelAdd() {
    setAddName("");
    setAddValidationError(null);
    setAddError(null);
    setAddFormOpen(false);
  }

  // --- Edit Strophe ---
  function startEdit(strophe: StropheDetail) {
    setEditingId(strophe.id);
    setEditName(strophe.name);
    setEditValidationError(null);
    setEditError(null);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setEditValidationError(null);
    setEditError(null);

    if (!editName.trim()) {
      setEditValidationError("Name ist erforderlich");
      editNameInputRef.current?.focus();
      return;
    }

    setEditLoading(true);
    try {
      const res = await fetch(`/api/songs/${songId}/strophen/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || "Fehler beim Speichern");
        return;
      }
      const updated = strophen.map((s) =>
        s.id === editingId ? { ...s, name: data.strophe.name } : s
      );
      onStrophenChanged(updated);
      setEditingId(null);
      showStatus(`Strophe "${data.strophe.name}" aktualisiert`);
    } catch {
      setEditError("Netzwerkfehler");
    } finally {
      setEditLoading(false);
    }
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditValidationError(null);
    setEditError(null);
  }

  // --- Delete Strophe ---
  function startDelete(stropheId: string, triggerButton: HTMLButtonElement) {
    triggerDeleteRef.current = triggerButton;
    setDeleteConfirmId(stropheId);
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
      const res = await fetch(`/api/songs/${songId}/strophen/${deleteConfirmId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setDeleteError(data.error || "Fehler beim Löschen");
        return;
      }
      const deletedStrophe = strophen.find((s) => s.id === deleteConfirmId);
      const remaining = strophen.filter((s) => s.id !== deleteConfirmId);
      onStrophenChanged(remaining);
      setDeleteConfirmId(null);
      triggerDeleteRef.current = null;
      showStatus(`Strophe "${deletedStrophe?.name}" gelöscht`);
    } catch {
      setDeleteError("Netzwerkfehler");
    } finally {
      setDeleteLoading(false);
    }
  }

  // --- Reorder Strophen ---
  async function handleMove(stropheId: string, direction: "up" | "down") {
    const idx = sorted.findIndex((s) => s.id === stropheId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const a = sorted[idx];
    const b = sorted[swapIdx];

    const newOrder = strophen.map((s) => {
      if (s.id === a.id) return { ...s, orderIndex: b.orderIndex };
      if (s.id === b.id) return { ...s, orderIndex: a.orderIndex };
      return s;
    });

    setReorderLoading(true);
    try {
      const res = await fetch(`/api/songs/${songId}/strophen/reorder`, {
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
      onStrophenChanged(newOrder);
      const dirLabel = direction === "up" ? "nach oben" : "nach unten";
      showStatus(`Strophe "${a.name}" ${dirLabel} verschoben`);
    } catch {
      showStatus("Netzwerkfehler beim Umsortieren");
    } finally {
      setReorderLoading(false);
    }
  }

  const deleteStrophe = deleteConfirmId ? strophen.find((s) => s.id === deleteConfirmId) : null;

  // --- Read-only view ---
  if (!isEditing) {
    return (
      <div className="space-y-4">
        {sorted.length === 0 ? (
          <p className="text-sm text-neutral-400 italic">Keine Strophen vorhanden.</p>
        ) : (
          sorted.map((strophe) => {
            const sortedZeilen = [...strophe.zeilen].sort((a, b) => a.orderIndex - b.orderIndex);
            const timecodeMarkup = strophe.markups.find(
              (m) => m.typ === "TIMECODE" && m.ziel === "STROPHE" && m.timecodeMs != null,
            );
            return (
              <div key={strophe.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-neutral-700">{strophe.name}</h3>
                  {timecodeMarkup && (
                    <button
                      type="button"
                      aria-label={`Springe zu ${formatTimecode(timecodeMarkup.timecodeMs!)}`}
                      onClick={() => onSeekTo?.(timecodeMarkup.timecodeMs!)}
                      className="rounded bg-newsong-100 px-1.5 py-0.5 text-xs font-mono text-newsong-700 cursor-pointer hover:bg-newsong-200 transition-colors"
                    >
                      {formatTimecode(timecodeMarkup.timecodeMs!)}
                    </button>
                  )}
                </div>
                {sortedZeilen.length === 0 ? (
                  <p className="text-sm text-neutral-400 italic">Keine Zeilen.</p>
                ) : (
                  <div className="space-y-0.5">
                    {sortedZeilen.map((zeile) => (
                      <div key={zeile.id}>
                        <p className="text-sm text-neutral-900">{zeile.text}</p>
                        {showTranslations && zeile.uebersetzung && (
                          <p className="text-xs text-neutral-500 italic">{zeile.uebersetzung}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* aria-live status region */}
      <div aria-live="polite" className="sr-only">
        {statusMessage}
      </div>

      {/* Strophe list */}
      {sorted.map((strophe, idx) => (
        <div
          key={strophe.id}
          className="rounded-lg border border-neutral-200 bg-white p-4"
        >
          {/* Timecode input for this strophe */}
          {(() => {
            const timecodeMarkup = strophe.markups.find(
              (m) => m.typ === "TIMECODE" && m.ziel === "STROPHE"
            );
            return (
              <div className="mb-2">
                <TimecodeEingabe
                  stropheId={strophe.id}
                  initialTimecodeMs={timecodeMarkup?.timecodeMs ?? null}
                  onTimecodeChanged={() => {
                    // Refresh handled by parent via onStrophenChanged if needed
                  }}
                />
              </div>
            );
          })()}

          {editingId === strophe.id ? (
            /* Inline edit form */
            <form onSubmit={handleEditSubmit} className="space-y-2" noValidate>

              <div>
                <label htmlFor={`edit-strophe-name-${strophe.id}`} className="block text-sm font-medium text-neutral-700">
                  Name
                </label>
                <input
                  ref={editNameInputRef}
                  id={`edit-strophe-name-${strophe.id}`}
                  type="text"
                  value={editName}
                  onChange={(e) => {
                    setEditName(e.target.value);
                    if (editValidationError) setEditValidationError(null);
                  }}
                  aria-required="true"
                  aria-invalid={editValidationError !== null}
                  aria-describedby={editValidationError ? `edit-strophe-name-error-${strophe.id}` : undefined}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-newsong-500 ${
                    editValidationError ? "border-error-500" : "border-neutral-300"
                  }`}
                />
                {editValidationError && (
                  <p id={`edit-strophe-name-error-${strophe.id}`} className="mt-1 text-sm text-error-600" role="alert">
                    {editValidationError}
                  </p>
                )}
                {editError && (
                  <p className="mt-1 text-sm text-error-600" role="alert">
                    {editError}
                  </p>
                )}
              </div>
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
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-neutral-900">{strophe.name}</span>
                {(() => {
                  const tc = strophe.markups.find(
                    (m) => m.typ === "TIMECODE" && m.ziel === "STROPHE" && m.timecodeMs != null,
                  );
                  return tc ? (
                    <button
                      type="button"
                      aria-label={`Springe zu ${formatTimecode(tc.timecodeMs!)}`}
                      onClick={() => onSeekTo?.(tc.timecodeMs!)}
                      className="rounded bg-newsong-100 px-1.5 py-0.5 text-xs font-mono text-newsong-700 cursor-pointer hover:bg-newsong-200 transition-colors"
                    >
                      {formatTimecode(tc.timecodeMs!)}
                    </button>
                  ) : null;
                })()}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMove(strophe.id, "up")}
                  disabled={idx === 0 || reorderLoading}
                  aria-label={`Strophe ${strophe.name} nach oben verschieben`}
                  className="rounded p-1 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(strophe.id, "down")}
                  disabled={idx === sorted.length - 1 || reorderLoading}
                  aria-label={`Strophe ${strophe.name} nach unten verschieben`}
                  className="rounded p-1 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(strophe)}
                  className="rounded p-1 text-newsong-600 hover:bg-newsong-50"
                  aria-label={`Strophe ${strophe.name} bearbeiten`}
                >
                  ✏️
                </button>
                <button
                  type="button"
                  onClick={(e) => startDelete(strophe.id, e.currentTarget)}
                  className="rounded p-1 text-error-600 hover:bg-error-50"
                  aria-label={`Strophe ${strophe.name} löschen`}
                >
                  🗑️
                </button>
              </div>
            </div>
          )}

          {/* Zeilen editor for this strophe */}
          <div className="mt-3 border-t border-neutral-100 pt-3">
            <ZeileEditor
              songId={songId}
              stropheId={strophe.id}
              zeilen={strophe.zeilen}
              showTranslations={showTranslations}
              onZeilenChanged={(updatedZeilen: ZeileDetail[]) => {
                const updatedStrophen = strophen.map((s) =>
                  s.id === strophe.id ? { ...s, zeilen: updatedZeilen } : s
                );
                onStrophenChanged(updatedStrophen);
              }}
            />
          </div>
        </div>
      ))}

      {/* Add strophe form / button */}
      {addFormOpen ? (
        <form onSubmit={handleAddSubmit} className="space-y-2 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4" noValidate>
          <div>
            <label htmlFor="add-strophe-name" className="block text-sm font-medium text-neutral-700">
              Name
            </label>
            <input
              ref={addNameInputRef}
              id="add-strophe-name"
              type="text"
              value={addName}
              onChange={(e) => {
                setAddName(e.target.value);
                if (addValidationError) setAddValidationError(null);
              }}
              aria-required="true"
              aria-invalid={addValidationError !== null}
              aria-describedby={addValidationError ? "add-strophe-name-error" : undefined}
              placeholder="z.B. Verse 1, Chorus, Bridge"
              className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-newsong-500 ${
                addValidationError ? "border-error-500" : "border-neutral-300"
              }`}
            />
            {addValidationError && (
              <p id="add-strophe-name-error" className="mt-1 text-sm text-error-600" role="alert">
                {addValidationError}
              </p>
            )}
            {addError && (
              <p className="mt-1 text-sm text-error-600" role="alert">
                {addError}
              </p>
            )}
          </div>
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
          className="w-full rounded-lg border border-dashed border-neutral-300 px-4 py-3 text-sm font-medium text-neutral-600 hover:border-newsong-400 hover:text-newsong-600 transition-colors"
        >
          + Strophe hinzufügen
        </button>
      )}

      {/* Delete confirmation dialog */}
      {deleteConfirmId && deleteStrophe && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-label="Strophe löschen"
          onClick={handleCancelDelete}
        >
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-2 text-lg font-semibold text-neutral-900">Strophe löschen</h3>
            <p className="mb-1 text-sm text-neutral-600">
              Möchten Sie die Strophe <span className="font-medium">&quot;{deleteStrophe.name}&quot;</span> wirklich löschen?
            </p>
            <p className="mb-4 text-sm text-error-600">
              Alle zugehörigen Zeilen und Markups werden unwiderruflich gelöscht.
            </p>
            {deleteError && (
              <p className="mb-4 text-sm text-error-600" role="alert">
                {deleteError}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                ref={cancelDeleteRef}
                type="button"
                onClick={handleCancelDelete}
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="rounded-md bg-error-600 px-4 py-2 text-sm font-medium text-white hover:bg-error-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteLoading ? "Lösche..." : "Löschen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
