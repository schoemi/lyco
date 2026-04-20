"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type {
  BeatMethode,
  BeatErgebnisResponse,
  BeatEinstellungenProps,
} from "@/types/beat-detection";
import {
  findeInstrumentalQuelle,
  berechneStandardModus,
} from "@/lib/beat-detection/beat-utils";
import { validiereManuellenBpm } from "@/lib/beat-detection/bpm-validierung";
import BeatModusAuswahl from "./beat-modus-auswahl";
import FrequenzbereichRegler from "./frequenzbereich-regler";
import BpmEingabe from "./bpm-eingabe";
import BpmValidierung from "./bpm-validierung";
import BeatAnzeige from "./beat-anzeige";

/**
 * Hauptkomponente für Beat-Einstellungen.
 * Aufklappbarer Bereich unterhalb des AudioPlayers.
 * Integration von ModusAuswahl, FrequenzbereichRegler, BpmEingabe, BpmValidierung, BeatAnzeige.
 * Worker-Instanziierung und -Kommunikation für automatische Erkennung.
 * Fortschrittsindikator während der Analyse.
 * „Erneut erkennen"-Button wenn bereits ein Ergebnis vorhanden.
 * API-Aufrufe zum Speichern und Laden des BeatErgebnis.
 * Fehlerbehandlung: Alert bei API-Fehlern, Fehlermeldungen bei Worker-Fehlern.
 * Gespeichertes Ergebnis beim Öffnen laden und anzeigen.
 *
 * Requirements: 1.1-1.5, 2.1, 2.3-2.5, 2.7, 3.7, 5.1, 5.5, 6.1-6.3, 9.1, 9.2, 10.1-10.4
 */
