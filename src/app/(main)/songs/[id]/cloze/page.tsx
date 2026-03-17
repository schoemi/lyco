"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ClozeNavbar } from "@/components/cloze/cloze-navbar";
import { DifficultySelector } from "@/components/cloze/difficulty-selector";
import { StanzaBlock } from "@/components/cloze/stanza-block";
import { ScorePill } from "@/components/cloze/score-pill";
import { CheckAllButton } from "@/components/cloze/check-all-button";
import { StrophenAuswahlDialog } from "@/components/cloze/strophen-auswahl-dialog";
import { ProgressBar } from "@/components/songs/progress-bar";
import { generateGaps } from "@/lib/cloze/gap-generator";
import { validateAnswer } from "@/lib/cloze/validate-answer";
import { calculateProgress } from "@/lib/cloze/score";
import { dispatchStreakUpdate } from "@/lib/dispatch-streak-update";
import type { SongDetail } from "@/types/song";
import type { DifficultyLevel, GapData } from "@/types/cloze";

function getZeilenFromSong(song: SongDetail, activeStrophenIds?: Set<string> | null) {
  const strophen = activeStrophenIds
    ? song.strophen.filter((s) => activeStrophenIds.has(s.id))
    : song.strophen;
  return strophen.flatMap((s) =>
    s.zeilen.map((z) => ({ id: z.id, text: z.text }))
  );
}

