"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { ZeileDetail } from "../../types/song";
import type { TagDefinitionData, TagKategorieData } from "@/types/vocal-tag";
import type { StrophenViewMode } from "./strophen-view-toggle";
import { ZeileTagInput } from "./zeile-tag-input";
import { ZeileMarkupView } from "./zeile-markup-view";
import { stripChordPro } from "@/lib/vocal-tag/chordpro-parser";
import { parseChords } from "@/lib/chords/chord-parser";
import { ChordAnzeige } from "@/components/songs/chord-anzeige";
import { AppIcon } from "@/components/ui/iconify-icon";
interface ZeileEditorProps {
  songId: string;
  stropheId: string;
  zeilen: ZeileDetail[];
  onZeilenChanged: (zeilen: ZeileDetail[]) => void;
  editing?: boolean;
  viewMode?: StrophenViewMode;
  /** Controls whether translation fields are shown in edit mode */
  showTranslations?: boolean;
  /** Controls whether chord display is shown above text lines */
  showChords?: boolean;
}

export default function ZeileEditor({ songId, stropheId, zeilen, onZeilenChanged, editing: isEditing = true, viewMode = "normal", showTranslations = true, showChords = false }: ZeileEditorProps) {
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
  const [tagKategorien, setTagKategorien] = useState<TagKategorieData[]>([]);

  // Taktbereich state per zeile: { [zeileId]: { startTakt: string, endTakt: string } }
  const [taktbereichInputs, setTaktbereichInputs] = useState<Record<string, { startTakt: string; endTakt: string }>>({});
  const [taktbereichError, setTaktbereichError] = useState<Record<string, string | null>>({});

  const addTextInputRef = useRef<HTMLInputElement>(null);
  const editTextInputRef = useRef<HTMLInputElement>(null);
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);
  const triggerDeleteRef = useRef<HTMLButtonElement | null>(null);

  const sorted = [...zeilen].sort((a, b) => a.orderIndex - b.orderIndex);

  // Collect recently used chords from all zeilen in this strophe
  const recentChords = useMemo(() => {
    if (!showChords) return [];
    const seen = new Set<string>();
    const chords: string[] = [];
    for (const zeile of zeilen) {
      const parsed = parseChords(zeile.text);
      for (const chord of parsed.chords) {
        if (chord.name && !seen.has(chord.name)) {
          seen.add(chord.name);
          chords.push(chord.name);
        }
      }
    }
    // Return last 8 unique chords
    return chords.slice(-8);
  }, [zeilen, showChords]);

  // Insert chord notation at cursor position in an input element
  const insertChordAtCursor = useCallback(
    (
      inputRef: React.RefObject<HTMLInputElement | null>,
      currentValue: string,
      setValue: (val: string) => void,
      chordNotation: string,
      placeCursorInside?: boolean,
    ) => {
      const input = inputRef.current;
      const cursorPos = input?.selectionStart ?? currentValue.length;
      const before = currentValue.slice(0, cursorPos);
      const after = currentValue.slice(cursorPos);
      const newValue = before + chordNotation + after;
      setValue(newValue);

      // Restore cursor position after React re-render
      requestAnimationFrame(() => {
        if (input) {
          const newPos = placeCursorInside
            ? cursorPos + 1 // Place cursor between [ and ]
            : cursorPos + chordNotation.length;
          input.setSelectionRange(newPos, newPos);
          input.focus();
        }
      });
    },
    [],
  );

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

  // Fetch tag definitions and categories for vocal tag support
  useEffect(() => {
    let cancelled = false;
    async function fetchTags() {
      try {
        const [tagsRes, categoriesRes] = await Promise.all([
          fetch("/api/tag-definitions"),
          fetch("/api/tag-categories"),
        ]);
        if (!tagsRes.ok) return;
        const tagsData = await tagsRes.json();
        const defs: TagDefinitionData[] = Array.isArray(tagsData) ? tagsData : tagsData.definitions ?? [];
        if (!cancelled) setTagDefinitions(defs);

        if (categoriesRes.ok) {
          const catData = await categoriesRes.json();
          const cats: TagKategorieData[] = Array.isArray(catData) ? catData : catData.categories ?? [];
          if (!cancelled) setTagKategorien(cats);
        }
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

    // Validate chord brackets on save
    if (showChords) {
      const chordError = validateChordBrackets(addText);
      if (chordError) {
        setAddValidationError(chordError);
        addTextInputRef.current?.focus();
        return;
      }
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

  // Validate chord brackets in text — returns error message or null
  function validateChordBrackets(text: string): string | null {
    let i = 0;
    while (i < text.length) {
      if (text[i] === "[") {
        const closingBracket = text.indexOf("]", i + 1);
        if (closingBracket === -1) {
          return "Nicht geschlossene Akkord-Klammer gefunden";
        }
        i = closingBracket + 1;
      } else {
        i++;
      }
    }
    return null;
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

    // Validate chord brackets on save
    if (showChords) {
      const chordError = validateChordBrackets(editText);
      if (chordError) {
        setEditValidationError(chordError);
        editTextInputRef.current?.focus();
        return;
      }
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

  // --- Toggle Kommentar ---
  async function handleToggleKommentar(zeile: ZeileDetail) {
    const newValue = !zeile.istKommentar;
    const previousZeilen = zeilen;

    // Optimistic update
    const updated = zeilen.map((z) =>
      z.id === zeile.id ? { ...z, istKommentar: newValue } : z
    );
    onZeilenChanged(updated);

    try {
      const res = await fetch(`${baseUrl}/${zeile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ istKommentar: newValue }),
      });
      if (!res.ok) {
        // Revert on error
        onZeilenChanged(previousZeilen);
        showStatus("Fehler beim Ändern der Kommentar-Markierung");
        return;
      }
      showStatus(
        newValue
          ? "Zeile als Kommentar markiert"
          : "Kommentar-Markierung entfernt"
      );
    } catch {
      // Revert on network error
      onZeilenChanged(previousZeilen);
      showStatus("Netzwerkfehler beim Ändern der Kommentar-Markierung");
    }
  }

  // --- Taktbereich helpers ---
  function getTaktbereichInput(zeile: ZeileDetail) {
    if (taktbereichInputs[zeile.id]) return taktbereichInputs[zeile.id];
    return {
      startTakt: zeile.startTakt != null ? String(zeile.startTakt) : "",
      endTakt: zeile.endTakt != null ? String(zeile.endTakt) : "",
    };
  }

  function setTaktbereichField(zeileId: string, field: "startTakt" | "endTakt", value: string) {
    setTaktbereichInputs((prev) => ({
      ...prev,
      [zeileId]: {
        ...getTaktbereichInputForId(zeileId),
        [field]: value,
      },
    }));
    // Clear error on input change
    if (taktbereichError[zeileId]) {
      setTaktbereichError((prev) => ({ ...prev, [zeileId]: null }));
    }
  }

  function getTaktbereichInputForId(zeileId: string) {
    if (taktbereichInputs[zeileId]) return taktbereichInputs[zeileId];
    const zeile = zeilen.find((z) => z.id === zeileId);
    return {
      startTakt: zeile?.startTakt != null ? String(zeile.startTakt) : "",
      endTakt: zeile?.endTakt != null ? String(zeile.endTakt) : "",
    };
  }

  async function handleTaktbereichSave(zeile: ZeileDetail) {
    const input = getTaktbereichInput(zeile);
    const startStr = input.startTakt.trim();
    const endStr = input.endTakt.trim();

    // Parse values: empty → null, otherwise integer
    const startTakt = startStr === "" ? null : parseInt(startStr, 10);
    const endTakt = endStr === "" ? null : parseInt(endStr, 10);

    // Validate: positive integers only
    if (startTakt !== null && (!Number.isInteger(startTakt) || startTakt < 1)) {
      setTaktbereichError((prev) => ({ ...prev, [zeile.id]: "Takt von muss eine positive Ganzzahl sein" }));
      return;
    }
    if (endTakt !== null && (!Number.isInteger(endTakt) || endTakt < 1)) {
      setTaktbereichError((prev) => ({ ...prev, [zeile.id]: "Takt bis muss eine positive Ganzzahl sein" }));
      return;
    }

    // Validate: endTakt >= startTakt
    if (startTakt !== null && endTakt !== null && endTakt < startTakt) {
      setTaktbereichError((prev) => ({ ...prev, [zeile.id]: "Takt bis muss ≥ Takt von sein" }));
      return;
    }

    // Skip if values haven't changed
    if (startTakt === zeile.startTakt && endTakt === zeile.endTakt) return;

    // Clear error
    setTaktbereichError((prev) => ({ ...prev, [zeile.id]: null }));

    // Optimistic update
    const previousZeilen = zeilen;
    const updated = zeilen.map((z) =>
      z.id === zeile.id ? { ...z, startTakt, endTakt } : z
    );
    onZeilenChanged(updated);

    try {
      const res = await fetch(`${baseUrl}/${zeile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startTakt, endTakt }),
      });
      if (!res.ok) {
        // Rollback on error
        onZeilenChanged(previousZeilen);
        // Reset input to previous values
        setTaktbereichInputs((prev) => ({
          ...prev,
          [zeile.id]: {
            startTakt: zeile.startTakt != null ? String(zeile.startTakt) : "",
            endTakt: zeile.endTakt != null ? String(zeile.endTakt) : "",
          },
        }));
        showStatus("Fehler beim Speichern des Taktbereichs");
        return;
      }
      showStatus("Taktbereich gespeichert");
    } catch {
      // Rollback on network error
      onZeilenChanged(previousZeilen);
      setTaktbereichInputs((prev) => ({
        ...prev,
        [zeile.id]: {
          startTakt: zeile.startTakt != null ? String(zeile.startTakt) : "",
          endTakt: zeile.endTakt != null ? String(zeile.endTakt) : "",
        },
      }));
      showStatus("Netzwerkfehler beim Speichern des Taktbereichs");
    }
  }

  function handleTaktbereichKeyDown(e: React.KeyboardEvent, zeile: ZeileDetail) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleTaktbereichSave(zeile);
    }
  }

  const deleteZeile = deleteConfirmId ? zeilen.find((z) => z.id === deleteConfirmId) : null;

  // --- Read-only view ---
  if (!isEditing) {
    return (
      <div className="space-y-0.5">
        {sorted.map((zeile) => {
          const parsed = parseChords(zeile.text);
          const hasChords = parsed.chords.length > 0;
          return (
            <div key={zeile.id} className={zeile.istKommentar ? "rounded bg-amber-50 border border-amber-200 px-2 py-1" : ""}>
              {hasChords ? (
                <ChordAnzeige text={zeile.text} tagDefinitions={tagDefinitions} />
              ) : viewMode === "markup" && tagDefinitions.length > 0 ? (
                <p className={`text-sm ${zeile.istKommentar ? "text-amber-800 italic" : "text-neutral-900"}`}>
                  <ZeileMarkupView text={parsed.plainText} tagDefinitions={tagDefinitions} />
                </p>
              ) : (
                <p className={`text-sm ${zeile.istKommentar ? "text-amber-800 italic" : "text-neutral-900"}`}>{stripChordPro(parsed.plainText)}</p>
              )}
              {showTranslations && zeile.uebersetzung && (
                <p className="text-xs text-neutral-500 italic">{zeile.uebersetzung}</p>
              )}
            </div>
          );
        })}
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
          className={`rounded border p-3 ${
            zeile.istKommentar
              ? "border-amber-200 bg-amber-50"
              : "border-neutral-100 bg-neutral-50"
          }`}
        >
          {editingId === zeile.id ? (
            /* Inline edit form */
            <form onSubmit={handleEditSubmit} className="space-y-2" noValidate>
              {/* Chord quick-access toolbar (when showChords is active) */}
              {showChords && (
                <div className="flex flex-wrap items-center gap-1" role="toolbar" aria-label="Akkord-Schnellzugriff">
                  <button
                    type="button"
                    onClick={() =>
                      insertChordAtCursor(editTextInputRef, editText, setEditText, "[]", true)
                    }
                    className="inline-flex items-center gap-1 rounded border border-dashed border-neutral-400 px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
                    aria-label="Leeren Akkord einfügen"
                  >
                    <AppIcon icon="lucide:music" className="text-xs" />
                    Leerer Akkord
                  </button>
                  {recentChords.map((chord) => (
                    <button
                      key={chord}
                      type="button"
                      onClick={() =>
                        insertChordAtCursor(editTextInputRef, editText, setEditText, `[${chord}]`)
                      }
                      className="rounded border border-newsong-200 bg-newsong-50 px-2 py-1 text-xs font-medium text-newsong-700 hover:bg-newsong-100 transition-colors"
                      aria-label={`Akkord ${chord} einfügen`}
                    >
                      {chord}
                    </button>
                  ))}
                </div>
              )}
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
                    kategorien={tagKategorien}
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
            <>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                {(() => {
                  const parsed = parseChords(zeile.text);
                  const hasChords = showChords && parsed.chords.length > 0;
                  if (hasChords) {
                    return <ChordAnzeige text={zeile.text} tagDefinitions={tagDefinitions} />;
                  }
                  if (tagDefinitions.length > 0) {
                    return (
                      <p className={`text-sm ${zeile.istKommentar ? "text-amber-800 italic" : "text-neutral-900"}`}>
                        <ZeileMarkupView text={parsed.plainText} tagDefinitions={tagDefinitions} />
                      </p>
                    );
                  }
                  return (
                    <p className={`text-sm ${zeile.istKommentar ? "text-amber-800 italic" : "text-neutral-900"}`}>{stripChordPro(parsed.plainText)}</p>
                  );
                })()}
                {showTranslations && zeile.uebersetzung && (
                  <p className="text-xs text-neutral-500 italic">{zeile.uebersetzung}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggleKommentar(zeile)}
                  className={`rounded p-1 ${
                    zeile.istKommentar
                      ? "bg-amber-100 text-amber-700"
                      : "text-neutral-500 hover:bg-neutral-100"
                  }`}
                  aria-label={
                    zeile.istKommentar
                      ? "Kommentar-Markierung entfernen"
                      : "Zeile als Kommentar markieren"
                  }
                  aria-pressed={zeile.istKommentar}
                >
                  <AppIcon icon="lucide:message-square" className="text-sm" />
                </button>
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
                  <AppIcon icon="lucide:pencil" className="text-sm" />
                </button>
                <button
                  type="button"
                  onClick={(e) => startDelete(zeile.id, e.currentTarget)}
                  className="rounded p-1 text-error-600 hover:bg-error-50"
                  aria-label={`Zeile ${idx + 1} löschen`}
                >
                  <AppIcon icon="lucide:trash-2" className="text-sm" />
                </button>
              </div>
            </div>
            {/* Taktbereich input fields for comment zeilen */}
            {zeile.istKommentar && (
              <div className="mt-2 flex items-center gap-2">
                <label htmlFor={`takt-von-${zeile.id}`} className="text-xs text-neutral-500">
                  Takt von
                </label>
                <input
                  id={`takt-von-${zeile.id}`}
                  type="number"
                  min={1}
                  step={1}
                  value={getTaktbereichInput(zeile).startTakt}
                  onChange={(e) => setTaktbereichField(zeile.id, "startTakt", e.target.value)}
                  onBlur={() => handleTaktbereichSave(zeile)}
                  onKeyDown={(e) => handleTaktbereichKeyDown(e, zeile)}
                  className="w-16 rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-newsong-500"
                  aria-label="Start-Takt"
                />
                <label htmlFor={`takt-bis-${zeile.id}`} className="text-xs text-neutral-500">
                  bis
                </label>
                <input
                  id={`takt-bis-${zeile.id}`}
                  type="number"
                  min={1}
                  step={1}
                  value={getTaktbereichInput(zeile).endTakt}
                  onChange={(e) => setTaktbereichField(zeile.id, "endTakt", e.target.value)}
                  onBlur={() => handleTaktbereichSave(zeile)}
                  onKeyDown={(e) => handleTaktbereichKeyDown(e, zeile)}
                  className="w-16 rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-newsong-500"
                  aria-label="End-Takt"
                />
                {taktbereichError[zeile.id] && (
                  <span className="text-xs text-error-600" role="alert">
                    {taktbereichError[zeile.id]}
                  </span>
                )}
              </div>
            )}
            </>
          )}
        </div>
      ))}

      {/* Add zeile form / button */}
      {addFormOpen ? (
        <form onSubmit={handleAddSubmit} className="space-y-2 rounded border border-dashed border-neutral-300 bg-white p-3" noValidate>
          {/* Chord quick-access toolbar for add form (when showChords is active) */}
          {showChords && (
            <div className="flex flex-wrap items-center gap-1" role="toolbar" aria-label="Akkord-Schnellzugriff">
              <button
                type="button"
                onClick={() =>
                  insertChordAtCursor(addTextInputRef, addText, setAddText, "[]", true)
                }
                className="inline-flex items-center gap-1 rounded border border-dashed border-neutral-400 px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
                aria-label="Leeren Akkord einfügen"
              >
                <AppIcon icon="lucide:music" className="text-xs" />
                Leerer Akkord
              </button>
              {recentChords.map((chord) => (
                <button
                  key={chord}
                  type="button"
                  onClick={() =>
                    insertChordAtCursor(addTextInputRef, addText, setAddText, `[${chord}]`)
                  }
                  className="rounded border border-newsong-200 bg-newsong-50 px-2 py-1 text-xs font-medium text-newsong-700 hover:bg-newsong-100 transition-colors"
                  aria-label={`Akkord ${chord} einfügen`}
                >
                  {chord}
                </button>
              ))}
            </div>
          )}
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
                kategorien={tagKategorien}
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
