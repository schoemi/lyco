"use client";

import { useState } from "react";
import { ProgressBar } from "@/components/songs/progress-bar";
import type { StropheDetail } from "../../types/song";

interface StropheCardProps {
  strophe: StropheDetail;
}

export function StropheCard({ strophe }: StropheCardProps) {
  const [noteText, setNoteText] = useState(strophe.notiz ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedText, setSavedText] = useState(strophe.notiz ?? "");

  const isDirty = noteText !== savedText;

  async function handleSaveNote() {
    if (!noteText.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stropheId: strophe.id, text: noteText }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Fehler beim Speichern");
      }
      setSavedText(noteText);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Fehler beim Speichern"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      {/* Header with name and progress */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold text-gray-900">{strophe.name}</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {Math.round(strophe.progress)}%
          </span>
          <ProgressBar value={strophe.progress} className="w-24" />
        </div>
      </div>

      {/* Lines */}
      <div className="space-y-1">
        {strophe.zeilen.map((zeile) => (
          <div key={zeile.id} className="text-sm">
            <p className="text-gray-800">{zeile.text}</p>
            {zeile.uebersetzung && (
              <p className="text-xs text-gray-400 italic">
                {zeile.uebersetzung}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Markups */}
      {strophe.markups.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {strophe.markups.map((markup) => (
            <span
              key={markup.id}
              className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
            >
              {markup.typ}
              {markup.wert ? `: ${markup.wert}` : ""}
            </span>
          ))}
        </div>
      )}

      {/* Note area */}
      <div className="space-y-2">
        <label
          htmlFor={`note-${strophe.id}`}
          className="block text-xs font-medium text-gray-600"
        >
          Notiz
        </label>
        <textarea
          id={`note-${strophe.id}`}
          aria-label={`Notiz für ${strophe.name}`}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          rows={2}
          placeholder="Notiz hinzufügen…"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
        />
        {saveError && (
          <p className="text-xs text-red-600" role="alert">
            {saveError}
          </p>
        )}
        <button
          type="button"
          aria-label={`Notiz speichern für ${strophe.name}`}
          disabled={saving || !isDirty || !noteText.trim()}
          onClick={handleSaveNote}
          className="min-h-[44px] min-w-[44px] rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Speichern…" : "Notiz speichern"}
        </button>
      </div>
    </div>
  );
}
