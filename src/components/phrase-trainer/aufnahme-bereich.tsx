"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { SongDetail } from "@/types/song";
import type { FlatLine, DisplayMode } from "@/types/karaoke";
import { flattenLines } from "@/lib/karaoke/flatten-lines";
import { berechneUebungsbereich } from "@/lib/phrase-trainer/uebungsbereich";
import { messeLatenz, kompensiere } from "@/lib/vocal-trainer/latenz";
import { TextAnzeige } from "@/components/karaoke/text-anzeige";
import { StrophenTitel } from "@/components/karaoke/strophen-titel";
import { VuMeter } from "@/components/vocal-trainer/vu-meter";
import { AufnahmeControlsPT } from "@/components/phrase-trainer/aufnahme-controls-pt";

/** Advance stanza switch 1.5 seconds before the timecode marker. */
const STROPHE_VORLAUF_MS = 1500;

interface AufnahmeBereichProps {
  song: SongDetail;
  ausgewaehlteStrophenIds: Set<string>;
  instrumentalUrl: string;
  selectedDeviceId: string;
  gainWert: number;
  onAufnahmeAbgeschlossen: (buffer: Float32Array, sampleRate: number) => void;
  onAbbrechen: () => void;
}

/**
 * AufnahmeBereich — Recording area for the Phrasen-Trainer.
 *
 * Plays the instrumental from the start timecode of the first selected strophe,
 * records the microphone in mono 44.1 kHz (no echo cancellation, no noise
 * suppression, no AGC), measures and compensates latency, auto-stops at the
 * end timecode, and shows synced karaoke text and a VU meter.
 */
