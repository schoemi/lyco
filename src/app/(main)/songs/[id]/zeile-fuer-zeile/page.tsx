"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ZeileFuerZeileNavbar } from "@/components/zeile-fuer-zeile/navbar";
import { FortschrittsDots } from "@/components/zeile-fuer-zeile/fortschritts-dots";
import { StrophenNavigator } from "@/components/zeile-fuer-zeile/strophen-navigator";
import { KumulativeAnsicht } from "@/components/zeile-fuer-zeile/kumulative-ansicht";
import { AktiveZeile } from "@/components/zeile-fuer-zeile/aktive-zeile";
import { EingabeBereich } from "@/components/zeile-fuer-zeile/eingabe-bereich";
import { AppIcon } from "@/components/ui/iconify-icon";import { StrophenAuswahlDialog } from "@/components/cloze/strophen-auswahl-dialog";
import { validateLine } from "@/lib/zeile-fuer-zeile/validate-line";
import { calculateStropheProgress } from "@/lib/zeile-fuer-zeile/progress";
import { SchwierigkeitsAuswahl } from "@/components/zeile-fuer-zeile/schwierigkeits-auswahl";
import { dispatchStreakUpdate } from "@/lib/dispatch-streak-update";
import { HinweisAnzeige } from "@/components/zeile-fuer-zeile/hinweis-anzeige";
import {
  type Schwierigkeitsstufe,
  DEFAULT_SCHWIERIGKEITSSTUFE,
  SCHWIERIGKEITS_STUFEN,
  berechneHinweis,
} from "@/lib/zeile-fuer-zeile/hint";
import type { SongDetail } from "@/types/song";

interface StropheLernzustand {
  currentZeileIndex: number;
  completedZeilen: Set<string>;
  fehlversuche: number;
}

