"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { SongDetail } from "@/types/song";
import { PhraseTrainerView } from "@/components/phrase-trainer/phrase-trainer-view";

export default function PhraseTrainerPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [song, setSong] = useState<SongDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    async function loadData() {
      try {
        const res = await fetch(`/api/songs/${id}`);

        if (!res.ok) {
          if (res.status === 401) {
            router.replace("/login");
            return;
          }
          if (res.status === 403 || res.status === 404) {
            router.replace("/dashboard");
            return;
          }
          throw new Error("Fehler beim Laden des Songs");
        }

        const json = await res.json();
        setSong(json.song);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Ein unbekannter Fehler ist aufgetreten",
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id, router]);

  const onZurueck = useCallback(() => {
    router.push(`/songs/${id}`);
  }, [router, id]);

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

  return <PhraseTrainerView song={song} onZurueck={onZurueck} />;
}
