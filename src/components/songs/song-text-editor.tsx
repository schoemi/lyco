"use client";

import { useState } from "react";
import type { SongDetail } from "@/types/song";
import { songToRawText } from "@/lib/import/song-to-raw-text";

interface SongTextEditorProps {
  song: SongDetail;
  onSaved: (updatedSong: SongDetail, resetProgress: boolean) => void;
  onCancel: () => void;
}

export default function SongTextEditor({
  song,
  onSaved,
  onCancel,
}: SongTextEditorProps) {
  const [text, setText] = useState(() => songToRawText(song));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasProgress = song.progress > 0;
  const hasTranslations = song.strophen.some((s) =>
    s.zeilen.some((z) => z.uebersetzung && z.uebersetzung.trim() !== "")
  );

  async function handleSave() {
    if (!text.trim()) {
      setError("Der Text darf nicht leer sein.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/songs/${song.id}/rewrite`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? "Speichern fehlgeschlagen");
      }

      const result = await res.json();
      onSaved(result.song, result.resetProgress);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ein Fehler ist aufgetreten"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Warning banner */}
      <div
        role="alert"
        className="rounded-lg border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-800"
      >
        <p className="font-medium">Hinweis zum Volltext-Editor</p>
        <ul className="mt-1 list-inside list-disc space-y-0.5 text-warning-700">
          {hasProgress && (
            <li>
              Es gibt bereits Lernfortschritt ({Math.round(song.progress)}%).
              Bei größeren Änderungen an der Struktur wird der Fortschritt
              zurückgesetzt.
            </li>
          )}
          {hasTranslations && (
            <li>
              Übersetzungen bleiben nur für unveränderte Zeilen erhalten.
              Geänderte oder neue Zeilen verlieren ihre Übersetzung.
            </li>
          )}
          <li>
            Strophen werden durch <code>[Name]</code>-Marker oder Leerzeilen
            getrennt. Der bestehende Noise-Filter wird automatisch angewendet.
          </li>
        </ul>
      </div>

      {/* Textarea */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={20}
        className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 font-mono text-sm text-neutral-900 placeholder-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        placeholder="Songtext hier einfügen oder bearbeiten…"
        aria-label="Songtext bearbeiten"
      />

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700"
        >
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {saving ? "Wird gespeichert…" : "Speichern"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}
