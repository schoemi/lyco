"use client";

import { useState } from "react";
import type { AudioQuelleResponse } from "@/types/audio";
import { RollenAuswahl } from "@/components/vocal-trainer/rollen-auswahl";

interface AudioQuellenManagerProps {
  songId: string;
  audioQuellen: AudioQuelleResponse[];
  onQuellenChanged: () => void;
}

type AudioTypValue = "MP3" | "SPOTIFY" | "YOUTUBE" | "APPLE_MUSIC";

interface EditState {
  id: string;
  url: string;
  typ: AudioTypValue;
  label: string;
}

const AUDIO_TYP_OPTIONS: { value: AudioTypValue; label: string }[] = [
  { value: "MP3", label: "MP3" },
  { value: "SPOTIFY", label: "Spotify" },
  { value: "YOUTUBE", label: "YouTube" },
  { value: "APPLE_MUSIC", label: "Apple Music" },
];

export default function AudioQuellenManager({
  songId,
  audioQuellen,
  onQuellenChanged,
}: AudioQuellenManagerProps) {
  // Add form state
  const [newUrl, setNewUrl] = useState("");
  const [newTyp, setNewTyp] = useState<AudioTypValue>("MP3");
  const [newLabel, setNewLabel] = useState("");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [useFileUpload, setUseFileUpload] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);

  // Edit state
  const [editing, setEditing] = useState<EditState | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  // Delete state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);

    if (!newLabel.trim()) {
      setAddError("Label ist erforderlich");
      return;
    }

    if (useFileUpload) {
      if (!newFile) {
        setAddError("Bitte eine Datei auswählen");
        return;
      }

      setAddLoading(true);
      try {
        const formData = new FormData();
        formData.append("file", newFile);
        formData.append("label", newLabel.trim());

        const res = await fetch(`/api/songs/${songId}/audio-quellen/upload`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          setAddError(data.error || "Fehler beim Hochladen");
          return;
        }

        setNewFile(null);
        setNewLabel("");
        setUseFileUpload(false);
        onQuellenChanged();
      } catch {
        setAddError("Netzwerkfehler");
      } finally {
        setAddLoading(false);
      }
    } else {
      if (!newUrl.trim()) {
        setAddError("URL ist erforderlich");
        return;
      }

      setAddLoading(true);
      try {
        const res = await fetch(`/api/songs/${songId}/audio-quellen`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: newUrl.trim(),
            typ: newTyp,
            label: newLabel.trim(),
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setAddError(data.error || "Fehler beim Hinzufügen");
          return;
        }

        setNewUrl("");
        setNewTyp("MP3");
        setNewLabel("");
        onQuellenChanged();
      } catch {
        setAddError("Netzwerkfehler");
      } finally {
        setAddLoading(false);
      }
    }
  }

  function startEdit(quelle: AudioQuelleResponse) {
    setEditing({
      id: quelle.id,
      url: quelle.url,
      typ: quelle.typ as AudioTypValue,
      label: quelle.label,
    });
    setEditError(null);
  }

  function cancelEdit() {
    setEditing(null);
    setEditError(null);
  }

  async function handleEditSave() {
    if (!editing) return;
    setEditError(null);

    if (!editing.url.trim()) {
      setEditError("URL ist erforderlich");
      return;
    }
    if (!editing.label.trim()) {
      setEditError("Label ist erforderlich");
      return;
    }

    setEditLoading(true);
    try {
      const res = await fetch(
        `/api/songs/${songId}/audio-quellen/${editing.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: editing.url.trim(),
            typ: editing.typ,
            label: editing.label.trim(),
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        setEditError(data.error || "Fehler beim Speichern");
        return;
      }

      setEditing(null);
      onQuellenChanged();
    } catch {
      setEditError("Netzwerkfehler");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete(quelleId: string) {
    setDeleteError(null);
    setDeleteLoading(true);
    try {
      const res = await fetch(
        `/api/songs/${songId}/audio-quellen/${quelleId}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const data = await res.json();
        setDeleteError(data.error || "Fehler beim Löschen");
        return;
      }

      setDeleteConfirmId(null);
      onQuellenChanged();
    } catch {
      setDeleteError("Netzwerkfehler");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-neutral-700">Audio-Quellen</h3>

      {/* Add form */}
      <form
        onSubmit={handleAdd}
        className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4"
        noValidate
      >
        {/* Toggle: URL vs File Upload */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setUseFileUpload(false); setAddError(null); }}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              !useFileUpload
                ? "bg-newsong-600 text-white"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            URL eingeben
          </button>
          <button
            type="button"
            onClick={() => { setUseFileUpload(true); setAddError(null); }}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              useFileUpload
                ? "bg-newsong-600 text-white"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            Datei hochladen
          </button>
        </div>

        {useFileUpload ? (
          <div>
            <label
              htmlFor="audio-quelle-file"
              className="block text-sm font-medium text-neutral-700"
            >
              Audio-Datei (MP3, MP4, M4A)
            </label>
            <input
              id="audio-quelle-file"
              type="file"
              accept=".mp3,.mp4,.m4a,audio/mpeg,audio/mp4"
              onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-sm text-neutral-600 file:mr-3 file:rounded-md file:border-0 file:bg-newsong-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-newsong-700 hover:file:bg-newsong-100"
            />
            {newFile && (
              <p className="mt-1 text-xs text-neutral-500">
                {newFile.name} ({(newFile.size / (1024 * 1024)).toFixed(1)} MB)
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="audio-quelle-url"
                className="block text-sm font-medium text-neutral-700"
              >
                URL
              </label>
              <input
                id="audio-quelle-url"
                type="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-newsong-500"
              />
            </div>
            <div>
              <label
                htmlFor="audio-quelle-typ"
                className="block text-sm font-medium text-neutral-700"
              >
                Typ
              </label>
              <select
                id="audio-quelle-typ"
                value={newTyp}
                onChange={(e) => setNewTyp(e.target.value as AudioTypValue)}
                className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-newsong-500"
              >
                {AUDIO_TYP_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Label – always visible */}
        <div>
          <label
            htmlFor="audio-quelle-label"
            className="block text-sm font-medium text-neutral-700"
          >
            Label
          </label>
          <input
            id="audio-quelle-label"
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="z.B. Original, Instrumental"
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-newsong-500"
          />
        </div>
        {addError && (
          <p className="text-sm text-error-600" role="alert">
            {addError}
          </p>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={addLoading}
            className="rounded-md bg-newsong-600 px-4 py-2 text-sm font-medium text-white hover:bg-newsong-700 disabled:opacity-50"
          >
            {addLoading
              ? useFileUpload ? "Hochladen..." : "Hinzufügen..."
              : useFileUpload ? "Hochladen" : "Hinzufügen"}
          </button>
        </div>
      </form>

      {/* Existing sources list */}
      {audioQuellen.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Noch keine Audio-Quellen vorhanden.
        </p>
      ) : (
        <ul className="space-y-2">
          {audioQuellen.map((quelle) => (
            <li
              key={quelle.id}
              className="rounded-lg border border-neutral-200 bg-white p-3"
            >
              {editing?.id === quelle.id ? (
                /* Inline edit mode */
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label
                        htmlFor={`edit-url-${quelle.id}`}
                        className="block text-sm font-medium text-neutral-700"
                      >
                        URL
                      </label>
                      <input
                        id={`edit-url-${quelle.id}`}
                        type="url"
                        value={editing.url}
                        onChange={(e) =>
                          setEditing({ ...editing, url: e.target.value })
                        }
                        className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-newsong-500"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`edit-typ-${quelle.id}`}
                        className="block text-sm font-medium text-neutral-700"
                      >
                        Typ
                      </label>
                      <select
                        id={`edit-typ-${quelle.id}`}
                        value={editing.typ}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            typ: e.target.value as AudioTypValue,
                          })
                        }
                        className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-newsong-500"
                      >
                        {AUDIO_TYP_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor={`edit-label-${quelle.id}`}
                        className="block text-sm font-medium text-neutral-700"
                      >
                        Label
                      </label>
                      <input
                        id={`edit-label-${quelle.id}`}
                        type="text"
                        value={editing.label}
                        onChange={(e) =>
                          setEditing({ ...editing, label: e.target.value })
                        }
                        className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-newsong-500"
                      />
                    </div>
                  </div>
                  {editError && (
                    <p className="text-sm text-error-600" role="alert">
                      {editError}
                    </p>
                  )}
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="button"
                      onClick={handleEditSave}
                      disabled={editLoading}
                      className="rounded-md bg-newsong-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-newsong-700 disabled:opacity-50"
                    >
                      {editLoading ? "Speichere..." : "Speichern"}
                    </button>
                  </div>
                </div>
              ) : (
                /* Display mode */
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                        {quelle.typ}
                      </span>
                      <span className="truncate text-sm font-medium text-neutral-900">
                        {quelle.label}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-neutral-500">
                      {quelle.url}
                    </p>
                  </div>
                  <RollenAuswahl
                    songId={songId}
                    quelleId={quelle.id}
                    aktuelleRolle={quelle.rolle}
                    onRolleGeaendert={() => onQuellenChanged()}
                  />
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(quelle)}
                      aria-label={`${quelle.label} bearbeiten`}
                      className="rounded-md px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
                    >
                      Bearbeiten
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(quelle.id)}
                      aria-label={`${quelle.label} löschen`}
                      className="rounded-md px-2 py-1 text-xs font-medium text-error-600 hover:bg-error-50"
                    >
                      Löschen
                    </button>
                  </div>
                </div>
              )}

              {/* Delete confirmation */}
              {deleteConfirmId === quelle.id && (
                <div className="mt-3 rounded-md border border-error-200 bg-error-50 p-3">
                  <p className="mb-2 text-sm text-error-700">
                    Audio-Quelle &quot;{quelle.label}&quot; wirklich löschen?
                  </p>
                  {deleteError && (
                    <p className="mb-2 text-sm text-error-600" role="alert">
                      {deleteError}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteConfirmId(null);
                        setDeleteError(null);
                      }}
                      className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(quelle.id)}
                      disabled={deleteLoading}
                      className="rounded-md bg-error-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-error-700 disabled:opacity-50"
                    >
                      {deleteLoading ? "Lösche..." : "Löschen"}
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
