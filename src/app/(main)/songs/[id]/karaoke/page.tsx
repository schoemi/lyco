"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import type { AudioPlayButtonHandle } from "@/components/karaoke/audio-play-button";

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
  const [activeAudioQuelleId, setActiveAudioQuelleId] = useState<string | null>(null);
  const audioRef = useRef<AudioPlayButtonHandle>(null);

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
        // Default to first MP3 source
        const firstMp3 = (json.song as SongDetail).audioQuellen?.find(
          (q: { typ: string }) => q.typ === "MP3"
        );
        if (firstMp3) {
          setActiveAudioQuelleId(firstMp3.id);
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

  // Strophe navigation: jump to first line of next/prev strophe + seekTo timecode
  const onNextStrophe = useCallback(() => {
    const currentLine = flatLines[activeLineIndex];
    if (!currentLine) return;
    // Find first line of the next strophe
    const nextStropheIdx = flatLines.findIndex(
      (l, i) => i > activeLineIndex && l.stropheId !== currentLine.stropheId
    );
    if (nextStropheIdx < 0) return;
    setActiveLineIndex(nextStropheIdx);
    pause();
    // Seek audio to strophe timecode if available
    const targetStropheId = flatLines[nextStropheIdx].stropheId;
    const strophe = song?.strophen.find((s) => s.id === targetStropheId);
    const timecode = strophe?.markups.find(
      (m) => m.typ === "TIMECODE" && m.ziel === "STROPHE" && m.timecodeMs != null
    );
    if (timecode?.timecodeMs != null) {
      audioRef.current?.seekTo(timecode.timecodeMs);
    }
  }, [flatLines, activeLineIndex, pause, song]);

  const onPrevStrophe = useCallback(() => {
    const currentLine = flatLines[activeLineIndex];
    if (!currentLine) return;
    // Find the first line of the current strophe
    const currentStropheFirstIdx = flatLines.findIndex(
      (l) => l.stropheId === currentLine.stropheId
    );
    // If we're not at the first line of the current strophe, jump there
    if (activeLineIndex > currentStropheFirstIdx) {
      setActiveLineIndex(currentStropheFirstIdx);
      pause();
      const strophe = song?.strophen.find((s) => s.id === currentLine.stropheId);
      const timecode = strophe?.markups.find(
        (m) => m.typ === "TIMECODE" && m.ziel === "STROPHE" && m.timecodeMs != null
      );
      if (timecode?.timecodeMs != null) {
        audioRef.current?.seekTo(timecode.timecodeMs);
      }
      return;
    }
    // Otherwise jump to the first line of the previous strophe
    const prevLines = flatLines.filter(
      (l, i) => i < currentStropheFirstIdx
    );
    if (prevLines.length === 0) return;
    const prevStropheId = prevLines[prevLines.length - 1].stropheId;
    const prevStropheFirstIdx = flatLines.findIndex(
      (l) => l.stropheId === prevStropheId
    );
    setActiveLineIndex(prevStropheFirstIdx);
    pause();
    const strophe = song?.strophen.find((s) => s.id === prevStropheId);
    const timecode = strophe?.markups.find(
      (m) => m.typ === "TIMECODE" && m.ziel === "STROPHE" && m.timecodeMs != null
    );
    if (timecode?.timecodeMs != null) {
      audioRef.current?.seekTo(timecode.timecodeMs);
    }
  }, [flatLines, activeLineIndex, pause, song]);

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

  if (song.strophen.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-neutral-500">Keine Texte vorhanden</div>
      </div>
    );
  }

  return (
    <>
      <KaraokeView
        ref={audioRef}
        song={song}
        flatLines={flatLines}
        activeLineIndex={activeLineIndex}
        displayMode={displayMode}
        isAutoScrolling={isPlaying}
        scrollSpeed={scrollSpeed}
        activeAudioQuelleId={activeAudioQuelleId}
        onNext={onNext}
        onPrev={onPrev}
        onNextStrophe={onNextStrophe}
        onPrevStrophe={onPrevStrophe}
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
        audioQuellen={song.audioQuellen}
        activeAudioQuelleId={activeAudioQuelleId}
        onAudioQuelleChange={setActiveAudioQuelleId}
      />
    </>
  );
}