export default function ClozePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [song, setSong] = useState<SongDetail | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("leicht");
  const [gaps, setGaps] = useState<GapData[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, "correct" | "incorrect" | null>>({});
  const [hints, setHints] = useState<Set<string>>(new Set());
  const [score, setScore] = useState<{ correct: number; total: number }>({ correct: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStrophenIds, setActiveStrophenIds] = useState<Set<string> | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Track whether completion API calls have been fired
  const completionFired = useRef(false);

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

        // Generate initial gaps with default difficulty
        const zeilen = loadedSong.strophen.flatMap((s) =>
          s.zeilen.map((z) => ({ id: z.id, text: z.text }))
        );
        const initialGaps = generateGaps(zeilen, "leicht");
        setGaps(initialGaps);

        const totalGaps = initialGaps.filter((g) => g.isGap).length;
        setScore({ correct: 0, total: totalGaps });

        // Track session
        try {
          await fetch("/api/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ songId: id, lernmethode: "LUECKENTEXT" }),
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

  // --- Difficulty change ---
  const handleDifficultyChange = useCallback(
    (newDifficulty: DifficultyLevel) => {
      if (!song) return;
      setDifficulty(newDifficulty);
      setAnswers({});
      setFeedback({});
      setHints(new Set());
      completionFired.current = false;

      const zeilen = getZeilenFromSong(song, activeStrophenIds);
      const newGaps = generateGaps(zeilen, newDifficulty);
      setGaps(newGaps);

      const totalGaps = newGaps.filter((g) => g.isGap).length;
      setScore({ correct: 0, total: totalGaps });
    },
    [song, activeStrophenIds]
  );

  // --- Strophen selection confirm ---
  const handleStrophenConfirm = useCallback(
    (selectedIds: Set<string>) => {
      setActiveStrophenIds(selectedIds);
      setDialogOpen(false);
      if (!song) return;
      const zeilen = getZeilenFromSong(song, selectedIds);
      const newGaps = generateGaps(zeilen, difficulty);
      setGaps(newGaps);
      setAnswers({});
      setFeedback({});
      setHints(new Set());
      completionFired.current = false;
      const totalGaps = newGaps.filter((g) => g.isGap).length;
      setScore({ correct: 0, total: totalGaps });
    },
    [song, difficulty]
  );

  // --- Answer change ---
  const handleAnswer = useCallback((gapId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [gapId]: value }));
  }, []);

  // --- Blur handler ---
  const handleBlur = useCallback(
    (gapId: string) => {
      const answer = answers[gapId] ?? "";
      if (answer.trim() === "") return;
      if (feedback[gapId] === "correct") return;

      const gap = gaps.find((g) => g.gapId === gapId);
      if (!gap) return;

      const isCorrect = validateAnswer(answer, gap.word);
      setFeedback((prev) => ({
        ...prev,
        [gapId]: isCorrect ? "correct" : "incorrect",
      }));

      if (isCorrect) {
        setScore((prev) => ({ ...prev, correct: prev.correct + 1 }));
      }
    },
    [answers, feedback, gaps]
  );

  // --- Check-All handler ---
  const handleCheckAll = useCallback(() => {
    let newCorrect = 0;
    const newFeedback = { ...feedback };

    for (const gap of gaps) {
      if (!gap.isGap) continue;
      if (newFeedback[gap.gapId] === "correct") continue;

      const answer = answers[gap.gapId] ?? "";
      if (answer.trim() === "") continue;

      const isCorrect = validateAnswer(answer, gap.word);
      newFeedback[gap.gapId] = isCorrect ? "correct" : "incorrect";
      if (isCorrect) newCorrect++;
    }

    setFeedback(newFeedback);
    if (newCorrect > 0) {
      setScore((prev) => ({ ...prev, correct: prev.correct + newCorrect }));
    }
  }, [answers, feedback, gaps]);

  // --- Hint handler ---
  const handleHint = useCallback((gapId: string) => {
    setHints((prev) => {
      if (prev.has(gapId)) return prev;
      const next = new Set(prev);
      next.add(gapId);
      return next;
    });
  }, []);

  // --- 100% Completion ---
  useEffect(() => {
    if (!song) return;
    if (score.total === 0) return;
    if (score.correct < score.total) return;
    if (completionFired.current) return;
    completionFired.current = true;

    async function persistCompletion() {
      // PUT progress only for active strophes
      const strophenToUpdate = activeStrophenIds
        ? song!.strophen.filter((s) => activeStrophenIds.has(s.id))
        : song!.strophen;
      for (const strophe of strophenToUpdate) {
        try {
          await fetch("/api/progress", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stropheId: strophe.id, prozent: 100 }),
          });
        } catch {
          // Silent error handling
        }
      }

      // POST session
      try {
        await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ songId: id, lernmethode: "LUECKENTEXT" }),
        });
        dispatchStreakUpdate();
      } catch {
        // Silent error handling
      }
    }

    persistCompletion();
  }, [song, score, id, activeStrophenIds]);

  // --- Derived values ---
  const progressPercent = calculateProgress(score.correct, score.total);
  const hasOpenGaps = gaps.some(
    (g) => g.isGap && feedback[g.gapId] !== "correct"
  );

  // --- Render ---
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
      <div className="space-y-4">
        <ClozeNavbar songId={id} songTitle={song.titel} />
        <div className="px-4 py-10 text-center text-sm text-gray-500">
          Dieser Song hat noch keine Strophen
        </div>
      </div>
    );
  }

  const sortedStrophen = [...song.strophen]
    .filter((s) => !activeStrophenIds || activeStrophenIds.has(s.id))
    .sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <div className="space-y-4 pb-6">
      <ClozeNavbar songId={id} songTitle={song.titel} />

      <div className="px-4 sm:px-6 space-y-4">
        <DifficultySelector active={difficulty} onChange={handleDifficultyChange} />

        <ProgressBar value={progressPercent} />

        <div className="flex justify-end">
          <ScorePill correct={score.correct} total={score.total} />
        </div>

        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="min-h-[44px] rounded bg-purple-100 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-200"
        >
          Strophen auswählen
        </button>

        <div className="space-y-4">
          {sortedStrophen.map((strophe) => {
            const stropheGaps = gaps.filter((g) =>
              strophe.zeilen.some((z) => z.id === g.zeileId)
            );
            return (
              <StanzaBlock
                key={strophe.id}
                strophe={strophe}
                gaps={stropheGaps}
                answers={answers}
                feedback={feedback}
                hints={hints}
                onAnswer={handleAnswer}
                onBlur={handleBlur}
                onHint={handleHint}
              />
            );
          })}
        </div>

        <CheckAllButton disabled={!hasOpenGaps} onClick={handleCheckAll} />
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
