"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { EmotionalNavbar } from "@/components/emotional/emotional-navbar";
import { EmotionsTags } from "@/components/emotional/emotions-tags";
import { ModeTabs } from "@/components/emotional/mode-tabs";
import { TranslationTab } from "@/components/emotional/translation-tab";
import { InterpretationTab } from "@/components/emotional/interpretation-tab";
import { NotesTab } from "@/components/emotional/notes-tab";
import { ActionButtons } from "@/components/emotional/action-buttons";
import type { SongDetail } from "@/types/song";
import type { InterpretationResponse } from "@/types/interpretation";

export default function EmotionalPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [song, setSong] = useState<SongDetail | null>(null);
  const [interpretations, setInterpretations] = useState<InterpretationResponse[]>([]);
  const [activeTab, setActiveTab] = useState("Übersetzung");
  const [revealedLines, setRevealedLines] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleRevealLine = useCallback((stropheId: string, zeileId: string) => {
    setRevealedLines((prev) => {
      const current = prev[stropheId] ?? new Set<string>();
      if (current.has(zeileId)) return prev;
      const next = new Set(current);
      next.add(zeileId);
      return { ...prev, [stropheId]: next };
    });
  }, []);

  const handleRevealAll = useCallback((stropheId: string) => {
    if (!song) return;
    const strophe = song.strophen.find((s) => s.id === stropheId);
    if (!strophe) return;
    setRevealedLines((prev) => {
      const next = new Set(prev[stropheId] ?? new Set<string>());
      for (const zeile of strophe.zeilen) {
        next.add(zeile.id);
      }
      return { ...prev, [stropheId]: next };
    });
  }, [song]);

  const handleInterpretationSave = useCallback(async (stropheId: string, text: string) => {
    try {
      const res = await fetch("/api/interpretations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stropheId, text }),
      });
      if (res.ok) {
        const data = await res.json();
        setInterpretations((prev) => {
          const existing = prev.findIndex((i) => i.stropheId === stropheId);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = data.interpretation;
            return updated;
          }
          return [...prev, data.interpretation];
        });
      }
    } catch {
      // Silently fail – data stays in local state
    }
  }, []);

  const handleNoteSave = useCallback(async (stropheId: string, text: string) => {
    try {
      await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stropheId, text }),
      });
    } catch {
      // Silently fail – data stays in local state
    }
  }, []);

  const handleDeepen = useCallback(() => {
    setActiveTab("Interpretation");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!id) return;

    async function loadData() {
      try {
        // Fetch song data
        const songRes = await fetch(`/api/songs/${id}`);
        if (!songRes.ok) {
          if (songRes.status === 403 || songRes.status === 404) {
            router.replace("/dashboard");
            return;
          }
          throw new Error("Fehler beim Laden des Songs");
        }
        const songJson = await songRes.json();
        setSong(songJson.song);

        // Fetch interpretations
        const intRes = await fetch(`/api/interpretations?songId=${id}`);
        if (intRes.ok) {
          const intJson = await intRes.json();
          setInterpretations(intJson.interpretations ?? []);
        }

        // Track session with EMOTIONAL method
        await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ songId: id, lernmethode: "EMOTIONAL" }),
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Ein unbekannter Fehler ist aufgetreten"
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id, router]);

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
    <div className="space-y-4">
      <EmotionalNavbar songId={id} songTitle={song.titel} />

      {/* EmotionsTags */}
      <div className="px-4">
        <EmotionsTags tags={song.emotionsTags} />
      </div>

      {/* ModeTabs */}
      <div className="px-4">
        <ModeTabs activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Tab Content */}
      <div className="px-4">
        {activeTab === "Übersetzung" && (
          <TranslationTab
            strophen={song.strophen}
            revealedLines={revealedLines}
            onRevealLine={handleRevealLine}
            onRevealAll={handleRevealAll}
          />
        )}
        {activeTab === "Interpretation" && (
          <InterpretationTab
            strophen={song.strophen}
            interpretations={interpretations}
            revealedLines={revealedLines}
            onRevealLine={handleRevealLine}
            onRevealAll={handleRevealAll}
            onInterpretationSave={handleInterpretationSave}
          />
        )}
        {activeTab === "Meine Notizen" && (
          <NotesTab
            strophen={song.strophen}
            revealedLines={revealedLines}
            onRevealLine={handleRevealLine}
            onRevealAll={handleRevealAll}
            onNoteSave={handleNoteSave}
          />
        )}
      </div>

      {/* ActionButtons */}
      <div className="px-4">
        <ActionButtons songId={id} onDeepen={handleDeepen} />
      </div>
    </div>
  );
}
