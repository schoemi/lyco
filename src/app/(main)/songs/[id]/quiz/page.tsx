"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { QuizNavbar } from "@/components/quiz/quiz-navbar";
import { QuizTypAuswahl } from "@/components/quiz/quiz-typ-auswahl";
import { MultipleChoiceCard } from "@/components/quiz/multiple-choice-card";
import { ReihenfolgeCard } from "@/components/quiz/reihenfolge-card";
import { DiktatCard } from "@/components/quiz/diktat-card";
import { ScoreScreen } from "@/components/quiz/score-screen";
import { StrophenAuswahlDialog } from "@/components/quiz/strophen-auswahl-dialog";
import { ProgressBar } from "@/components/songs/progress-bar";
import {
  generateMCQuestions,
  generateReihenfolgeQuestions,
  generateDiktatQuestions,
} from "@/lib/quiz/quiz-generator";
import { validateDiktat } from "@/lib/quiz/validate-answer";
import { calculateScore, calculateStropheScores } from "@/lib/quiz/score";
import type { SongDetail } from "@/types/song";
import type { QuizTyp, QuizQuestion, QuizAnswer } from "@/types/quiz";

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [song, setSong] = useState<SongDetail | null>(null);
  const [quizTyp, setQuizTyp] = useState<QuizTyp | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [phase, setPhase] = useState<"auswahl" | "quiz" | "score">("auswahl");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStrophenIds, setActiveStrophenIds] = useState<Set<string>>(
    new Set()
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [progressError, setProgressError] = useState(false);
  const [songProgress, setSongProgress] = useState<number | null>(null);

  // Track whether completion API calls have been fired
  const completionFired = useRef(false);

  // --- Data loading ---
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
          throw new Error("Song konnte nicht geladen werden");
        }
        const json = await res.json();
        const loadedSong: SongDetail = json.song;
        setSong(loadedSong);

        // Initialize all strophes as active
        const allIds = new Set(loadedSong.strophen.map((s) => s.id));
        setActiveStrophenIds(allIds);
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

  // --- Quiz-Typ selection → generate questions → start quiz ---
  const handleTypSelect = useCallback(
    (typ: QuizTyp) => {
      if (!song) return;
      setQuizTyp(typ);

      const ids =
        activeStrophenIds.size > 0 ? activeStrophenIds : undefined;

      let generated: QuizQuestion[];
      switch (typ) {
        case "multiple-choice":
          generated = generateMCQuestions(song, ids);
          break;
        case "reihenfolge":
          generated = generateReihenfolgeQuestions(song, ids);
          break;
        case "diktat":
          generated = generateDiktatQuestions(song, ids);
          break;
      }

      setQuestions(generated);
      setCurrentIndex(0);
      setAnswers([]);
      setPhase("quiz");
    },
    [song, activeStrophenIds]
  );

  // --- Record answer (no advancement) ---
  const handleAnswer = useCallback(
    (answer: QuizAnswer) => {
      setAnswers((prev) => [...prev, answer]);
    },
    []
  );

  // --- Advance to next question or score screen ---
  const handleAdvance = useCallback(() => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setPhase("score");
    }
  }, [currentIndex, questions.length]);

  // --- Repeat quiz (keep strophen selection) ---
  const handleRepeat = useCallback(() => {
    setQuizTyp(null);
    setQuestions([]);
    setCurrentIndex(0);
    setAnswers([]);
    setPhase("auswahl");
  }, []);

  // --- Strophen selection confirm ---
  const handleStrophenConfirm = useCallback(
    (selectedIds: Set<string>) => {
      setActiveStrophenIds(selectedIds);
      setDialogOpen(false);
    },
    []
  );

  // --- Persist progress and session when score phase is reached ---
  const persistProgress = useCallback(async () => {
    if (!song || answers.length === 0) return;

    setProgressError(false);

    const stropheScores = calculateStropheScores(answers, song);

    // PUT /api/progress for each active strophe with a score
    try {
      for (const [stropheId, prozent] of stropheScores) {
        const res = await fetch("/api/progress", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stropheId, prozent, lernmethode: "QUIZ" }),
        });
        if (!res.ok) {
          throw new Error("Fortschritt konnte nicht gespeichert werden");
        }
      }

      // Refresh song progress after successful update
      try {
        const progressRes = await fetch(`/api/progress?songId=${id}`);
        if (progressRes.ok) {
          const progressJson = await progressRes.json();
          const progressArr = progressJson.progress as Array<{ prozent: number }>;
          if (progressArr && progressArr.length > 0) {
            const avg = Math.round(
              progressArr.reduce((sum: number, p: { prozent: number }) => sum + p.prozent, 0) / progressArr.length
            );
            setSongProgress(avg);
          }
        }
      } catch {
        // Non-critical: progress bar refresh failure
      }
    } catch {
      setProgressError(true);
      return;
    }

    // POST /api/sessions — silent error handling
    try {
      await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId: id, lernmethode: "QUIZ" }),
      });
    } catch (err) {
      console.error("Session-Erstellung fehlgeschlagen:", err);
    }
  }, [song, answers, id]);

  useEffect(() => {
    if (phase !== "score") return;
    if (completionFired.current) return;
    completionFired.current = true;

    persistProgress();
  }, [phase, persistProgress]);

  // --- Retry progress persistence ---
  const handleRetryProgress = useCallback(() => {
    persistProgress();
  }, [persistProgress]);

  // Reset completionFired when going back to auswahl
  const handleRepeatWithReset = useCallback(() => {
    completionFired.current = false;
    setProgressError(false);
    setSongProgress(null);
    handleRepeat();
  }, [handleRepeat]);

  // --- Derived values ---
  const scoreResult = answers.length > 0 ? calculateScore(answers) : null;
  const currentQuestion = questions[currentIndex] ?? null;

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
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
          {error}
        </div>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        >
          ← Zurück
        </button>
      </div>
    );
  }

  if (!song) {
    return null;
  }

  return (
    <div className="space-y-4 pb-6">
      <QuizNavbar songId={id} songTitle={song.titel} />

      <div className="px-4 sm:px-6 space-y-4">
        <ProgressBar value={songProgress ?? song.progress ?? 0} />

        {phase === "auswahl" && (
          <>
            <QuizTypAuswahl onSelect={handleTypSelect} />
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="min-h-[44px] rounded bg-purple-100 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              Strophen auswählen
            </button>
          </>
        )}

        {phase === "quiz" && currentQuestion && (
          <>
            {"options" in currentQuestion && (
              <MultipleChoiceCard
                key={currentQuestion.id}
                question={currentQuestion}
                onAnswer={(optionIndex) => {
                  handleAnswer({
                    questionId: currentQuestion.id,
                    stropheId: currentQuestion.stropheId,
                    correct: optionIndex === currentQuestion.correctIndex,
                  });
                }}
                onWeiter={handleAdvance}
              />
            )}
            {"shuffledZeilen" in currentQuestion && (
              <ReihenfolgeCard
                key={currentQuestion.id}
                question={currentQuestion}
                onSubmit={(order) => {
                  const correct =
                    JSON.stringify(order) ===
                    JSON.stringify(currentQuestion.correctOrder);
                  handleAnswer({
                    questionId: currentQuestion.id,
                    stropheId: currentQuestion.stropheId,
                    correct,
                  });
                }}
                onWeiter={handleAdvance}
              />
            )}
            {"originalText" in currentQuestion && (
              <DiktatCard
                key={currentQuestion.id}
                question={currentQuestion}
                onSubmit={(text) => {
                  const { correct } = validateDiktat(
                    text,
                    currentQuestion.originalText
                  );
                  handleAnswer({
                    questionId: currentQuestion.id,
                    stropheId: currentQuestion.stropheId,
                    correct,
                  });
                }}
                onWeiter={handleAdvance}
              />
            )}
          </>
        )}

        {phase === "score" && scoreResult && (
          <>
            {progressError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
                <span>Fortschritt konnte nicht gespeichert werden.</span>
                <button
                  type="button"
                  onClick={handleRetryProgress}
                  className="ml-3 rounded bg-red-100 px-3 py-1 text-sm font-medium text-red-800 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  Erneut versuchen
                </button>
              </div>
            )}
            <ScoreScreen
              correct={scoreResult.correct}
              total={scoreResult.total}
              songId={id}
              onRepeat={handleRepeatWithReset}
            />
          </>
        )}
      </div>

      <StrophenAuswahlDialog
        songId={id}
        strophen={song.strophen}
        activeStrophenIds={activeStrophenIds}
        open={dialogOpen}
        onConfirm={handleStrophenConfirm}
        onCancel={() => setDialogOpen(false)}
      />
    </div>
  );
}