export default function ZeileFuerZeilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [song, setSong] = useState<SongDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStrophenIds, setActiveStrophenIds] = useState<Set<string> | null>(null);
  const [currentStropheIndex, setCurrentStropheIndex] = useState(0);
  const [currentZeileIndex, setCurrentZeileIndex] = useState(0);
  const [completedZeilen, setCompletedZeilen] = useState<Set<string>>(new Set());
  const [eingabe, setEingabe] = useState("");
  const [fehlversuche, setFehlversuche] = useState(0);
  const [zeilenStatus, setZeilenStatus] = useState<"eingabe" | "korrekt" | "loesung">("eingabe");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [stropheAbgeschlossen, setStropheAbgeschlossen] = useState(false);
  const [schwierigkeitsstufe, setSchwierigkeitsstufe] =
    useState<Schwierigkeitsstufe>(DEFAULT_SCHWIERIGKEITSSTUFE);

  // Per-strophe learning state
  const [strophenLernzustand, setStrophenLernzustand] = useState<
    Map<string, StropheLernzustand>
  >(new Map());

  // Track whether all-complete session has been fired
  const allCompleteFired = useRef(false);

  // Load schwierigkeitsstufe from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("schwierigkeit-zeile-fuer-zeile");
      if (
        stored &&
        SCHWIERIGKEITS_STUFEN.includes(stored as Schwierigkeitsstufe)
      ) {
        setSchwierigkeitsstufe(stored as Schwierigkeitsstufe);
      }
    } catch {
      // localStorage may be unavailable (e.g. SSR, private browsing)
    }
  }, []);

  // Save schwierigkeitsstufe to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem("schwierigkeit-zeile-fuer-zeile", schwierigkeitsstufe);
    } catch {
      // Silent – localStorage may be unavailable
    }
  }, [schwierigkeitsstufe]);

  // --- Data loading ---
  useEffect(() => {
    if (!id) return;

    async function loadData() {
      try {
        const songRes = await fetch(`/api/songs/${id}`);
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
        const loadedSong: SongDetail = songJson.song;
        setSong(loadedSong);

        // Initialize activeStrophenIds to all strophe IDs
        const allStrophenIds = new Set(loadedSong.strophen.map((s) => s.id));
        setActiveStrophenIds(allStrophenIds);

        // Track session
        try {
          await fetch("/api/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ songId: id, lernmethode: "ZEILE_FUER_ZEILE" }),
          });
          dispatchStreakUpdate();
        } catch {
          // Silent – session tracking is non-critical
        }
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

  // --- Derived values ---
  const filteredStrophen = song
    ? [...song.strophen]
        .filter((s) => !activeStrophenIds || activeStrophenIds.has(s.id))
        .sort((a, b) => a.orderIndex - b.orderIndex)
    : [];

  const currentStrophe = filteredStrophen[currentStropheIndex] ?? null;

  const sortedZeilen = currentStrophe
    ? [...currentStrophe.zeilen].sort((a, b) => a.orderIndex - b.orderIndex)
    : [];

  const currentZeile = sortedZeilen[currentZeileIndex] ?? null;
  const istLetzteZeile = currentZeileIndex === sortedZeilen.length - 1;

  // Kumulative zeilen: all zeilen before the current index
  const kumulativeZeilen = sortedZeilen.slice(0, currentZeileIndex).map((z) => ({
    id: z.id,
    text: z.text,
  }));

  // Completed indices for FortschrittsDots
  const completedIndices = new Set<number>();
  for (let i = 0; i < sortedZeilen.length; i++) {
    if (completedZeilen.has(sortedZeilen[i].id)) {
      completedIndices.add(i);
    }
  }

  // --- Helper: save current strophe state ---
  const saveCurrentStropheState = useCallback(() => {
    if (!currentStrophe) return;
    setStrophenLernzustand((prev) => {
      const next = new Map(prev);
      next.set(currentStrophe.id, {
        currentZeileIndex,
        completedZeilen: new Set(completedZeilen),
        fehlversuche,
      });
      return next;
    });
  }, [currentStrophe, currentZeileIndex, completedZeilen, fehlversuche]);

  // --- Helper: load strophe state ---
  const loadStropheState = useCallback(
    (stropheId: string) => {
      const saved = strophenLernzustand.get(stropheId);
      if (saved) {
        setCurrentZeileIndex(saved.currentZeileIndex);
        setCompletedZeilen(new Set(saved.completedZeilen));
        setFehlversuche(saved.fehlversuche);
      } else {
        setCurrentZeileIndex(0);
        setCompletedZeilen(new Set());
        setFehlversuche(0);
      }
      setEingabe("");
      setZeilenStatus("eingabe");
      setStropheAbgeschlossen(false);
    },
    [strophenLernzustand]
  );

  // --- Helper: persist progress ---
  const persistProgress = useCallback(
    async (stropheId: string, completedCount: number, totalCount: number) => {
      const prozent = calculateStropheProgress(completedCount, totalCount);
      try {
        await fetch("/api/progress", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stropheId, prozent }),
        });
      } catch {
        // Silent error handling
      }
    },
    []
  );

  // --- Input logic (Task 5.2) ---
  const handleAbsenden = useCallback(() => {
    if (!currentZeile || zeilenStatus !== "eingabe") return;

    const isCorrect = validateLine(eingabe, currentZeile.text);

    if (isCorrect) {
      setZeilenStatus("korrekt");
    } else {
      const newFehlversuche = fehlversuche + 1;
      setFehlversuche(newFehlversuche);
      if (newFehlversuche >= 3) {
        setZeilenStatus("loesung");
      } else {
        setEingabe("");
      }
    }
  }, [currentZeile, eingabe, fehlversuche, zeilenStatus]);

  // --- Weiter logic (Task 5.3) ---
  const handleWeiter = useCallback(() => {
    if (!currentStrophe || !currentZeile) return;
    if (zeilenStatus !== "korrekt" && zeilenStatus !== "loesung") return;

    // Add current zeile to completed
    const newCompleted = new Set(completedZeilen);
    newCompleted.add(currentZeile.id);
    setCompletedZeilen(newCompleted);

    // Persist progress after each line
    const totalZeilen = sortedZeilen.length;
    persistProgress(currentStrophe.id, newCompleted.size, totalZeilen);

    if (istLetzteZeile) {
      // Strophe completed
      setStropheAbgeschlossen(true);
      setEingabe("");
      setFehlversuche(0);
      setZeilenStatus("eingabe");

      // Save completed state for this strophe
      setStrophenLernzustand((prev) => {
        const next = new Map(prev);
        next.set(currentStrophe.id, {
          currentZeileIndex: currentZeileIndex,
          completedZeilen: newCompleted,
          fehlversuche: 0,
        });
        return next;
      });

      // Persist 100% for this strophe
      persistProgress(currentStrophe.id, totalZeilen, totalZeilen);

      // Check if all strophen are completed
      const allCompleted = filteredStrophen.every((strophe) => {
        if (strophe.id === currentStrophe.id) return true; // just completed
        const saved = strophenLernzustand.get(strophe.id);
        if (!saved) return false;
        const stropheZeilen = [...strophe.zeilen].sort(
          (a, b) => a.orderIndex - b.orderIndex
        );
        return stropheZeilen.every((z) => saved.completedZeilen.has(z.id));
      });

      if (allCompleted && !allCompleteFired.current) {
        allCompleteFired.current = true;
        // Create completion session
        fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ songId: id, lernmethode: "ZEILE_FUER_ZEILE" }),
        }).then(() => dispatchStreakUpdate()).catch(() => {
          // Silent error handling
        });
      }
    } else {
      // Move to next line
      const nextIndex = currentZeileIndex + 1;
      setCurrentZeileIndex(nextIndex);
      setEingabe("");
      setFehlversuche(0);
      setZeilenStatus("eingabe");
      setStropheAbgeschlossen(false);

      // Save state for current strophe
      setStrophenLernzustand((prev) => {
        const next = new Map(prev);
        next.set(currentStrophe.id, {
          currentZeileIndex: nextIndex,
          completedZeilen: newCompleted,
          fehlversuche: 0,
        });
        return next;
      });
    }
  }, [
    currentStrophe,
    currentZeile,
    zeilenStatus,
    completedZeilen,
    sortedZeilen,
    istLetzteZeile,
    currentZeileIndex,
    filteredStrophen,
    strophenLernzustand,
    id,
    persistProgress,
  ]);

  // --- Strophen navigation (Task 5.4) ---
  const handlePreviousStrophe = useCallback(() => {
    if (currentStropheIndex <= 0) return;
    saveCurrentStropheState();
    const newIndex = currentStropheIndex - 1;
    setCurrentStropheIndex(newIndex);
    const targetStrophe = filteredStrophen[newIndex];
    if (targetStrophe) {
      loadStropheState(targetStrophe.id);
    }
  }, [currentStropheIndex, filteredStrophen, saveCurrentStropheState, loadStropheState]);

  const handleNextStrophe = useCallback(() => {
    if (currentStropheIndex >= filteredStrophen.length - 1) return;
    saveCurrentStropheState();
    const newIndex = currentStropheIndex + 1;
    setCurrentStropheIndex(newIndex);
    const targetStrophe = filteredStrophen[newIndex];
    if (targetStrophe) {
      loadStropheState(targetStrophe.id);
    }
  }, [currentStropheIndex, filteredStrophen, saveCurrentStropheState, loadStropheState]);

  // --- Strophen selection (Task 5.5) ---
  const handleStrophenConfirm = useCallback(
    (selectedIds: Set<string>) => {
      setActiveStrophenIds(selectedIds);
      setDialogOpen(false);

      // Reset all learning state
      setCurrentStropheIndex(0);
      setCurrentZeileIndex(0);
      setCompletedZeilen(new Set());
      setEingabe("");
      setFehlversuche(0);
      setZeilenStatus("eingabe");
      setStropheAbgeschlossen(false);
      setStrophenLernzustand(new Map());
      allCompleteFired.current = false;
    },
    []
  );

  // --- Render ---
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
      <div className="space-y-4">
        <ZeileFuerZeileNavbar songId={id} songTitle={song.titel} />
        <div className="px-4 py-10 text-center text-sm text-neutral-500">
          Dieser Song hat noch keine Strophen
        </div>
      </div>
    );
  }

  if (!currentStrophe || !currentZeile) {
    return null;
  }

  const hinweis =
    zeilenStatus === "loesung"
      ? ""
      : berechneHinweis(currentZeile.text, schwierigkeitsstufe);

  return (
    <div className="space-y-4 pb-6">
      <ZeileFuerZeileNavbar songId={id} songTitle={song.titel} />

      <div className="px-4 sm:px-6 space-y-4">
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="min-h-[44px] rounded bg-primary-100 px-4 py-2 text-sm font-medium text-primary-700 hover:bg-primary-200"
        >
          Strophen auswählen
        </button>

        <StrophenNavigator
          currentStropheName={currentStrophe.name}
          currentPosition={currentStropheIndex + 1}
          totalStrophen={filteredStrophen.length}
          canGoBack={currentStropheIndex > 0}
          canGoForward={currentStropheIndex < filteredStrophen.length - 1}
          onPrevious={handlePreviousStrophe}
          onNext={handleNextStrophe}
        />

        <FortschrittsDots
          totalZeilen={sortedZeilen.length}
          currentIndex={currentZeileIndex}
          completedIndices={completedIndices}
        />

        {stropheAbgeschlossen ? (
          <div className="rounded-lg border border-success-200 bg-success-50 px-6 py-4 text-center text-sm font-medium text-success-700">
            <AppIcon icon="lucide:party-popper" className="inline mr-1.5 text-base align-[-2px]" /> Strophe abgeschlossen!
          </div>
        ) : (
          <>
            <KumulativeAnsicht zeilen={kumulativeZeilen} />

            <AktiveZeile
              text={currentZeile.text}
              visible={zeilenStatus === "loesung"}
            />

            <SchwierigkeitsAuswahl
              value={schwierigkeitsstufe}
              onChange={setSchwierigkeitsstufe}
            />

            <HinweisAnzeige hinweis={hinweis} />

            <EingabeBereich
              eingabe={eingabe}
              onEingabeChange={setEingabe}
              onAbsenden={handleAbsenden}
              onWeiter={handleWeiter}
              status={zeilenStatus}
              fehlversuche={fehlversuche}
              disabled={false}
              istLetzteZeile={istLetzteZeile}
            />
          </>
        )}
      </div>

      <StrophenAuswahlDialog
        songId={id}
        strophen={song.strophen}
        activeStrophenIds={activeStrophenIds ?? new Set(song.strophen.map((s) => s.id))}
        open={dialogOpen}
        onConfirm={handleStrophenConfirm}
        onCancel={() => setDialogOpen(false)}
      />
    </div>
  );
}
