"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { SongDetail } from "@/types/song";
import type { DisplayMode } from "@/types/karaoke";
import { flattenLines } from "@/lib/karaoke/flatten-lines";
import {
  loadKaraokeSettings,
  saveDisplayMode,
  saveScrollSpeed,
} from "@/lib/karaoke/storage";
import { useAutoScroll } from "@/lib/karaoke/use-auto-scroll";
import { useKaraokeKeyboard } from "@/lib/karaoke/use-karaoke-keyboard";
import { useKaraokeWheel } from "@/lib/karaoke/use-karaoke-wheel";
import { useKaraokeSwipe } from "@/lib/karaoke/use-karaoke-swipe";
import { KaraokeView } from "@/components/karaoke/karaoke-view";
import { EinstellungsDialog } from "@/components/karaoke/einstellungs-dialog";

export default function KaraokePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [song, setSong] = useState<SongDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeLineIndex, setActiveLineIndex] = useState(0);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("strophe");
  const [scrollSpeed, setScrollSpeed] = useState(3);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Load persisted settings from localStorage on mount
  useEffect(() => {
    const settings = loadKaraokeSettings();
    setDisplayMode(settings.displayMode);
    setScrollSpeed(settings.scrollSpeed);
  }, []);

  // Data loading
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
            : "Ein unbekannter Fehler ist aufgetreten"
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id, router]);

  // Flatten lines from song
  const flatLines = useMemo(
    () => (song ? flattenLines(song) : []),
    [song]
  );

  const isLastLine = activeLineIndex >= flatLines.length - 1;

  // Auto-scroll: advance callback
  const onAutoAdvance = useCallback(() => {
    setActiveLineIndex((prev) =>
      prev < flatLines.length - 1 ? prev + 1 : prev
    );
  }, [flatLines.length]);

  const { isPlaying, toggle, pause } = useAutoScroll({
    speed: scrollSpeed,
    isLastLine,
    onAdvance: onAutoAdvance,
  });

  // Manual navigation stops auto-scroll (Req 9.5)
  const onNext = useCallback(() => {
    setActiveLineIndex((prev) => {
      if (prev >= flatLines.length - 1) return prev;
      return prev + 1;
    });
    pause();
  }, [flatLines.length, pause]);

  const onPrev = useCallback(() => {
    setActiveLineIndex((prev) => {
      if (prev <= 0) return prev;
      return prev - 1;
    });
    pause();
  }, [pause]);

  // Mode change: persist to localStorage
  const handleModeChange = useCallback((mode: DisplayMode) => {
    setDisplayMode(mode);
    saveDisplayMode(mode);
  }, []);

  // Speed change: persist to localStorage
  const handleSpeedChange = useCallback((speed: number) => {
    setScrollSpeed(speed);
    saveScrollSpeed(speed);
  }, []);

  // Back navigation
  const onBack = useCallback(() => {
    router.push(`/songs/${id}`);
  }, [router, id]);

  // Keyboard navigation
  useKaraokeKeyboard({
    onNext,
    onPrev,
    onToggleAutoScroll: toggle,
    onEscape: onBack,
  });

  // Scroll navigation (mouse wheel / touchpad)
  useKaraokeWheel({ onNext, onPrev });

  // Swipe navigation (mobile touch)
  useKaraokeSwipe({ onNext, onPrev });

  // --- Render states ---

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

  if (song.strophen.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-gray-500">Keine Texte vorhanden</div>
      </div>
    );
  }

  return (
    <>
      <KaraokeView
        song={song}
        flatLines={flatLines}
        activeLineIndex={activeLineIndex}
        displayMode={displayMode}
        isAutoScrolling={isPlaying}
        scrollSpeed={scrollSpeed}
        onNext={onNext}
        onPrev={onPrev}
        onToggleAutoScroll={toggle}
        onModeChange={handleModeChange}
        onOpenSettings={() => setSettingsOpen(true)}
        onBack={onBack}
      />
      <EinstellungsDialog
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        scrollSpeed={scrollSpeed}
        onSpeedChange={handleSpeedChange}
      />
    </>
  );
}
