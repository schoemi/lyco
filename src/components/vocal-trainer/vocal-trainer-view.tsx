"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { SongDetail } from "@/types/song";
import type {
  AufnahmeZustand,
  AnalyseErgebnis,
  ReferenzDaten,
  WorkerResponse,
} from "@/types/vocal-trainer";
import type { FlatLine, DisplayMode } from "@/types/karaoke";
import type { TagDefinitionData } from "@/types/vocal-tag";
import { flattenLines } from "@/lib/karaoke/flatten-lines";
import { messeLatenz, kompensiere } from "@/lib/vocal-trainer/latenz";
import { TextAnzeige } from "@/components/karaoke/text-anzeige";
import { StrophenTitel } from "@/components/karaoke/strophen-titel";
import { SongInfo } from "@/components/karaoke/song-info";
import { ZurueckButton } from "@/components/karaoke/zurueck-button";
import { ModusUmschalter } from "@/components/karaoke/modus-umschalter";
import { AufnahmeControls } from "@/components/vocal-trainer/aufnahme-controls";
import { FeedbackAnsicht } from "@/components/vocal-trainer/feedback-ansicht";
import { KopfhoererHinweis } from "@/components/vocal-trainer/kopfhoerer-hinweis";
import { VuMeter } from "@/components/vocal-trainer/vu-meter";

interface VocalTrainerViewProps {
  song: SongDetail;
  instrumentalUrl: string;
  referenzDaten: ReferenzDaten;
  onZurueck: () => void;
}

/** Minimum percentage of voiced frames required to consider the recording valid. */
const MIN_VOICED_RATIO = 0.2;

/** Advance stanza switch 1.5 seconds before the timecode marker. */
const STROPHE_VORLAUF_MS = 1500;

/** Status labels for aria-live announcements. */
const ZUSTAND_LABELS: Record<AufnahmeZustand, string> = {
  BEREIT: "Bereit für die Aufnahme",
  AUFNAHME: "Aufnahme läuft",
  ANALYSE: "Analyse wird durchgeführt",
  ERGEBNIS: "Ergebnis verfügbar",
};

