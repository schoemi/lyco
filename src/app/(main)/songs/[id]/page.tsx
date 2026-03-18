"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ProgressBar } from "@/components/songs/progress-bar";
import SongEditForm from "@/components/songs/song-edit-form";
import SongDeleteDialog from "@/components/songs/song-delete-dialog";
import StropheEditor from "@/components/songs/strophe-editor";
import SongActionMenu from "@/components/songs/song-action-menu";
import SongTextEditor from "@/components/songs/song-text-editor";
import AudioPlayer from "@/components/songs/audio-player";
import type { AudioPlayerHandle } from "@/components/songs/audio-player";
import StickyPlayerBar from "@/components/songs/sticky-player-bar";
import { SharedAudioProvider } from "@/components/songs/shared-audio-provider";
import AudioQuellenManager from "@/components/songs/audio-quellen-manager";
import { usePlayerVisibility } from "@/hooks/use-player-visibility";
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
  const [editingText, setEditingText] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyseError, setAnalyseError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  const [showTranslations, setShowTranslations] = useState(true);

  const playerRef = useRef<AudioPlayerHandle>(null);
  const { ref: playerContainerRef, isVisible: isPlayerVisible } = usePlayerVisibility<HTMLDivElement>();

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

  const handleEnrollAndStart = useCallback(async () => {
    if (!id || enrolling) return;
    setEnrolling(true);
    try {
      const res = await fetch("/api/spaced-repetition/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId: id }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? "Einschreibung fehlgeschlagen");
      }
      router.push(`/songs/${id}/spaced-repetition`);
    } catch (err) {
      setAnalyseError(
        err instanceof Error ? err.message : "Ein Fehler ist aufgetreten"
      );
      setEnrolling(false);
    }
  }, [id, enrolling, router]);

  const refreshSong = useCallback(async () => {
    try {
      const res = await fetch(`/api/songs/${id}`);
      if (res.ok) {
        const json = await res.json();
        setSong(json.song);
      }
    } catch {
      // silently ignore refresh errors
    }
  }, [id]);

  const handleSeekTo = useCallback((timecodeMs: number) => {
    playerRef.current?.seekTo(timecodeMs);
  }, []);

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
        <div className="text-sm text-neutral-500">Song wird geladen…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="rounded-lg border border-error-200 bg-error-50 px-6 py-4 text-sm text-error-700">
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
        className="inline-flex min-h-[44px] min-w-[44px] items-center text-sm font-medium text-newsong-600 hover:text-newsong-800"
        aria-label="Zurück zum Dashboard"
      >
        ← Dashboard
      </Link>

      {/* Song header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold text-neutral-900 sm:text-2xl">
            {song.titel}
          </h1>
          {!editing && !editingText && (
            <SongActionMenu
              analyzing={analyzing}
              translating={translating}
              zielsprache={zielsprache}
              hasTranslations={hasTranslations}
              showTranslations={showTranslations}
              onAnalyze={handleAnalyze}
              onTranslate={handleTranslate}
              onEdit={() => setEditing(true)}
              onEditText={() => setEditingText(true)}
              onDelete={() => setDeleteDialogOpen(true)}
              onZielspracheChange={setZielsprache}
              onShowTranslationsChange={setShowTranslations}
            />
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
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-600">
              {song.kuenstler && <span>Künstler: {song.kuenstler}</span>}
              {song.sprache && <span>Sprache: {song.sprache}</span>}
            </div>

            {/* Emotion tags */}
            {song.emotionsTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {song.emotionsTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-newsong-50 px-3 py-1 text-xs font-medium text-newsong-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Analyse error */}
            {analyseError && (
              <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">
                {analyseError}
              </div>
            )}

            {/* Translation error */}
            {translateError && (
              <div
                role="alert"
                className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700"
              >
                {translateError}
              </div>
            )}

            {/* Translation success */}
            {translateSuccess && (
              <div className="rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700">
                Übersetzung erfolgreich abgeschlossen.
              </div>
            )}

            {/* Language warning: source === target */}
            {song.sprache && song.sprache === zielsprache && (
              <div className="rounded-lg border border-info-200 bg-info-50 px-4 py-3 text-sm text-info-700">
                Hinweis: Die Zielsprache entspricht der Originalsprache des Songs ({song.sprache}).
              </div>
            )}

            {/* Song analysis */}
            {song.analyse && (
              <div className="rounded-lg border border-primary-200 bg-primary-50 px-4 py-3">
                <p className="text-xs font-medium text-primary-600 mb-1">Song-Analyse</p>
                <p className="text-sm text-neutral-800 whitespace-pre-line">{song.analyse}</p>
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
        <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3">
          <p className="text-xs text-neutral-500">Gesamtfortschritt</p>
          <div className="flex items-center gap-3">
            <p className="text-2xl font-semibold text-neutral-900">
              {Math.round(song.progress)}%
            </p>
            <ProgressBar value={song.progress} className="flex-1" />
          </div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3">
          <p className="text-xs text-neutral-500">Sessions</p>
          <p className="text-2xl font-semibold text-neutral-900">
            {song.sessionCount}
          </p>
        </div>
      </div>

      {/* Audio Player */}
      {song.audioQuellen.length > 0 && (
        <SharedAudioProvider audioQuellen={song.audioQuellen}>
          <div ref={playerContainerRef}>
            <AudioPlayer
              ref={playerRef}
              audioQuellen={song.audioQuellen}
            />
          </div>

          {/* Sticky bottom player when scrolled past */}
          <StickyPlayerBar visible={!isPlayerVisible} />
        </SharedAudioProvider>
      )}

      {/* Learning modes */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-neutral-900">Lernmethoden</h2>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-neutral-600">Lernen &amp; Verstehen</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Link
              href={`/songs/${id}/karaoke`}
              className="flex min-h-[44px] items-center justify-center rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
            >
              🎤 Lesemodus
            </Link>
            <Link
              href={`/songs/${id}/emotional`}
              className="flex min-h-[44px] items-center justify-center rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
            >
              🎭 Inhalt &amp; Bedeutung
            </Link>
            <Link
              href={`/songs/${id}/coach`}
              className="flex min-h-[44px] items-center justify-center rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
            >
              🎤 Gesangstechnik-Coach
            </Link>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-neutral-600">Wiederholen &amp; Testen</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={handleEnrollAndStart}
              disabled={enrolling}
              className="flex min-h-[44px] items-center justify-center rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50"
            >
              {enrolling ? "Wird vorbereitet…" : "🧠 Spaced Repetition"}
            </button>
            <Link
              href={`/songs/${id}/quiz`}
              className="flex min-h-[44px] items-center justify-center rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
            >
              🧩 Quiz
            </Link>
            <Link
              href={`/songs/${id}/cloze`}
              className="flex min-h-[44px] items-center justify-center rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
            >
              ✏️ Lückentext
            </Link>
            <Link
              href={`/songs/${id}/zeile-fuer-zeile`}
              className="flex min-h-[44px] items-center justify-center rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
            >
              📝 Zeile für Zeile
            </Link>
            <Link
              href={`/songs/${id}/rueckwaerts`}
              className="flex min-h-[44px] items-center justify-center rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
            >
              🔄 Rückwärts lernen
            </Link>
          </div>
        </div>
      </div>

      {/* Strophes */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-neutral-900">Strophen</h2>
        {editingText ? (
          <SongTextEditor
            song={song}
            onSaved={(updatedSong, resetProgress) => {
              setSong(updatedSong);
              setEditingText(false);
            }}
            onCancel={() => setEditingText(false)}
          />
        ) : (
          <StropheEditor
            songId={id}
            strophen={song.strophen}
            onStrophenChanged={(strophen) => setSong({ ...song, strophen })}
            editing={editing}
            showTranslations={showTranslations}
            onSeekTo={handleSeekTo}
          />
        )}
      </div>

      {/* Audio-Quellen-Manager */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-neutral-900">Audio-Quellen</h2>
        <AudioQuellenManager
          songId={id}
          audioQuellen={song.audioQuellen}
          onQuellenChanged={refreshSong}
        />
      </div>
    </div>
  );
}
