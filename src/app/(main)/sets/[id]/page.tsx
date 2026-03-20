"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { SetDetail } from "@/types/song";
import SetSongList from "@/components/songs/set-song-list";
import AddSongToSetDialog from "@/components/songs/add-song-to-set-dialog";
import SetEditDialog from "@/components/songs/set-edit-dialog";
import SetDeleteDialog from "@/components/songs/set-delete-dialog";
import FreigabeDialog from "@/components/sharing/freigabe-dialog";
import FreigabeUebersicht from "@/components/sharing/freigabe-uebersicht";
import SetExportButton from "@/components/songs/set-export-button";

export default function SetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [set, setSet] = useState<SetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addSongDialogOpen, setAddSongDialogOpen] = useState(false);
  const [freigabeDialogOpen, setFreigabeDialogOpen] = useState(false);

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
          <SetExportButton setId={id} />
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

      {/* Add song button */}
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => setAddSongDialogOpen(true)}
          className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
        >
          + Song hinzufügen
        </button>
      </div>

      {/* Song list */}
      <SetSongList
        songs={set.songs}
        setId={id}
        onSongRemoved={fetchSet}
        onReordered={fetchSet}
      />

      {/* Dialogs */}
      <SetEditDialog
        open={editDialogOpen}
        set={set ? { id: set.id, name: set.name, description: set.description } : null}
        onClose={() => setEditDialogOpen(false)}
        onSaved={() => {
          setEditDialogOpen(false);
          fetchSet();
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
        setId={id}
        existingSongIds={set.songs.map((s) => s.id)}
        onClose={() => setAddSongDialogOpen(false)}
        onAdded={() => {
          setAddSongDialogOpen(false);
          fetchSet();
        }}
      />

      <FreigabeDialog
        open={freigabeDialogOpen}
        onClose={() => setFreigabeDialogOpen(false)}
        type="set"
        itemId={id}
      />

      <FreigabeUebersicht type="set" itemId={id} />
    </div>
  );
}
