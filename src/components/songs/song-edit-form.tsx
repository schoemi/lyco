"use client";

import { useState } from "react";
import type { SongDetail } from "../../types/song";

interface SongEditFormProps {
  song: SongDetail;
  onSaved: (updated: SongDetail) => void;
  onCancel: () => void;
}

export default function SongEditForm({ song, onSaved, onCancel }: SongEditFormProps) {
  const [titel, setTitel] = useState(song.titel);
  const [kuenstler, setKuenstler] = useState(song.kuenstler ?? "");
  const [sprache, setSprache] = useState(song.sprache ?? "");
  const [emotionsTagsRaw, setEmotionsTagsRaw] = useState(song.emotionsTags.join(", "));
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function resetForm() {
    setTitel(song.titel);
    setKuenstler(song.kuenstler ?? "");
    setSprache(song.sprache ?? "");
    setEmotionsTagsRaw(song.emotionsTags.join(", "));
    setError(null);
    setValidationError(null);
  }

  function handleCancel() {
    resetForm();
    onCancel();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setValidationError(null);

    if (!titel.trim()) {
      setValidationError("Titel ist erforderlich");
      return;
    }

    setLoading(true);

    try {
      const emotionsTags = emotionsTagsRaw
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      const res = await fetch(`/api/songs/${song.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titel: titel.trim(),
          kuenstler: kuenstler.trim() || undefined,
          sprache: sprache.trim() || undefined,
          emotionsTags: emotionsTags.length > 0 ? emotionsTags : [],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Fehler beim Speichern");
        return;
      }

      onSaved(data.song);
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }

  const hasTitleError = validationError !== null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4" noValidate>
      <div>
        <label htmlFor="edit-song-titel" className="block text-sm font-medium text-neutral-700">
          Titel
        </label>
        <input
          id="edit-song-titel"
          type="text"
          value={titel}
          onChange={(e) => {
            setTitel(e.target.value);
            if (validationError) setValidationError(null);
          }}
          aria-required="true"
          aria-invalid={hasTitleError}
          aria-describedby={hasTitleError ? "edit-song-titel-error" : undefined}
          className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-newsong-500 ${
            hasTitleError ? "border-error-500" : "border-neutral-300"
          }`}
        />
        {hasTitleError && (
          <p id="edit-song-titel-error" className="mt-1 text-sm text-error-600" role="alert">
            {validationError}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="edit-song-kuenstler" className="block text-sm font-medium text-neutral-700">
          Künstler
        </label>
        <input
          id="edit-song-kuenstler"
          type="text"
          value={kuenstler}
          onChange={(e) => setKuenstler(e.target.value)}
          className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-newsong-500"
        />
      </div>
      <div>
        <label htmlFor="edit-song-sprache" className="block text-sm font-medium text-neutral-700">
          Sprache
        </label>
        <input
          id="edit-song-sprache"
          type="text"
          value={sprache}
          onChange={(e) => setSprache(e.target.value)}
          className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-newsong-500"
        />
      </div>
      <div>
        <label htmlFor="edit-song-emotions-tags" className="block text-sm font-medium text-neutral-700">
          Emotions-Tags (kommagetrennt)
        </label>
        <input
          id="edit-song-emotions-tags"
          type="text"
          value={emotionsTagsRaw}
          onChange={(e) => setEmotionsTagsRaw(e.target.value)}
          placeholder="z.B. fröhlich, melancholisch, energisch"
          className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-newsong-500"
        />
      </div>
      {error && (
        <p className="text-sm text-error-600" role="alert">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-newsong-600 px-4 py-2 text-sm font-medium text-white hover:bg-newsong-700 disabled:opacity-50"
        >
          {loading ? "Speichere..." : "Speichern"}
        </button>
      </div>
    </form>
  );
}