export function VocalTrainerView({
  song,
  instrumentalUrl,
  referenzDaten,
  onZurueck,
}: VocalTrainerViewProps) {
  // --- State ---
  const [zustand, setZustand] = useState<AufnahmeZustand>("BEREIT");
  const [fehler, setFehler] = useState<string | null>(null);
  const [ergebnis, setErgebnis] = useState<AnalyseErgebnis | null>(null);
  const [fortschritt, setFortschritt] = useState(0);
  const [activeLineIndex, setActiveLineIndex] = useState(0);
  const [kopfhoererBestaetigt, setKopfhoererBestaetigt] = useState(false);
  const [warnungWenigGesang, setWarnungWenigGesang] = useState(false);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("strophe");
  const [showVocalTags, setShowVocalTags] = useState(false);
  const [tagDefinitions, setTagDefinitions] = useState<TagDefinitionData[]>([]);

  // --- Refs ---
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const latenzRef = useRef<number>(0);
  const timecodeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const rawSamplesRef = useRef<Float32Array[]>([]);
  const handleStopRef = useRef<() => void>(() => {});
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [sampleCount, setSampleCount] = useState(0);

  // --- Audio device selection ---
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

  // --- Mic gain ---
  const [gainWert, setGainWert] = useState(1.0);
  const gainNodeRef = useRef<GainNode | null>(null);

  // --- Sync gain value to live GainNode ---
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = gainWert;
    }
  }, [gainWert]);

  // --- Enumerate audio devices ---
  useEffect(() => {
    let cancelled = false;

    async function enumerateDevices() {
      try {
        // Need a temporary stream to get device labels (browsers hide them until permission is granted)
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        tempStream.getTracks().forEach((t) => t.stop());

        const devices = await navigator.mediaDevices.enumerateDevices();
        if (cancelled) return;
        const inputs = devices.filter((d) => d.kind === "audioinput");
        setAudioDevices(inputs);
        // Auto-select first device if nothing selected
        if (inputs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(inputs[0].deviceId);
        }
      } catch {
        // Permission denied or no devices — leave list empty
      }
    }

    if (kopfhoererBestaetigt) {
      enumerateDevices();
    }

    const handleDeviceChange = () => {
      if (kopfhoererBestaetigt) enumerateDevices();
    };
    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);

    return () => {
      cancelled = true;
      navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
    };
  }, [kopfhoererBestaetigt, selectedDeviceId]);

  // --- Derived ---
  const flatLines: FlatLine[] = useMemo(() => flattenLines(song), [song]);
  const activeLine = flatLines[activeLineIndex];

  // --- Load tag definitions when vocal tag display is enabled ---
  useEffect(() => {
    if (!showVocalTags || tagDefinitions.length > 0) return;
    let cancelled = false;
    async function loadTags() {
      try {
        const res = await fetch("/api/tag-definitions");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setTagDefinitions(data.definitions ?? []);
        }
      } catch {
        // Silently fail — tags just won't render
      }
    }
    loadTags();
    return () => { cancelled = true; };
  }, [showVocalTags, tagDefinitions.length]);

  // Build timecode map: sorted list of { timeMs, lineIndex }
  const timecodeMap = useMemo(() => {
    const entries: { timeMs: number; lineIndex: number }[] = [];
    for (const strophe of song.strophen) {
      // Strophe-level timecode
      const stropheTimecode = strophe.markups.find(
        (m) => m.typ === "TIMECODE" && m.ziel === "STROPHE" && m.timecodeMs != null
      );
      if (stropheTimecode?.timecodeMs != null) {
        const firstLineIdx = flatLines.findIndex(
          (fl) => fl.stropheId === strophe.id
        );
        if (firstLineIdx >= 0) {
          entries.push({ timeMs: stropheTimecode.timecodeMs, lineIndex: firstLineIdx });
        }
      }
      // Zeile-level timecodes
      for (const zeile of strophe.zeilen) {
        const zeileTimecode = zeile.markups.find(
          (m) => m.typ === "TIMECODE" && m.timecodeMs != null
        );
        if (zeileTimecode?.timecodeMs != null) {
          const lineIdx = flatLines.findIndex((fl) => fl.zeileId === zeile.id);
          if (lineIdx >= 0) {
            entries.push({ timeMs: zeileTimecode.timecodeMs, lineIndex: lineIdx });
          }
        }
      }
    }
    return entries.sort((a, b) => a.timeMs - b.timeMs);
  }, [song, flatLines]);

  // --- Cleanup on unmount ---
  useEffect(() => {
    return () => {
      stopAllMedia();
      workerRef.current?.terminate();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Escape key handler ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onZurueck();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onZurueck]);

  // --- Timecode sync during recording ---
  useEffect(() => {
    if (zustand !== "AUFNAHME" || !audioRef.current || timecodeMap.length === 0) {
      if (timecodeIntervalRef.current) {
        clearInterval(timecodeIntervalRef.current);
        timecodeIntervalRef.current = null;
      }
      return;
    }

    timecodeIntervalRef.current = setInterval(() => {
      const audio = audioRef.current;
      if (!audio) return;
      const currentMs = audio.currentTime * 1000;

      // Find the last timecode entry that has been passed,
      // applying a 1.5s lookahead so the stanza switches early
      // and the user has time to read the upcoming text.
      let targetIdx = 0;
      for (const entry of timecodeMap) {
        if (currentMs >= entry.timeMs - STROPHE_VORLAUF_MS) {
          targetIdx = entry.lineIndex;
        } else {
          break;
        }
      }
      setActiveLineIndex(targetIdx);
    }, 100);

    return () => {
      if (timecodeIntervalRef.current) {
        clearInterval(timecodeIntervalRef.current);
        timecodeIntervalRef.current = null;
      }
    };
  }, [zustand, timecodeMap]);

  // --- Helper: stop all media ---
  function stopAllMedia() {
    // Stop audio playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    // Stop microphone stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    // Stop script processor
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    // Clear analyser
    analyserRef.current = null;
    setAnalyserNode(null);
    // Clear gain node
    gainNodeRef.current = null;
    // Clear timecode interval
    if (timecodeIntervalRef.current) {
      clearInterval(timecodeIntervalRef.current);
      timecodeIntervalRef.current = null;
    }
  }

  // --- Start recording ---
  const handleStart = useCallback(async () => {
    setFehler(null);
    setWarnungWenigGesang(false);

    // Request microphone permission
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 44100,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          ...(selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : {}),
        },
      });
    } catch (err) {
      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setFehler(
            "Mikrofon-Berechtigung wurde verweigert. Bitte erlaube den Zugriff auf das Mikrofon in den Browser-Einstellungen."
          );
          return;
        }
        if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          setFehler(
            "Kein Mikrofon gefunden. Bitte schließe ein Mikrofon an und versuche es erneut."
          );
          return;
        }
      }
      setFehler("Fehler beim Zugriff auf das Mikrofon.");
      return;
    }

    mediaStreamRef.current = stream;

    // Measure latency
    try {
      latenzRef.current = await messeLatenz();
    } catch {
      latenzRef.current = 0;
    }

    // Set up raw audio capture via ScriptProcessorNode
    rawSamplesRef.current = [];
    setSampleCount(0);
    const audioContext = new AudioContext({ sampleRate: 44100 });
    audioContextRef.current = audioContext;
    const source = audioContext.createMediaStreamSource(stream);

    // Create GainNode for mic input level control
    const gainNode = audioContext.createGain();
    gainNode.gain.value = gainWert;
    gainNodeRef.current = gainNode;
    source.connect(gainNode);

    // Use 4096 buffer size for reasonable capture granularity
    const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
    scriptProcessorRef.current = scriptProcessor;

    scriptProcessor.onaudioprocess = (event) => {
      const inputData = event.inputBuffer.getChannelData(0);
      rawSamplesRef.current.push(new Float32Array(inputData));
      setSampleCount((prev) => prev + inputData.length);
    };

    gainNode.connect(scriptProcessor);
    scriptProcessor.connect(audioContext.destination);

    // Create AnalyserNode for VU meter
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    gainNode.connect(analyser);
    analyserRef.current = analyser;
    setAnalyserNode(analyser);

    // Create and start audio element for instrumental
    const audio = new Audio(instrumentalUrl);
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;

    // When instrumental ends, stop recording
    audio.addEventListener("ended", () => {
      handleStopRef.current();
    });

    try {
      await audio.play();
    } catch {
      setFehler("Fehler beim Abspielen des Instrumentals.");
      stopAllMedia();
      return;
    }

    setActiveLineIndex(0);
    setZustand("AUFNAHME");
  }, [instrumentalUrl, selectedDeviceId, gainWert]);

  // --- Stop recording ---
  const handleStop = useCallback(() => {
    // Gather raw samples
    const chunks = rawSamplesRef.current;
    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const audioBuffer = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      audioBuffer.set(chunk, offset);
      offset += chunk.length;
    }
    rawSamplesRef.current = [];

    // Debug: log captured audio stats
    let maxAbs = 0;
    for (let i = 0; i < audioBuffer.length; i++) {
      const abs = Math.abs(audioBuffer[i]);
      if (abs > maxAbs) maxAbs = abs;
    }
    console.log(
      `[VocalTrainer] Aufnahme gestoppt: ${totalLength} Samples (${(totalLength / 44100).toFixed(1)}s), ` +
      `Peak: ${maxAbs.toFixed(4)}, Chunks: ${chunks.length}`
    );

    stopAllMedia();

    // Apply latency compensation
    const sampleRate = 44100;
    const kompensierterBuffer = kompensiere(audioBuffer, latenzRef.current, sampleRate);

    setZustand("ANALYSE");
    setFortschritt(0);

    // Start analysis worker
    const worker = new Worker(
      new URL("@/lib/vocal-trainer/analyse-worker.ts", import.meta.url)
    );
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const msg = event.data;

      if (msg.type === "FORTSCHRITT") {
        setFortschritt(msg.fortschritt ?? 0);
      } else if (msg.type === "ERGEBNIS" && msg.ergebnis) {
        // Check for low voiced frame ratio
        const totalFrames = referenzDaten.frames.length;
        // Use nutzerKurve length as proxy for user voiced frames
        const nutzerVoicedCount = msg.ergebnis.nutzerKurve.length;
        if (totalFrames > 0 && nutzerVoicedCount / totalFrames < MIN_VOICED_RATIO) {
          setWarnungWenigGesang(true);
        }

        setErgebnis(msg.ergebnis);
        setZustand("ERGEBNIS");
        worker.terminate();
        workerRef.current = null;

        // Save session (fire-and-forget)
        fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            songId: song.id,
            lernmethode: "VOCAL_TRAINER",
            score: msg.ergebnis.gesamtScore,
          }),
        }).catch(() => {
          // Session save failed silently — results are still shown
        });
      } else if (msg.type === "FEHLER") {
        setFehler(msg.fehler ?? "Fehler bei der Analyse.");
        setZustand("BEREIT");
        worker.terminate();
        workerRef.current = null;
      }
    };

    worker.onerror = () => {
      setFehler("Fehler bei der Analyse. Bitte versuche es erneut.");
      setZustand("BEREIT");
      worker.terminate();
      workerRef.current = null;
    };

    worker.postMessage({
      type: "ANALYSE",
      audioBuffer: kompensierterBuffer,
      sampleRate,
      referenzDaten,
      latenzMs: latenzRef.current,
    });
  }, [referenzDaten, song.id]);

  // Keep ref in sync so the audio "ended" listener always calls the latest handleStop
  handleStopRef.current = handleStop;

  // --- Cancel recording ---
  const handleAbbrechen = useCallback(() => {
    rawSamplesRef.current = [];
    stopAllMedia();
    setZustand("BEREIT");
    setActiveLineIndex(0);
  }, []);

  // --- New recording ---
  const handleNeueAufnahme = useCallback(() => {
    setErgebnis(null);
    setFehler(null);
    setWarnungWenigGesang(false);
    setFortschritt(0);
    setActiveLineIndex(0);
    setZustand("BEREIT");
  }, []);

  // --- Kopfhörer bestätigt ---
  const handleKopfhoererBestaetigt = useCallback(() => {
    setKopfhoererBestaetigt(true);
  }, []);

  // --- Render ---
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-gradient-to-b from-neutral-900 via-neutral-800 to-neutral-900">
      {/* aria-live region for state changes */}
      <div aria-live="polite" className="sr-only">
        {ZUSTAND_LABELS[zustand]}
      </div>

      {/* Kopfhörer-Hinweis (shown once) */}
      {!kopfhoererBestaetigt && zustand === "BEREIT" && (
        <KopfhoererHinweis onBestaetigt={handleKopfhoererBestaetigt} />
      )}

      {/* Top bar: Back button */}
      <div className="flex items-center justify-between px-4 py-3">
        <ZurueckButton onBack={onZurueck} />
        {zustand === "AUFNAHME" && activeLine && (
          <StrophenTitel name={activeLine.stropheName} />
        )}
        <div className="min-w-[44px]" aria-hidden="true" />
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        {/* Error display */}
        {fehler && (
          <div
            role="alert"
            className="mb-4 max-w-md rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {fehler}
          </div>
        )}

        {/* Low voice warning */}
        {warnungWenigGesang && zustand === "ERGEBNIS" && (
          <div
            role="alert"
            className="mb-4 max-w-md rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800"
          >
            Die Aufnahme enthält weniger als 20% stimmaktive Frames. Versuche es
            erneut und singe lauter oder näher am Mikrofon.
          </div>
        )}

        {/* BEREIT state */}
        {zustand === "BEREIT" && (
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-xl font-semibold text-white">
              Vocal Trainer
            </h1>
            <p className="text-sm italic text-white/40">
              Mic … Check … One … Two …
            </p>
            <p className="max-w-sm text-center text-sm text-white/70">
              Starte die Aufnahme, um deinen Gesang mit der Referenz zu
              vergleichen. Das Instrumental wird automatisch abgespielt.
            </p>
            {song.strophen.length === 0 && (
              <p className="text-sm text-yellow-400">
                Keine Texte vorhanden.
              </p>
            )}
            {audioDevices.length > 1 && (
              <div className="w-full max-w-xs">
                <label
                  htmlFor="mic-select"
                  className="mb-1 block text-xs text-white/60"
                >
                  Mikrofon
                </label>
                <select
                  id="mic-select"
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="w-full rounded-md border border-white/20 bg-neutral-800 px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  {audioDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Mikrofon (${d.deviceId.slice(0, 8)}…)`}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="w-full max-w-xs">
              <label
                htmlFor="gain-slider"
                className="mb-1 block text-xs text-white/60"
              >
                Mikrofon-Gain: {Math.round(gainWert * 100)}%
              </label>
              <input
                id="gain-slider"
                type="range"
                min={0}
                max={3}
                step={0.05}
                value={gainWert}
                onChange={(e) => setGainWert(parseFloat(e.target.value))}
                className="w-full accent-primary-500"
                aria-label={`Mikrofon-Gain: ${Math.round(gainWert * 100)} Prozent`}
              />
            </div>
            <AufnahmeControls
              zustand={zustand}
              onStart={handleStart}
              onStop={handleStop}
              onAbbrechen={handleAbbrechen}
              onNeueAufnahme={handleNeueAufnahme}
              disabled={!kopfhoererBestaetigt}
            />
          </div>
        )}

        {/* AUFNAHME state: Karaoke text display */}
        {zustand === "AUFNAHME" && (
          <div className="flex w-full max-w-2xl flex-1 flex-col items-center justify-center">
            {displayMode !== "keinText" && (
              <TextAnzeige
                flatLines={flatLines}
                activeLineIndex={activeLineIndex}
                displayMode={displayMode}
                song={song}
                showVocalTags={showVocalTags}
                tagDefinitions={tagDefinitions}
              />
            )}
            <div className="mt-4 flex flex-col items-center gap-2">
              <ModusUmschalter
                activeMode={displayMode}
                onChange={setDisplayMode}
                showKeinText
              />
              <label className="flex items-center gap-1.5 text-xs text-white/60">
                <input
                  type="checkbox"
                  checked={showVocalTags}
                  onChange={(e) => setShowVocalTags(e.target.checked)}
                  className="accent-primary-500"
                />
                Vocal Tags
              </label>
              <VuMeter analyser={analyserNode} active={zustand === "AUFNAHME"} />
              <div className="flex w-48 items-center gap-2">
                <label htmlFor="gain-slider-rec" className="text-xs text-white/40">
                  Gain
                </label>
                <input
                  id="gain-slider-rec"
                  type="range"
                  min={0}
                  max={3}
                  step={0.05}
                  value={gainWert}
                  onChange={(e) => setGainWert(parseFloat(e.target.value))}
                  className="flex-1 accent-primary-500"
                  aria-label={`Mikrofon-Gain: ${Math.round(gainWert * 100)} Prozent`}
                />
                <span className="w-10 text-right text-xs text-white/40">
                  {Math.round(gainWert * 100)}%
                </span>
              </div>
              <p className="text-xs text-white/40">
                {(sampleCount / 44100).toFixed(1)}s aufgenommen
              </p>
            </div>
            <div className="mt-4">
              <AufnahmeControls
                zustand={zustand}
                onStart={handleStart}
                onStop={handleStop}
                onAbbrechen={handleAbbrechen}
                onNeueAufnahme={handleNeueAufnahme}
              />
            </div>
          </div>
        )}

        {/* ANALYSE state: Loading indicator */}
        {zustand === "ANALYSE" && (
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm font-medium text-white">
              Analyse läuft…
            </p>
            <div className="h-2 w-64 overflow-hidden rounded-full bg-neutral-700">
              <div
                className="h-full rounded-full bg-primary-500 transition-all duration-300"
                style={{ width: `${fortschritt}%` }}
                role="progressbar"
                aria-valuenow={fortschritt}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Analyse-Fortschritt: ${fortschritt} Prozent`}
              />
            </div>
            <p className="text-xs text-white/60">{fortschritt}%</p>
          </div>
        )}

        {/* ERGEBNIS state: Feedback view */}
        {zustand === "ERGEBNIS" && ergebnis && (
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-lg">
            <FeedbackAnsicht
              ergebnis={ergebnis}
              onNeueAufnahme={handleNeueAufnahme}
              onZurueck={onZurueck}
            />
          </div>
        )}
      </div>

      {/* Bottom bar: Song info during recording */}
      {zustand === "AUFNAHME" && (
        <div className="px-4 py-3">
          <SongInfo titel={song.titel} kuenstler={song.kuenstler} compact />
        </div>
      )}
    </div>
  );
}
