"use client";

import { useState } from "react";
import { ProgressBar } from "@/components/songs/progress-bar";
import { formatTimecode } from "@/lib/audio/timecode";
import { stripChordPro } from "@/lib/vocal-tag/chordpro-parser";
import type { StropheDetail } from "../../types/song";

interface StropheCardProps {
  strophe: StropheDetail;
  onSeekTo?: (timecodeMs: number) => void;
}

export function StropheCard({ strophe, onSeekTo }: StropheCardProps) {
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

  const timecodeMarkup = strophe.markups.find(
    (m) => m.typ === "TIMECODE" && m.ziel === "STROPHE" && m.timecodeMs != null,
  );

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 space-y-3">
      {/* Header with name and progress */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-neutral-900">{strophe.name}</h3>
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
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">
            {Math.round(strophe.progress)}%
          </span>
          <ProgressBar value={strophe.progress} className="w-24" />
        </div>
      </div>

      {/* Lines */}
      <div className="space-y-1">
        {strophe.zeilen.map((zeile) => (
          <div key={zeile.id} className="text-sm">
            <p className="text-neutral-800">{stripChordPro(zeile.text)}</p>
            {zeile.uebersetzung && (
              <p className="text-xs text-neutral-400 italic">
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
              className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600"
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
          className="block text-xs font-medium text-neutral-600"
        >
          Notiz
        </label>
        <textarea
          id={`note-${strophe.id}`}
          aria-label={`Notiz für ${strophe.name}`}
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm text-neutral-800 placeholder-neutral-400 focus:border-newsong-500 focus:outline-none focus:ring-1 focus:ring-newsong-500"
          rows={2}
          placeholder="Notiz hinzufügen…"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
        />
        {saveError && (
          <p className="text-xs text-error-600" role="alert">
            {saveError}
          </p>
        )}
        <button
          type="button"
          aria-label={`Notiz speichern für ${strophe.name}`}
          disabled={saving || !isDirty || !noteText.trim()}
          onClick={handleSaveNote}
          className="min-h-[44px] min-w-[44px] rounded bg-newsong-600 px-4 py-2 text-sm font-medium text-white hover:bg-newsong-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Speichern…" : "Notiz speichern"}
        </button>
      </div>
    </div>
  );
}
