"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { MixerZustand } from "@/types/phrase-trainer";
import { berechnePanning } from "@/lib/phrase-trainer/utils";
import { SpurRegler } from "@/components/phrase-trainer/spur-regler";
import { PanningRegler } from "@/components/phrase-trainer/panning-regler";
import { WiedergabeControls } from "@/components/phrase-trainer/wiedergabe-controls";

interface WiedergabeMixerProps {
  aufnahmeBuffer: Float32Array;
  aufnahmeSampleRate: number;
  instrumentalUrl: string;
  referenzVokalUrl: string | null;
  startTimeMs: number;
  endTimeMs: number;
  onNeueAufnahme: () => void;
  onZurueckZurAuswahl: () => void;
}

/** Initial mixer state per design spec. */
const INITIAL_MIXER: MixerZustand = {
  istAbspielend: false,
  instrumentalLautstaerke: 1.0,
  aufnahmeLautstaerke: 1.0,
  referenzLautstaerke: 0.7,
  referenzAktiv: false,
  panningWert: 0.5,
};

/**
 * WiedergabeMixer — Three-channel playback mixer for the Phrasen-Trainer.
 *
 * Audio graph:
 * - Instrumental: HTMLAudioElement → MediaElementAudioSourceNode → GainNode → destination
 * - Recording:    AudioBufferSourceNode → GainNode → StereoPannerNode → destination
 * - Reference:    HTMLAudioElement → MediaElementAudioSourceNode → GainNode → StereoPannerNode → destination
 *
 * Constrains playback to the practice range (startTimeMs–endTimeMs) and auto-stops at end.
 */