export default function BeatEinstellungen({
  songId,
  audioQuellen,
  initialBeatErgebnis,
  beatOffsetMs = 0,
  onBeatOffsetChange,
  onBeatErgebnisChange,
}: BeatEinstellungenProps) {
  const [offen, setOffen] = useState(false);
  const [beatErgebnis, setBeatErgebnis] = useState<BeatErgebnisResponse | null>(
    initialBeatErgebnis,
  );

  const instrumentalQuelle = findeInstrumentalQuelle(audioQuellen);
  const instrumentalVorhanden = instrumentalQuelle !== null;
  const standardModus = berechneStandardModus(audioQuellen);

  const [modus, setModus] = useState<BeatMethode>(
    beatErgebnis?.methode ?? standardModus,
  );
  const [untergrenze, setUntergrenze] = useState(
    beatErgebnis?.frequenzUntergrenze ?? 60,
  );
  const [obergrenze, setObergrenze] = useState(
    beatErgebnis?.frequenzObergrenze ?? 200,
  );

  // Taktart state
  const [taktZaehler, setTaktZaehler] = useState(
    beatErgebnis?.taktZaehler ?? 4,
  );
  const [taktNenner, setTaktNenner] = useState(
    beatErgebnis?.taktNenner ?? 4,
  );

  // Worker state
  const workerRef = useRef<Worker | null>(null);
  const [analyseLaeuft, setAnalyseLaeuft] = useState(false);
  const [fortschritt, setFortschritt] = useState(0);
  const [workerFehler, setWorkerFehler] = useState<string | null>(null);

  // Validation state (for manual mode)
  const [validierung, setValidierung] = useState<{
    manuellBpm: number;
    detektiertBpm: number;
    abweichungProzent: number;
    uebereinstimmung: boolean;
  } | null>(null);

  const [apiFehler, setApiFehler] = useState<string | null>(null);
  const [speichert, setSpeichert] = useState(false);

  // Debounced offset save — saves offset to DB after slider stops moving
  const offsetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speichereOffset = useCallback(
    (newOffset: number) => {
      if (!beatErgebnis) return;
      if (offsetTimerRef.current) clearTimeout(offsetTimerRef.current);
      offsetTimerRef.current = setTimeout(async () => {
        try {
          await fetch(`/api/songs/${songId}/beat-ergebnis`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bpm: beatErgebnis.bpm,
              methode: beatErgebnis.methode,
              konfidenz: beatErgebnis.konfidenz,
              beatPositionenMs: beatErgebnis.beatPositionenMs,
              frequenzUntergrenze: beatErgebnis.frequenzUntergrenze,
              frequenzObergrenze: beatErgebnis.frequenzObergrenze,
              offsetMs: newOffset,
              taktZaehler,
              taktNenner,
            }),
          });
        } catch {
          // Silently fail — offset is still applied locally
        }
      }, 500);
    },
    [songId, beatErgebnis, taktZaehler, taktNenner],
  );

  // Debounced taktart save
  const taktTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speichereTaktart = useCallback(
    (zaehler: number, nenner: number) => {
      if (!beatErgebnis) return;
      if (taktTimerRef.current) clearTimeout(taktTimerRef.current);
      taktTimerRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/songs/${songId}/beat-ergebnis`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bpm: beatErgebnis.bpm,
              methode: beatErgebnis.methode,
              konfidenz: beatErgebnis.konfidenz,
              beatPositionenMs: beatErgebnis.beatPositionenMs,
              frequenzUntergrenze: beatErgebnis.frequenzUntergrenze,
              frequenzObergrenze: beatErgebnis.frequenzObergrenze,
              offsetMs: beatOffsetMs,
              taktZaehler: zaehler,
              taktNenner: nenner,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            setBeatErgebnis(data.beatErgebnis);
            onBeatErgebnisChange?.(data.beatErgebnis);
          }
        } catch {
          // Silently fail
        }
      }, 300);
    },
    [songId, beatErgebnis, beatOffsetMs, onBeatErgebnisChange],
  );

  // Cleanup worker and timers on unmount
  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      if (offsetTimerRef.current) clearTimeout(offsetTimerRef.current);
      if (taktTimerRef.current) clearTimeout(taktTimerRef.current);
    };
  }, []);

  // Load saved result when opening
  const hatGeladen = useRef(false);
  useEffect(() => {
    if (!offen || hatGeladen.current) return;
    hatGeladen.current = true;

    async function ladeBeatErgebnis() {
      try {
        const res = await fetch(`/api/songs/${songId}/beat-ergebnis`);
        if (res.ok) {
          const data = await res.json();
          if (data.beatErgebnis) {
            setBeatErgebnis(data.beatErgebnis);
            setModus(data.beatErgebnis.methode);
            if (data.beatErgebnis.frequenzUntergrenze != null) {
              setUntergrenze(data.beatErgebnis.frequenzUntergrenze);
            }
            if (data.beatErgebnis.frequenzObergrenze != null) {
              setObergrenze(data.beatErgebnis.frequenzObergrenze);
            }
          }
        }
      } catch {
        // Silently fail — initial result is already available from props
      }
    }

    if (!initialBeatErgebnis) {
      ladeBeatErgebnis();
    }
  }, [offen, songId, initialBeatErgebnis]);

  const speichereBeatErgebnis = useCallback(
    async (input: {
      bpm: number;
      methode: BeatMethode;
      konfidenz?: number | null;
      beatPositionenMs: number[];
      frequenzUntergrenze?: number | null;
      frequenzObergrenze?: number | null;
    }) => {
      setSpeichert(true);
      setApiFehler(null);
      try {
        const res = await fetch(`/api/songs/${songId}/beat-ergebnis`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? "Fehler beim Speichern");
        }
        const data = await res.json();
        setBeatErgebnis(data.beatErgebnis);
        onBeatErgebnisChange?.(data.beatErgebnis);
        return data.beatErgebnis as BeatErgebnisResponse;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Fehler beim Speichern";
        setApiFehler(msg);
        return null;
      } finally {
        setSpeichert(false);
      }
    },
    [songId],
  );

  const starteAutomatischeErkennung = useCallback(async () => {
    if (!instrumentalQuelle) return;

    setAnalyseLaeuft(true);
    setFortschritt(0);
    setWorkerFehler(null);
    setValidierung(null);

    try {
      // Fetch the audio data
      const response = await fetch(instrumentalQuelle.url);
      if (!response.ok) {
        throw new Error(
          "Die Instrumental-Spur konnte nicht geladen werden. Bitte prüfe die URL und versuche es erneut.",
        );
      }
      const arrayBuffer = await response.arrayBuffer();

      // Decode audio
      const decodeCtx = new OfflineAudioContext(1, 1, 44100);
      let audioBuffer: AudioBuffer;
      try {
        audioBuffer = await decodeCtx.decodeAudioData(arrayBuffer);
      } catch {
        throw new Error(
          "Das Audio-Format wird nicht unterstützt. Bitte verwende eine MP3-Datei.",
        );
      }

      // Apply bandpass filter in the main thread (OfflineAudioContext is available here)
      const length = audioBuffer.getChannelData(0).length;
      const sampleRate = audioBuffer.sampleRate;
      const filterCtx = new OfflineAudioContext(1, length, sampleRate);

      const filterBuffer = filterCtx.createBuffer(1, length, sampleRate);
      filterBuffer.getChannelData(0).set(audioBuffer.getChannelData(0));

      const source = filterCtx.createBufferSource();
      source.buffer = filterBuffer;

      const filter = filterCtx.createBiquadFilter();
      filter.type = "bandpass";
      const centerFreq = Math.sqrt(untergrenze * obergrenze);
      filter.frequency.value = centerFreq;
      const bandwidth = obergrenze - untergrenze;
      filter.Q.value = centerFreq / Math.max(bandwidth, 1);

      source.connect(filter);
      filter.connect(filterCtx.destination);
      source.start(0);

      let filteredBuffer: AudioBuffer;
      try {
        filteredBuffer = await filterCtx.startRendering();
      } catch {
        throw new Error(
          "Fehler beim Anwenden des Bandpass-Filters.",
        );
      }

      const filteredData = filteredBuffer.getChannelData(0);

      // Create and start worker — send already-filtered signal
      const worker = new Worker(
        new URL(
          "@/lib/beat-detection/beat-detektor-worker.ts",
          import.meta.url,
        ),
      );
      workerRef.current = worker;

      worker.onmessage = async (e) => {
        const msg = e.data;
        if (msg.type === "FORTSCHRITT") {
          setFortschritt(msg.fortschritt ?? 0);
        } else if (msg.type === "ERGEBNIS" && msg.ergebnis) {
          setAnalyseLaeuft(false);
          setFortschritt(100);

          // Save result
          await speichereBeatErgebnis({
            bpm: msg.ergebnis.bpm,
            methode: "AUTOMATISCH",
            konfidenz: msg.ergebnis.konfidenz,
            beatPositionenMs: msg.ergebnis.beatPositionenMs,
            frequenzUntergrenze: untergrenze,
            frequenzObergrenze: obergrenze,
          });

          worker.terminate();
          workerRef.current = null;
        } else if (msg.type === "FEHLER") {
          setAnalyseLaeuft(false);
          setWorkerFehler(
            msg.fehler ?? "Ein unerwarteter Fehler ist aufgetreten.",
          );
          worker.terminate();
          workerRef.current = null;
        }
      };

      worker.onerror = () => {
        setAnalyseLaeuft(false);
        setWorkerFehler(
          "Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.",
        );
        worker.terminate();
        workerRef.current = null;
      };

      // Send analysis request with pre-filtered audio
      worker.postMessage({
        type: "ANALYSE",
        audioBuffer: filteredData,
        sampleRate: sampleRate,
        frequenzUntergrenze: untergrenze,
        frequenzObergrenze: obergrenze,
      });
    } catch (err) {
      setAnalyseLaeuft(false);
      setWorkerFehler(
        err instanceof Error
          ? err.message
          : "Ein unerwarteter Fehler ist aufgetreten.",
      );
    }
  }, [instrumentalQuelle, untergrenze, obergrenze, speichereBeatErgebnis]);

  const handleBpmBestaetigt = useCallback(
    async (bpm: number) => {
      setValidierung(null);

      // If instrumental available, validate against detected BPM
      if (instrumentalVorhanden && beatErgebnis?.methode === "AUTOMATISCH") {
        const result = validiereManuellenBpm(bpm, beatErgebnis.bpm);
        setValidierung({
          manuellBpm: bpm,
          detektiertBpm: beatErgebnis.bpm,
          ...result,
        });
      }

      // Save manual BPM
      await speichereBeatErgebnis({
        bpm,
        methode: "MANUELL",
        konfidenz: null,
        beatPositionenMs: beatErgebnis?.beatPositionenMs ?? [],
      });
    },
    [instrumentalVorhanden, beatErgebnis, speichereBeatErgebnis],
  );

  const handleDetektiertenWertUebernehmen = useCallback(async () => {
    if (!validierung) return;
    setValidierung(null);

    await speichereBeatErgebnis({
      bpm: validierung.detektiertBpm,
      methode: "MANUELL",
      konfidenz: null,
      beatPositionenMs: beatErgebnis?.beatPositionenMs ?? [],
    });
  }, [validierung, beatErgebnis, speichereBeatErgebnis]);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <button
        type="button"
        onClick={() => setOffen(!offen)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        aria-expanded={offen}
      >
        <span className="text-sm font-semibold text-neutral-900">
          Beat-Einstellungen
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-4 w-4 text-neutral-500 transition-transform ${offen ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {offen && (
        <div className="border-t border-neutral-200 px-4 py-4 space-y-4">
          {/* Modus-Auswahl */}
          <BeatModusAuswahl
            modus={modus}
            onModusChange={setModus}
            instrumentalVorhanden={instrumentalVorhanden}
          />

          {/* Automatisch-Modus: Frequenzbereich + Erkennung starten */}
          {modus === "AUTOMATISCH" && (
            <div className="space-y-3">
              <FrequenzbereichRegler
                untergrenze={untergrenze}
                obergrenze={obergrenze}
                onUntergrenzeChange={setUntergrenze}
                onObergrenzeChange={setObergrenze}
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={starteAutomatischeErkennung}
                  disabled={analyseLaeuft || speichert}
                  className="rounded-md bg-newsong-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-newsong-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {beatErgebnis && beatErgebnis.methode === "AUTOMATISCH"
                    ? "Erneut erkennen"
                    : "Erkennung starten"}
                </button>
                {speichert && (
                  <span className="text-xs text-neutral-500">Speichert…</span>
                )}
              </div>

              {/* Fortschrittsindikator */}
              {analyseLaeuft && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-200">
                      <div
                        className="h-full rounded-full bg-newsong-500 transition-all"
                        style={{ width: `${fortschritt}%` }}
                        role="progressbar"
                        aria-valuenow={fortschritt}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label="Analyse-Fortschritt"
                      />
                    </div>
                    <span className="text-xs tabular-nums text-neutral-500">
                      {fortschritt}%
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500">
                    Analyse läuft…
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Manuell-Modus: BPM-Eingabe */}
          {modus === "MANUELL" && (
            <div className="space-y-3">
              <BpmEingabe
                onBpmBestaetigt={handleBpmBestaetigt}
                initialBpm={
                  beatErgebnis?.methode === "MANUELL"
                    ? beatErgebnis.bpm
                    : null
                }
              />

              {/* Validierung anzeigen */}
              {validierung && (
                <BpmValidierung
                  manuellBpm={validierung.manuellBpm}
                  detektiertBpm={validierung.detektiertBpm}
                  abweichungProzent={validierung.abweichungProzent}
                  uebereinstimmung={validierung.uebereinstimmung}
                  onDetektiertenWertUebernehmen={
                    handleDetektiertenWertUebernehmen
                  }
                />
              )}
            </div>
          )}

          {/* Worker-Fehler */}
          {workerFehler && (
            <div
              className="rounded-lg border border-error-200 bg-error-50 px-4 py-3"
              role="alert"
            >
              <p className="text-sm text-error-700">{workerFehler}</p>
            </div>
          )}

          {/* API-Fehler */}
          {apiFehler && (
            <p className="text-sm text-error-600" role="alert">
              {apiFehler}
            </p>
          )}

          {/* Beat-Ergebnis anzeigen */}
          {beatErgebnis && !analyseLaeuft && (
            <BeatAnzeige
              bpm={beatErgebnis.bpm}
              methode={beatErgebnis.methode}
              konfidenz={beatErgebnis.konfidenz}
            />
          )}

          {/* Taktart-Auswahl */}
          {beatErgebnis && !analyseLaeuft && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-neutral-700">Taktart</p>
              <div className="flex items-center gap-2">
                <select
                  value={`${taktZaehler}/${taktNenner}`}
                  onChange={(e) => {
                    const [z, n] = e.target.value.split("/").map(Number);
                    setTaktZaehler(z);
                    setTaktNenner(n);
                    speichereTaktart(z, n);
                  }}
                  className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-newsong-500"
                  aria-label="Taktart"
                >
                  <option value="2/4">2/4</option>
                  <option value="3/4">3/4</option>
                  <option value="4/4">4/4</option>
                  <option value="6/8">6/8</option>
                  <option value="3/8">3/8</option>
                  <option value="5/4">5/4</option>
                  <option value="7/8">7/8</option>
                </select>
                <span className="text-xs text-neutral-400">
                  {taktZaehler} Schläge pro Takt
                </span>
              </div>
            </div>
          )}

          {/* Beat-Offset-Slider */}
          {beatErgebnis && !analyseLaeuft && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="beat-offset"
                  className="text-sm font-medium text-neutral-700"
                >
                  Beat-Offset
                </label>
                <span className="text-xs tabular-nums text-neutral-500">
                  {beatOffsetMs >= 0 ? "+" : ""}{beatOffsetMs} ms
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="beat-offset"
                  type="range"
                  min={-500}
                  max={500}
                  step={10}
                  value={beatOffsetMs}
                  onChange={(e) => {
                    const newOffset = Number(e.target.value);
                    onBeatOffsetChange?.(newOffset);
                    speichereOffset(newOffset);
                  }}
                  className="flex-1"
                  aria-label="Beat-Offset in Millisekunden"
                />
                <button
                  type="button"
                  onClick={() => {
                    onBeatOffsetChange?.(0);
                    speichereOffset(0);
                  }}
                  disabled={beatOffsetMs === 0}
                  className="rounded px-2 py-0.5 text-xs text-neutral-500 hover:bg-neutral-100 disabled:opacity-30"
                  aria-label="Offset zurücksetzen"
                >
                  Reset
                </button>
              </div>
              <p className="text-xs text-neutral-400">
                Verschiebt die Beat-Marker um ±500 ms, um sie mit der Wiedergabe zu synchronisieren.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
