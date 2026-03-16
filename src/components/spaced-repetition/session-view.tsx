"use client";

import { useState } from "react";
import { FlipCard } from "./flip-card";
import type { FaelligeStrophe } from "@/lib/services/spaced-repetition-service";

interface SessionViewProps {
  strophen: FaelligeStrophe[];
  songTitel: string;
  onComplete: () => void;
}

export function SessionView({ strophen, songTitel, onComplete }: SessionViewProps) {
  const [aktuellerIndex, setAktuellerIndex] = useState(0);
  const [aufgedeckt, setAufgedeckt] = useState(false);
  const [bewertet, setBewertet] = useState(false);
  const [intervallTage, setIntervallTage] = useState<number | null>(null);
  const [bewertungLaedt, setBewertungLaedt] = useState(false);
  const [erledigt, setErledigt] = useState(0);
  const [gewusstAnzahl, setGewusstAnzahl] = useState(0);
  const [sessionAbgeschlossen, setSessionAbgeschlossen] = useState(false);

  const gesamt = strophen.length;
  const aktuelleStrophe = strophen[aktuellerIndex];

  async function handleBewertung(gewusst: boolean) {
    if (bewertungLaedt || bewertet) return;
    setBewertungLaedt(true);

    try {
      const res = await fetch("/api/spaced-repetition/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wiederholungId: aktuelleStrophe.wiederholungId,
          gewusst,
        }),
      });

      if (!res.ok) throw new Error("Bewertung fehlgeschlagen");

      const data = await res.json();
      setIntervallTage(data.intervallTage);
      setBewertet(true);
      setErledigt((prev) => prev + 1);
      if (gewusst) setGewusstAnzahl((prev) => prev + 1);
    } catch (error) {
      console.error("Review-Fehler:", error);
    } finally {
      setBewertungLaedt(false);
    }
  }

  function handleWeiter() {
    const naechsterIndex = aktuellerIndex + 1;
    if (naechsterIndex >= gesamt) {
      setSessionAbgeschlossen(true);
      onComplete();
    } else {
      setAktuellerIndex(naechsterIndex);
      setAufgedeckt(false);
      setBewertet(false);
      setIntervallTage(null);
    }
  }

  if (sessionAbgeschlossen) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <p className="text-2xl font-semibold text-gray-900">Session abgeschlossen!</p>
        <p className="text-lg text-gray-600">
          {gewusstAnzahl} von {gesamt} gewusst
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header mit Fortschritt */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{songTitel}</h2>
        <span className="text-sm text-gray-500">
          {erledigt} / {gesamt} erledigt
        </span>
      </div>

      {/* FlipCard */}
      <FlipCard
        stropheName={aktuelleStrophe.stropheName}
        zeilen={aktuelleStrophe.zeilen}
        aufgedeckt={aufgedeckt}
        onFlip={() => {
          if (!aufgedeckt) setAufgedeckt(true);
        }}
      />

      {/* Bewertungs-Buttons (nur sichtbar nach Aufdecken, vor Bewertung) */}
      {aufgedeckt && !bewertet && (
        <div className="flex gap-3">
          <button
            type="button"
            disabled={bewertungLaedt}
            onClick={() => handleBewertung(true)}
            className="flex-1 rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            Gewusst
          </button>
          <button
            type="button"
            disabled={bewertungLaedt}
            onClick={() => handleBewertung(false)}
            className="flex-1 rounded-lg bg-red-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            Nicht gewusst
          </button>
        </div>
      )}

      {/* Ergebnis nach Bewertung */}
      {bewertet && intervallTage !== null && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-gray-600">
            Nächste Wiederholung in {intervallTage}{" "}
            {intervallTage === 1 ? "Tag" : "Tagen"}
          </p>
          <button
            type="button"
            onClick={handleWeiter}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            {aktuellerIndex + 1 < gesamt ? "Weiter" : "Abschließen"}
          </button>
        </div>
      )}
    </div>
  );
}