export function AufnahmeBereich({
  song,
  ausgewaehlteStrophenIds,
  instrumentalUrl,
  selectedDeviceId,
  gainWert,
  onAufnahmeAbgeschlossen,
  onAbbrechen,
}: AufnahmeBereichProps) {
  // --- State ---
  const [istAufnahme, setIstAufnahme] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [activeLineIndex, setActiveLineIndex] = useState(0);

  // --- Refs ---
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rawSamplesRef = useRef<Float32Array[]>([]);
  const latenzRef = useRef<number>(0);
  const timecodeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const handleStopRef = useRef<() => void>(() => {});
  const uebungsbereichRef = useRef({ startMs: 0, endMs: 0 });

  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);

  // --- Derived data ---
  const flatLines: FlatLine[] = useMemo(() => flattenLines(song), [song]);

  // Calculate practice range
  const uebungsbereich = useMemo(() => {
    // Use a large default duration; the parent should provide the actual instrumental duration
    // but we approximate with a generous fallback
    return berechneUebungsbereich(
      song.strophen,
      ausgewaehlteStrophenIds,
      Number.MAX_SAFE_INTEGER,
    );
  }, [song.strophen, ausgewaehlteStrophenIds]);

  // Keep ref in sync for use in event handlers
  useEffect(() => {
    uebungsbereichRef.current = uebungsbereich;
  }, [uebungsbereich]);

  // Build timecode map for karaoke sync
  const timecodeMap = useMemo(() => {
    const entries: { timeMs: number; lineIndex: number }[] = [];
    for (const strophe of song.strophen) {
      const stropheTimecode = strophe.markups.find(
        (m) => m.typ === "TIMECODE" && m.ziel === "STROPHE" && m.timecodeMs != null,
      );
      if (stropheTimecode?.timecodeMs != null) {
        const firstLineIdx = flatLines.findIndex(
          (fl) => fl.stropheId === strophe.id,
        );
        if (firstLineIdx >= 0) {
          entries.push({ timeMs: stropheTimecode.timecodeMs, lineIndex: firstLineIdx });
        }
      }
      for (const zeile of strophe.zeilen) {
        const zeileTimecode = zeile.markups.find(
          (m) => m.typ === "TIMECODE" && m.timecodeMs != null,
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

  // --- Sync gain value to live GainNode ---
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = gainWert;
    }
  }, [gainWert]);

  // --- Helper: stop all media ---
  const stopAllMedia = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAnalyserNode(null);
    gainNodeRef.current = null;
    if (timecodeIntervalRef.current) {
      clearInterval(timecodeIntervalRef.current);
      timecodeIntervalRef.current = null;
    }
  }, []);

  // --- Cleanup on unmount ---
  useEffect(() => {
    return () => {
      stopAllMedia();
    };
  }, [stopAllMedia]);

  // --- Stop recording (finalize and deliver buffer) ---
  const handleStop = useCallback(() => {
    const chunks = rawSamplesRef.current;
    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const audioBuffer = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      audioBuffer.set(chunk, offset);
      offset += chunk.length;
    }
    rawSamplesRef.current = [];

    stopAllMedia();
    setIstAufnahme(false);

    // Apply latency compensation
    const sampleRate = 44100;
    const kompensierterBuffer = kompensiere(audioBuffer, latenzRef.current, sampleRate);

    onAufnahmeAbgeschlossen(kompensierterBuffer, sampleRate);
  }, [stopAllMedia, onAufnahmeAbgeschlossen]);

  // Keep ref in sync so event listeners always call the latest handleStop
  handleStopRef.current = handleStop;

  // --- Timecode sync during recording ---
  useEffect(() => {
    if (!istAufnahme || !audioRef.current || timecodeMap.length === 0) {
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

      // Auto-stop at end timecode
      const { endMs } = uebungsbereichRef.current;
      if (endMs > 0 && endMs < Number.MAX_SAFE_INTEGER && currentMs >= endMs) {
        handleStopRef.current();
        return;
      }

      // Find the last timecode entry that has been passed,
      // applying a 1.5s lookahead so the stanza switches early
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
  }, [istAufnahme, timecodeMap]);

  // --- Start recording ---
  const handleStart = useCallback(async () => {
    setFehler(null);

    // Request microphone
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
            "Mikrofon-Berechtigung wurde verweigert. Bitte erlaube den Zugriff in den Browser-Einstellungen.",
          );
          return;
        }
        if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          setFehler(
            "Kein Mikrofon gefunden. Bitte schließe ein Mikrofon an und versuche es erneut.",
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

    // Set up AudioContext and capture chain
    rawSamplesRef.current = [];
    const audioContext = new AudioContext({ sampleRate: 44100 });
    audioContextRef.current = audioContext;
    const source = audioContext.createMediaStreamSource(stream);

    // GainNode for mic input level
    const gainNode = audioContext.createGain();
    gainNode.gain.value = gainWert;
    gainNodeRef.current = gainNode;
    source.connect(gainNode);

    // ScriptProcessorNode for raw audio capture (4096 buffer)
    const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
    scriptProcessorRef.current = scriptProcessor;

    scriptProcessor.onaudioprocess = (event) => {
      const inputData = event.inputBuffer.getChannelData(0);
      rawSamplesRef.current.push(new Float32Array(inputData));
    };

    gainNode.connect(scriptProcessor);
    scriptProcessor.connect(audioContext.destination);

    // AnalyserNode for VU meter
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    gainNode.connect(analyser);
    analyserRef.current = analyser;
    setAnalyserNode(analyser);

    // Create and start instrumental playback from start timecode
    const audio = new Audio(instrumentalUrl);
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;

    // Seek to start timecode
    const startTimeSec = uebungsbereich.startMs / 1000;
    audio.currentTime = startTimeSec;

    // Auto-stop when instrumental ends
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

    // Set initial active line based on start timecode
    let initialLineIdx = 0;
    for (const entry of timecodeMap) {
      if (uebungsbereich.startMs >= entry.timeMs - STROPHE_VORLAUF_MS) {
        initialLineIdx = entry.lineIndex;
      } else {
        break;
      }
    }
    setActiveLineIndex(initialLineIdx);
    setIstAufnahme(true);
  }, [
    instrumentalUrl,
    selectedDeviceId,
    gainWert,
    uebungsbereich,
    timecodeMap,
    stopAllMedia,
  ]);

  // --- Cancel recording ---
  const handleAbbrechen = useCallback(() => {
    rawSamplesRef.current = [];
    stopAllMedia();
    setIstAufnahme(false);
    onAbbrechen();
  }, [stopAllMedia, onAbbrechen]);

  const activeLine = flatLines[activeLineIndex];

  // Determine the zustand for AufnahmeControlsPT
  const controlsZustand = istAufnahme ? "AUFNAHME" as const : "BEREIT" as const;

  return (
    <div className="flex w-full flex-1 flex-col items-center">
      {/* Error display */}
      {fehler && (
        <div
          role="alert"
          className="mb-4 max-w-md rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {fehler}
        </div>
      )}

      {/* Strophe title during recording */}
      {istAufnahme && activeLine && (
        <div className="mb-2">
          <StrophenTitel name={activeLine.stropheName} />
        </div>
      )}

      {/* Karaoke text display */}
      {istAufnahme && (
        <div className="flex w-full flex-1 flex-col items-center justify-center px-4">
          <TextAnzeige
            flatLines={flatLines}
            activeLineIndex={activeLineIndex}
            displayMode={"strophe" as DisplayMode}
            song={song}
          />
        </div>
      )}

      {/* VU meter and controls */}
      <div className="mt-4 flex flex-col items-center gap-3">
        {istAufnahme && (
          <VuMeter analyser={analyserNode} active={istAufnahme} />
        )}

        <AufnahmeControlsPT
          zustand={controlsZustand}
          onStart={handleStart}
          onStop={handleStop}
          onAbbrechen={handleAbbrechen}
        />
      </div>
    </div>
  );
}
