"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ProgressBar } from "@/components/songs/progress-bar";
import SongEditForm from "@/components/songs/song-edit-form";
import SongDeleteDialog from "@/components/songs/song-delete-dialog";
import StropheEditor from "@/components/songs/strophe-editor";
import TranslateButton from "@/components/songs/translate-button";
import LanguageSelector from "@/components/songs/language-selector";
import TranslationToggle from "@/components/songs/translation-toggle";
import { useTranslation } from "@/hooks/use-translation";
import type { SongDetail, StropheDetail } from "../../../../types/song";
import type { SongAnalyseResult } from "@/types/song";

function hasAnyTranslation(strophen: StropheDetail[]): boolean {
  return strophen.some((s) =>
    s.zeilen.some((z) => z.uebersetzung != null && z.uebersetzung.trim() !== "")
  );
}

export default function SongDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [song, setSong] = useState<SongDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyseError, setAnalyseError] = useState<string | null>(null);

  const [showTranslations, setShowTranslations] = useState(true);

  const {
    translating,
    translateError,
    translateSuccess,
    zielsprache,
    setZielsprache,
    handleTranslate,
  } = useTranslation({ songId: id, setSong });

  const hasTranslations = useMemo(
    () => (song ? hasAnyTranslation(song.strophen) : false),
    [song?.strophen]
  );

  const handleAnalyze = useCallback(async () => {
    if (!id || analyzing) return;
    setAnalyzing(true);
    setAnalyseError(null);
    try {
      const res = await fetch(`/api/songs/${id}/analyze`, { method: "POST" });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? "Analyse fehlgeschlagen");
      }
      const result: SongAnalyseResult = await res.json();
      // Update song with analysis results
      setSong((prev) => {
        if (!prev) return prev;
        const updatedStrophen = prev.strophen.map((s) => {
          const sa = result.strophenAnalysen.find((a) => a.stropheId === s.id);
          return sa ? { ...s, analyse: sa.analyse } : s;
        });
        return {
          ...prev,
          analyse: result.songAnalyse,
          emotionsTags: result.emotionsTags,
          strophen: updatedStrophen,
        };
      });
    } catch (err) {
      setAnalyseError(
        err instanceof Error ? err.message : "Ein Fehler ist aufgetreten"
      );
    } finally {
      setAnalyzing(false);
    }
  }, [id, analyzing]);

  useEffect(() => {
    if (!id) return;

    async function fetchSong() {
      try {
        const res = await fetch(`/api/songs/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("Song nicht gefunden");
          }
          if (res.status === 403) {
            throw new Error("Zugriff verweigert");
          }
          throw new Error("Fehler beim Laden des Songs");
        }
        const json = await res.json();
        setSong(json.song);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Ein unbekannter Fehler ist aufgetreten"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchSong();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-gray-500">Song wird geladen…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!song) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex min-h-[44px] min-w-[44px] items-center text-sm font-medium text-blue-600 hover:text-blue-800"
        aria-label="Zurück zum Dashboard"
      >
        ← Dashboard
      </Link>

      {/* Song header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
            {song.titel}
          </h1>
          {!editing && (
            <div className="flex flex-wrap gap-2 shrink-0 items-center">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={analyzing}
                className="rounded-md border border-purple-300 px-3 py-1.5 text-sm font-medium text-purple-700 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {analyzing ? "Analysiert…" : "🔍 Analysieren"}
              </button>
              <LanguageSelector
                value={zielsprache}
                onChange={setZielsprache}
                disabled={translating}
              />
              <TranslateButton
                translating={translating}
                onClick={handleTranslate}
              />
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Bearbeiten
              </button>
              <button
                type="button"
                onClick={() => setDeleteDialogOpen(true)}
                className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                Löschen
              </button>
              {hasTranslations && (
                <TranslationToggle
                  checked={showTranslations}
                  onChange={setShowTranslations}
                />
              )}
            </div>
          )}
        </div>

        {editing ? (
          <SongEditForm
            song={song}
            onSaved={(updated) => {
              setSong({ ...song, ...updated });
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <>
            {/* Metadata */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
              {song.kuenstler && <span>Künstler: {song.kuenstler}</span>}
              {song.sprache && <span>Sprache: {song.sprache}</span>}
            </div>

            {/* Emotion tags */}
            {song.emotionsTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {song.emotionsTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Analyse error */}
            {analyseError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {analyseError}
              </div>
            )}

            {/* Translation error */}
            {translateError && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {translateError}
              </div>
            )}

            {/* Translation success */}
            {translateSuccess && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                Übersetzung erfolgreich abgeschlossen.
              </div>
            )}

            {/* Language warning: source === target */}
            {song.sprache && song.sprache === zielsprache && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
                Hinweis: Die Zielsprache entspricht der Originalsprache des Songs ({song.sprache}).
              </div>
            )}

            {/* Song analysis */}
            {song.analyse && (
              <div className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-3">
                <p className="text-xs font-medium text-purple-600 mb-1">Song-Analyse</p>
                <p className="text-sm text-gray-800 whitespace-pre-line">{song.analyse}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Song Delete Dialog */}
      <SongDeleteDialog
        open={deleteDialogOpen}
        song={song}
        onClose={() => setDeleteDialogOpen(false)}
        onDeleted={() => router.push("/dashboard")}
      />

      {/* Overall progress & sessions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs text-gray-500">Gesamtfortschritt</p>
          <div className="flex items-center gap-3">
            <p className="text-2xl font-semibold text-gray-900">
              {Math.round(song.progress)}%
            </p>
            <ProgressBar value={song.progress} className="flex-1" />
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs text-gray-500">Sessions</p>
          <p className="text-2xl font-semibold text-gray-900">
            {song.sessionCount}
          </p>
        </div>
      </div>

      {/* Learning modes */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">Lernmethoden</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Link
            href={`/songs/${id}/emotional`}
            className="flex min-h-[44px] items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            🎭 Emotionales Lernen
          </Link>
          <Link
            href={`/songs/${id}/cloze`}
            className="flex min-h-[44px] items-center justify-center rounded-lg bg-purple-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-purple-700"
          >
            ✏️ Lückentext
          </Link>
          <Link
            href={`/songs/${id}/coach`}
            className="flex min-h-[44px] items-center justify-center rounded-lg border border-green-300 bg-white px-4 py-3 text-sm font-medium text-green-700 transition-colors hover:bg-green-50"
          >
            🎤 Gesangstechnik-Coach
          </Link>
        </div>
      </div>

      {/* Strophes */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Strophen</h2>
        <StropheEditor
          songId={id}
          strophen={song.strophen}
          onStrophenChanged={(strophen) => setSong({ ...song, strophen })}
          editing={editing}
          showTranslations={showTranslations}
        />
      </div>
    </div>
  );
}
