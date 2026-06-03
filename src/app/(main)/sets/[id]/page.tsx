"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { SetDetail } from "@/types/song";
import SetSongList from "@/components/songs/set-song-list";
import AddSongToSetDialog from "@/components/songs/add-song-to-set-dialog";
import SetEditDialog from "@/components/songs/set-edit-dialog";
import SetDeleteDialog from "@/components/songs/set-delete-dialog";
import FreigabeDialog from "@/components/sharing/freigabe-dialog";
import FreigabeUebersicht from "@/components/sharing/freigabe-uebersicht";
import SetExportButton from "@/components/songs/set-export-button";
import { SetPlaylistProvider, useSetPlaylist } from "@/components/songs/set-playlist-provider";
import SetPlaylistBar from "@/components/songs/set-playlist-bar";
import SetPlaylistStartButton from "@/components/songs/set-playlist-start-button";

// ---------------------------------------------------------------------------
// Inner content component — uses SetPlaylistContext (must be inside provider)
// ---------------------------------------------------------------------------

interface SetDetailContentProps {
  set: SetDetail;
  setId: string;
  onRefresh: () => void;
}

function SetDetailContent({ set, setId, onRefresh }: SetDetailContentProps) {
  const router = useRouter();
  const {
    startPlaylist,
    activeSong,
    skipToSong,
    skippedSongCount,
    isPlaylistActive,
    playlistSongs,
    isLoading,
  } = useSetPlaylist();

  // Autoplay: start playlist automatically when ?autoplay=true is in the URL
  // autoplayTriggeredRef is an idempotency guard — ensures startPlaylist() is
  // called at most once, even in React StrictMode (double-invoke) or re-renders.
  // (Requirements 8.5, 8.8, 8.9)
  const searchParams = useSearchParams();
  const autoplay = searchParams.get("autoplay") === "true";
  const autoplayTriggeredRef = useRef(false);

  useEffect(() => {
    if (
      autoplay &&
      !isLoading &&
      playlistSongs.length > 0 &&
      !autoplayTriggeredRef.current
    ) {
      autoplayTriggeredRef.current = true;
      startPlaylist();
    }
  }, [autoplay, isLoading, playlistSongs.length, startPlaylist]);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addSongDialogOpen, setAddSongDialogOpen] = useState(false);
  const [freigabeDialogOpen, setFreigabeDialogOpen] = useState(false);

  // hasPlayableSongs: true if the set has at least one song.
  // The actual MP3 filtering happens server-side — we use songCount as a proxy
  // for the initial button state. The provider will handle the "no MP3" case.
  const hasPlayableSongs = set.songCount > 0;

  return (
    <>
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Back link */}
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700"
        >
          ← Zurück zum Dashboard
        </Link>

        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">{set.name}</h1>
            {set.description && (
              <p className="mt-1 text-sm text-neutral-600">{set.description}</p>
            )}
            <p className="mt-1 text-sm text-neutral-500">
              {set.songCount} {set.songCount === 1 ? "Song" : "Songs"}
            </p>
          </div>
          <div className="flex gap-2">
            <SetExportButton setId={setId} />
            <button
              type="button"
              onClick={() => setFreigabeDialogOpen(true)}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Teilen
            </button>
            <button
              type="button"
              onClick={() => setEditDialogOpen(true)}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Bearbeiten
            </button>
            <button
              type="button"
              onClick={() => setDeleteDialogOpen(true)}
              className="rounded-md border border-error-300 px-3 py-1.5 text-sm font-medium text-error-700 hover:bg-error-50"
            >
              Löschen
            </button>
          </div>
        </div>

        {/* Action bar: "Set abspielen" + "Song hinzufügen" */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <SetPlaylistStartButton
            hasPlayableSongs={hasPlayableSongs}
            onStart={startPlaylist}
          />
          <button
            type="button"
            onClick={() => setAddSongDialogOpen(true)}
            className="shrink-0 rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            + Song hinzufügen
          </button>
        </div>

        {/* Skipped songs hint — visible after playlist starts and skippedSongCount > 0 */}
        {isPlaylistActive && skippedSongCount > 0 && (
          <div
            role="alert"
            aria-live="polite"
            className="mb-4 rounded-md border border-warning-300 bg-warning-50 px-4 py-3 text-sm text-warning-800"
          >
            {skippedSongCount === 1
              ? "1 Song wurde übersprungen, da keine MP3-Audioquelle vorhanden ist."
              : `${skippedSongCount} Songs wurden übersprungen, da keine MP3-Audioquellen vorhanden sind.`}
          </div>
        )}

        {/* Song list — connected to playlist context for active highlighting */}
        <SetSongList
          songs={set.songs}
          setId={setId}
          onSongRemoved={onRefresh}
          onReordered={onRefresh}
          activeSongId={activeSong?.id ?? null}
          onSongClick={(_songId, index) => skipToSong(index)}
        />

        {/* Dialogs */}
        <SetEditDialog
          open={editDialogOpen}
          set={set ? { id: set.id, name: set.name, description: set.description } : null}
          onClose={() => setEditDialogOpen(false)}
          onSaved={() => {
            setEditDialogOpen(false);
            onRefresh();
          }}
        />

        <SetDeleteDialog
          open={deleteDialogOpen}
          set={set ? { id: set.id, name: set.name } : null}
          onClose={() => setDeleteDialogOpen(false)}
          onDeleted={() => {
            setDeleteDialogOpen(false);
            router.push("/");
          }}
        />

        <AddSongToSetDialog
          open={addSongDialogOpen}
          setId={setId}
          existingSongIds={set.songs.map((s) => s.id)}
          onClose={() => setAddSongDialogOpen(false)}
          onAdded={() => {
            setAddSongDialogOpen(false);
            onRefresh();
          }}
        />

        <FreigabeDialog
          open={freigabeDialogOpen}
          onClose={() => setFreigabeDialogOpen(false)}
          type="set"
          itemId={setId}
        />

        <FreigabeUebersicht type="set" itemId={setId} />
      </div>

      {/* Fixed bottom player — rendered outside the scrollable max-w-3xl container
          so that `fixed bottom-0 inset-x-0` positions it correctly (Req. 7.1, 7.2) */}
      <SetPlaylistBar />
    </>
  );
}

// ---------------------------------------------------------------------------
// Page — loads set data, wraps everything with SetPlaylistProvider
// ---------------------------------------------------------------------------

export default function SetDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [set, setSet] = useState<SetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSet = useCallback(async () => {
    try {
      const res = await fetch(`/api/sets/${id}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Set nicht gefunden");
        if (res.status === 403) throw new Error("Zugriff verweigert");
        throw new Error("Fehler beim Laden des Sets");
      }
      const json = await res.json();
      setSet(json.set);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ein unbekannter Fehler ist aufgetreten");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetchSet();
  }, [id, fetchSet]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-neutral-500">Set wird geladen…</div>
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

  if (!set) return null;

  return (
    <SetPlaylistProvider setId={id}>
      <SetDetailContent set={set} setId={id} onRefresh={fetchSet} />
    </SetPlaylistProvider>
  );
}
