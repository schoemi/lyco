"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { SessionView } from "@/components/spaced-repetition/session-view";
import { dispatchStreakUpdate } from "@/lib/dispatch-streak-update";
import type { FaelligeStrophe } from "@/lib/services/spaced-repetition-service";

export default function SpacedRepetitionPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [strophen, setStrophen] = useState<FaelligeStrophe[]>([]);
  const [songTitel, setSongTitel] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    async function loadQueue() {
      try {
        const res = await fetch(`/api/spaced-repetition/queue?songId=${id}`);
        if (!res.ok) {
          if (res.status === 401) {
            router.replace("/login");
            return;
          }
          throw new Error("Fehler beim Laden der fälligen Strophen");
        }

        const data = await res.json();
        setStrophen(data.strophen);

        if (data.strophen.length > 0) {
          setSongTitel(data.strophen[0].songTitel);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Ein unbekannter Fehler ist aufgetreten"
        );
      } finally {
        setLoading(false);
      }
    }

    loadQueue();
  }, [id, router]);

  async function handleComplete() {
    try {
      await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId: id, lernmethode: "SPACED_REPETITION" }),
      });
      dispatchStreakUpdate();
    } catch {
      // Silent – session tracking is non-critical
    }

    router.push(`/songs/${id}`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-neutral-500">Fällige Strophen werden geladen…</div>
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

  if (strophen.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <p className="text-sm text-neutral-500">
          Keine fälligen Strophen für diesen Song
        </p>
        <button
          type="button"
          onClick={() => router.push(`/songs/${id}`)}
          className="rounded-lg bg-newsong-600 px-4 py-2 text-sm font-medium text-white hover:bg-newsong-700"
        >
          Zurück zum Song
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-6">
      <SessionView
        strophen={strophen}
        songTitel={songTitel}
        onComplete={handleComplete}
      />
    </div>
  );
}
