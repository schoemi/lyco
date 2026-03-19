"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { SongDetail } from "@/types/song";
import type { AudioQuelleResponse } from "@/types/audio";
import type { ReferenzDaten } from "@/types/vocal-trainer";
import { VocalTrainerView } from "@/components/vocal-trainer/vocal-trainer-view";

export default function VocalTrainerPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [song, setSong] = useState<SongDetail | null>(null);
  const [instrumentalUrl, setInstrumentalUrl] = useState<string | null>(null);
  const [hatVokalQuelle, setHatVokalQuelle] = useState(false);
  const [referenzDaten, setReferenzDaten] = useState<ReferenzDaten | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    async function loadData() {
      try {
        // Fetch song data, audio sources, and reference data in parallel
        const [songRes, audioRes, refRes] = await Promise.all([
          fetch(`/api/songs/${id}`),
          fetch(`/api/songs/${id}/audio-quellen`),
          fetch(`/api/songs/${id}/referenz-daten`),
        ]);

        // Handle auth/access errors from song endpoint
        if (!songRes.ok) {
          if (songRes.status === 401) {
            router.replace("/login");
            return;
          }
          if (songRes.status === 403 || songRes.status === 404) {
            router.replace("/dashboard");
            return;
          }
          throw new Error("Fehler beim Laden des Songs");
        }

        const songJson = await songRes.json();
        setSong(songJson.song);

        // Process audio sources — find INSTRUMENTAL and REFERENZ_VOKAL
        if (audioRes.ok) {
          const audioJson = await audioRes.json();
          const quellen: AudioQuelleResponse[] = audioJson.audioQuellen ?? [];
          const instrumental = quellen.find((q) => q.rolle === "INSTRUMENTAL");
          if (instrumental) {
            setInstrumentalUrl(instrumental.url);
          }
          const vokal = quellen.find((q) => q.rolle === "REFERENZ_VOKAL");
          setHatVokalQuelle(!!vokal);
        }

        // Process reference data
        if (refRes.ok) {
          const refJson: ReferenzDaten = await refRes.json();
          setReferenzDaten(refJson);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Ein unbekannter Fehler ist aufgetreten"
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

  if (!instrumentalUrl) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-6 py-4 text-sm text-yellow-700">
            Kein Instrumental zugewiesen. Bitte weise einer Audio-Quelle die Rolle
            &quot;Instrumental&quot; zu.
          </div>
          <button
            onClick={onZurueck}
            aria-label="Zurück zur Song-Detailseite"
            className="rounded-lg bg-neutral-100 px-4 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-200"
          >
            Zurück zum Song
          </button>
        </div>
      </div>
    );
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch(`/api/songs/${id}/referenz-daten`, {
        method: "POST",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? "Generierung fehlgeschlagen");
      }
      // Reload referenz-daten
      const refRes = await fetch(`/api/songs/${id}/referenz-daten`);
      if (refRes.ok) {
        const refJson: ReferenzDaten = await refRes.json();
        setReferenzDaten(refJson);
      }
    } catch (err) {
      setGenerateError(
        err instanceof Error ? err.message : "Ein Fehler ist aufgetreten"
      );
    } finally {
      setGenerating(false);
    }
  }

  if (!referenzDaten) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-6 py-4 text-sm text-yellow-700">
            {hatVokalQuelle
              ? "Referenz-Daten müssen erst generiert werden. Klicke auf den Button, um die Vocal-Spur zu analysieren."
              : "Keine Audio-Quelle mit Rolle 'Referenz-Vokal' gefunden. Bitte weise einer Audio-Quelle die Rolle 'Referenz-Vokal' zu."}
          </div>
          {generateError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
              {generateError}
            </div>
          )}
          <div className="flex gap-3">
            {hatVokalQuelle && (
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? "Analyse läuft…" : "Referenz-Daten generieren"}
              </button>
            )}
            <button
              onClick={onZurueck}
              aria-label="Zurück zur Song-Detailseite"
              className="rounded-lg bg-neutral-100 px-4 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-200"
            >
              Zurück zum Song
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <VocalTrainerView
      song={song}
      instrumentalUrl={instrumentalUrl}
      referenzDaten={referenzDaten}
      onZurueck={onZurueck}
    />
  );
}