export function WiedergabeMixer({
  aufnahmeBuffer,
  aufnahmeSampleRate,
  instrumentalUrl,
  referenzVokalUrl,
  startTimeMs,
  endTimeMs,
  onNeueAufnahme,
  onZurueckZurAuswahl,
}: WiedergabeMixerProps) {
  // --- Mixer state ---
  const [mixer, setMixer] = useState<MixerZustand>(INITIAL_MIXER);

  // --- Audio refs ---
  const audioContextRef = useRef<AudioContext | null>(null);

  // Instrumental chain
  const instrumentalAudioRef = useRef<HTMLAudioElement | null>(null);
  const instrumentalSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const instrumentalGainRef = useRef<GainNode | null>(null);

  // Recording chain
  const aufnahmeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const aufnahmeGainRef = useRef<GainNode | null>(null);
  const aufnahmePanRef = useRef<StereoPannerNode | null>(null);

  // Reference vocal chain
  const referenzAudioRef = useRef<HTMLAudioElement | null>(null);
  const referenzSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const referenzGainRef = useRef<GainNode | null>(null);
  const referenzPanRef = useRef<StereoPannerNode | null>(null);

  // Timecode polling
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Track whether we've connected the MediaElementAudioSourceNodes (can only connect once)
  const instrumentalConnectedRef = useRef(false);
  const referenzConnectedRef = useRef(false);

  // Stable ref for the latest handleStop to avoid stale closures in event listeners
  const handleStopRef = useRef<() => void>(() => {});

  // --- Cleanup helper ---
  const stopPlayback = useCallback(() => {
    // Stop polling
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    // Stop recording source (AudioBufferSourceNode is one-shot)
    if (aufnahmeSourceRef.current) {
      try {
        aufnahmeSourceRef.current.stop();
      } catch {
        // Already stopped — ignore
      }
      aufnahmeSourceRef.current.disconnect();
      aufnahmeSourceRef.current = null;
    }

    // Pause HTML audio elements (don't destroy — we reuse them)
    if (instrumentalAudioRef.current) {
      instrumentalAudioRef.current.pause();
    }
    if (referenzAudioRef.current) {
      referenzAudioRef.current.pause();
    }

    setMixer((prev) => ({ ...prev, istAbspielend: false }));
  }, []);

  // --- Full teardown (unmount) ---
  const teardown = useCallback(() => {
    stopPlayback();

    // Disconnect nodes
    instrumentalSourceRef.current?.disconnect();
    instrumentalGainRef.current?.disconnect();
    aufnahmeGainRef.current?.disconnect();
    aufnahmePanRef.current?.disconnect();
    referenzSourceRef.current?.disconnect();
    referenzGainRef.current?.disconnect();
    referenzPanRef.current?.disconnect();

    instrumentalSourceRef.current = null;
    instrumentalGainRef.current = null;
    aufnahmeGainRef.current = null;
    aufnahmePanRef.current = null;
    referenzSourceRef.current = null;
    referenzGainRef.current = null;
    referenzPanRef.current = null;

    instrumentalConnectedRef.current = false;
    referenzConnectedRef.current = false;

    // Remove audio elements
    if (instrumentalAudioRef.current) {
      instrumentalAudioRef.current.pause();
      instrumentalAudioRef.current.removeAttribute("src");
      instrumentalAudioRef.current = null;
    }
    if (referenzAudioRef.current) {
      referenzAudioRef.current.pause();
      referenzAudioRef.current.removeAttribute("src");
      referenzAudioRef.current = null;
    }

    // Close AudioContext
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, [stopPlayback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      teardown();
    };
  }, [teardown]);

  // --- Initialize AudioContext and audio graph on mount ---
  useEffect(() => {
    const ctx = new AudioContext();
    audioContextRef.current = ctx;

    // --- Instrumental chain ---
    const instAudio = new Audio(instrumentalUrl);
    instAudio.crossOrigin = "anonymous";
    instrumentalAudioRef.current = instAudio;

    const instSource = ctx.createMediaElementSource(instAudio);
    instrumentalSourceRef.current = instSource;
    instrumentalConnectedRef.current = true;

    const instGain = ctx.createGain();
    instGain.gain.value = INITIAL_MIXER.instrumentalLautstaerke;
    instrumentalGainRef.current = instGain;

    instSource.connect(instGain);
    instGain.connect(ctx.destination);

    // --- Recording chain (gain + panner, source created per play) ---
    const aufGain = ctx.createGain();
    aufGain.gain.value = INITIAL_MIXER.aufnahmeLautstaerke;
    aufnahmeGainRef.current = aufGain;

    const aufPan = ctx.createStereoPanner();
    aufPan.pan.value = 0; // Will be set based on panning + referenzAktiv
    aufnahmePanRef.current = aufPan;

    aufGain.connect(aufPan);
    aufPan.connect(ctx.destination);

    // --- Reference vocal chain (only if URL provided) ---
    if (referenzVokalUrl) {
      const refAudio = new Audio(referenzVokalUrl);
      refAudio.crossOrigin = "anonymous";
      referenzAudioRef.current = refAudio;

      const refSource = ctx.createMediaElementSource(refAudio);
      referenzSourceRef.current = refSource;
      referenzConnectedRef.current = true;

      const refGain = ctx.createGain();
      refGain.gain.value = INITIAL_MIXER.referenzLautstaerke;
      referenzGainRef.current = refGain;

      const refPan = ctx.createStereoPanner();
      refPan.pan.value = 0;
      referenzPanRef.current = refPan;

      refSource.connect(refGain);
      refGain.connect(refPan);
      refPan.connect(ctx.destination);
    }

    // Cleanup handled by teardown effect
    return () => {
      // Intentionally empty — teardown effect handles full cleanup
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // --- Sync gain values to live GainNodes ---
  useEffect(() => {
    if (instrumentalGainRef.current) {
      instrumentalGainRef.current.gain.value = mixer.instrumentalLautstaerke;
    }
  }, [mixer.instrumentalLautstaerke]);

  useEffect(() => {
    if (aufnahmeGainRef.current) {
      aufnahmeGainRef.current.gain.value = mixer.aufnahmeLautstaerke;
    }
  }, [mixer.aufnahmeLautstaerke]);

  useEffect(() => {
    if (referenzGainRef.current) {
      referenzGainRef.current.gain.value = mixer.referenzAktiv
        ? mixer.referenzLautstaerke
        : 0;
    }
  }, [mixer.referenzLautstaerke, mixer.referenzAktiv]);

  // --- Sync panning values ---
  useEffect(() => {
    const panning = mixer.referenzAktiv
      ? berechnePanning(mixer.panningWert)
      : { aufnahme: 0, referenz: 0 };

    if (aufnahmePanRef.current) {
      aufnahmePanRef.current.pan.value = panning.aufnahme;
    }
    if (referenzPanRef.current) {
      referenzPanRef.current.pan.value = panning.referenz;
    }
  }, [mixer.panningWert, mixer.referenzAktiv]);

  // --- Start/stop reference vocal when toggled during playback ---
  useEffect(() => {
    const refAudio = referenzAudioRef.current;
    const instAudio = instrumentalAudioRef.current;
    if (!refAudio || !instAudio || !mixer.istAbspielend) return;

    if (mixer.referenzAktiv) {
      // Sync reference to current instrumental position and start
      refAudio.currentTime = instAudio.currentTime;
      refAudio.play().catch(() => {
        // Reference playback failed — continue without it
      });
    } else {
      // Pause reference when deactivated
      refAudio.pause();
    }
  }, [mixer.referenzAktiv, mixer.istAbspielend]);

  // --- Handle stop (stable ref for event listeners) ---
  const handleStop = useCallback(() => {
    stopPlayback();
  }, [stopPlayback]);

  useEffect(() => {
    handleStopRef.current = handleStop;
  }, [handleStop]);

  // --- Start playback ---
  const startPlayback = useCallback(async () => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    // Resume AudioContext if suspended (browser autoplay policy)
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    const startTimeSec = startTimeMs / 1000;

    // --- Instrumental: seek and play ---
    const instAudio = instrumentalAudioRef.current;
    if (instAudio) {
      instAudio.currentTime = startTimeSec;
      try {
        await instAudio.play();
      } catch {
        // Playback failed — stop everything
        handleStopRef.current();
        return;
      }
    }

    // --- Recording: create a new AudioBufferSourceNode each time ---
    if (aufnahmeGainRef.current) {
      const audioBuffer = ctx.createBuffer(
        1, // mono
        aufnahmeBuffer.length,
        aufnahmeSampleRate,
      );
      audioBuffer.getChannelData(0).set(aufnahmeBuffer);

      const bufferSource = ctx.createBufferSource();
      bufferSource.buffer = audioBuffer;
      bufferSource.connect(aufnahmeGainRef.current);
      aufnahmeSourceRef.current = bufferSource;

      bufferSource.start(0);
    }

    // --- Reference vocal: seek and play (only if active) ---
    const refAudio = referenzAudioRef.current;
    if (refAudio && mixer.referenzAktiv) {
      refAudio.currentTime = startTimeSec;
      try {
        await refAudio.play();
      } catch {
        // Reference playback failed — continue without it
      }
    }

    setMixer((prev) => ({ ...prev, istAbspielend: true }));

    // --- Poll for end-of-range auto-stop ---
    pollIntervalRef.current = setInterval(() => {
      const audio = instrumentalAudioRef.current;
      if (!audio) return;
      const currentMs = audio.currentTime * 1000;
      if (currentMs >= endTimeMs) {
        handleStopRef.current();
      }
    }, 100);
  }, [
    startTimeMs,
    endTimeMs,
    aufnahmeBuffer,
    aufnahmeSampleRate,
    mixer.referenzAktiv,
  ]);

  // --- Play / Pause toggle ---
  const handlePlayPause = useCallback(async () => {
    if (mixer.istAbspielend) {
      // Pause all
      stopPlayback();
    } else {
      await startPlayback();
    }
  }, [mixer.istAbspielend, stopPlayback, startPlayback]);

  // --- Mixer state updaters ---
  const handleInstrumentalLautstaerke = useCallback((wert: number) => {
    setMixer((prev) => ({ ...prev, instrumentalLautstaerke: wert }));
  }, []);

  const handleAufnahmeLautstaerke = useCallback((wert: number) => {
    setMixer((prev) => ({ ...prev, aufnahmeLautstaerke: wert }));
  }, []);

  const handleReferenzLautstaerke = useCallback((wert: number) => {
    setMixer((prev) => ({ ...prev, referenzLautstaerke: wert }));
  }, []);

  const handleReferenzToggle = useCallback(() => {
    setMixer((prev) => {
      const neuerWert = !prev.referenzAktiv;
      if (!neuerWert) {
        // Deactivating reference: reset panning to center
        return {
          ...prev,
          referenzAktiv: false,
          panningWert: 0.5,
        };
      }
      return { ...prev, referenzAktiv: true };
    });
  }, []);

  const handlePanningAendern = useCallback((wert: number) => {
    setMixer((prev) => ({ ...prev, panningWert: wert }));
  }, []);

  const hatReferenz = referenzVokalUrl !== null;

  return (
    <div className="flex w-full flex-1 flex-col items-center gap-6">
      {/* Playback controls */}
      <WiedergabeControls
        istAbspielend={mixer.istAbspielend}
        onPlayPause={handlePlayPause}
        onStop={handleStop}
      />

      {/* Track volume sliders */}
      <div className="flex w-full max-w-md flex-col gap-3">
        <SpurRegler
          label="Instrumental"
          lautstaerke={mixer.instrumentalLautstaerke}
          onLautstaerkeAendern={handleInstrumentalLautstaerke}
        />

        <SpurRegler
          label="Aufnahme"
          lautstaerke={mixer.aufnahmeLautstaerke}
          onLautstaerkeAendern={handleAufnahmeLautstaerke}
        />

        {hatReferenz && (
          <>
            <div className="flex items-center gap-2">
              <SpurRegler
                label="Referenz-Vokal"
                lautstaerke={mixer.referenzLautstaerke}
                onLautstaerkeAendern={handleReferenzLautstaerke}
                deaktiviert={!mixer.referenzAktiv}
              />
            </div>

            {/* Reference vocal toggle */}
            <div className="flex items-center gap-2">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-white/60">
                <input
                  type="checkbox"
                  checked={mixer.referenzAktiv}
                  onChange={handleReferenzToggle}
                  className="accent-primary-500"
                  aria-label="Referenz-Vokal aktivieren"
                />
                Referenz-Vokal
              </label>
            </div>
          </>
        )}

        {/* Panning slider — visible only when reference is active */}
        <PanningRegler
          wert={mixer.panningWert}
          onWertAendern={handlePanningAendern}
          sichtbar={hatReferenz && mixer.referenzAktiv}
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onNeueAufnahme}
          aria-label="Neue Aufnahme"
          className="min-h-[44px] min-w-[44px] rounded bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Neue Aufnahme
        </button>
        <button
          type="button"
          onClick={onZurueckZurAuswahl}
          aria-label="Zurück zur Auswahl"
          className="min-h-[44px] min-w-[44px] rounded border border-neutral-300 px-5 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Zurück zur Auswahl
        </button>
      </div>
    </div>
  );
}
