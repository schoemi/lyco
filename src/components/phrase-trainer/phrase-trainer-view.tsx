"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { SongDetail } from "@/types/song";
import type { PhrasenTrainerZustand } from "@/types/phrase-trainer";
import { findeInstrumental, findeReferenzVokal, hatTimecode } from "@/lib/phrase-trainer/utils";
import { berechneUebungsbereich } from "@/lib/phrase-trainer/uebungsbereich";
import { KopfhoererHinweis } from "@/components/vocal-trainer/kopfhoerer-hinweis";
import { SongInfo } from "@/components/karaoke/song-info";
import { ZurueckButton } from "@/components/karaoke/zurueck-button";
import { StrophenAuswahl } from "@/components/phrase-trainer/strophen-auswahl";
import { AufnahmeBereich } from "@/components/phrase-trainer/aufnahme-bereich";
import { WiedergabeMixer } from "@/components/phrase-trainer/wiedergabe-mixer";
import { GeraeteAuswahl } from "@/components/phrase-trainer/geraete-auswahl";
import { GainRegler } from "@/components/phrase-trainer/gain-regler";

interface PhraseTrainerViewProps {
  song: SongDetail;
  onZurueck: () => void;
}

/** Status labels for aria-live announcements. */
const ZUSTAND_LABELS: Record<PhrasenTrainerZustand, string> = {
  AUSWAHL: "Strophenauswahl",
  BEREIT: "Bereit für die Aufnahme",
  AUFNAHME: "Aufnahme läuft",
  WIEDERGABE: "Wiedergabe",
};

/**
 * PhraseTrainerView — Main component for the Phrasen-Trainer.
 *
 * Implements the state machine: AUSWAHL → BEREIT → AUFNAHME → WIEDERGABE
 * Coordinates StrophenAuswahl, AufnahmeBereich, WiedergabeMixer,
 * GeraeteAuswahl, and GainRegler.
 *
 * Requirements: 3.1, 3.2, 3.3, 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.4,
 *               11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7
 */
export function PhraseTrainerView({ song, onZurueck }: PhraseTrainerViewProps) {
  // --- State machine ---
  const [zustand, setZustand] = useState<PhrasenTrainerZustand>("AUSWAHL");

  // --- Kopfhörer confirmation (session-based, reused from vocal-trainer) ---
  const [kopfhoererBestaetigt, setKopfhoererBestaetigt] = useState(false);

  // --- Strophen selection (preserved between practice rounds) ---
  const [ausgewaehlteIds, setAusgewaehlteIds] = useState<Set<string>>(new Set());

  // --- Recording data ---
  const [aufnahmeBuffer, setAufnahmeBuffer] = useState<Float32Array | null>(null);
  const [aufnahmeSampleRate, setAufnahmeSampleRate] = useState(44100);

  // --- Audio device selection ---
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");

  // --- Mic gain (0–3, initial 1.0 = 100%) ---
  const [gainWert, setGainWert] = useState(1.0);

  // --- Derived data ---
  const instrumental = useMemo(
    () => findeInstrumental(song.audioQuellen),
    [song.audioQuellen],
  );
  const referenzVokal = useMemo(
    () => findeReferenzVokal(song.audioQuellen),
    [song.audioQuellen],
  );

  const instrumentalUrl = instrumental?.url ?? null;
  const referenzVokalUrl = referenzVokal?.url ?? null;

  // Check if any stanza has a timecode
  const hatStrophenMitTimecode = useMemo(
    () => song.strophen.some((s) => !s.istInstrumental && hatTimecode(s)),
    [song.strophen],
  );

  // Calculate practice range
  const uebungsbereich = useMemo(() => {
    if (ausgewaehlteIds.size === 0) return { startMs: 0, endMs: 0 };
    return berechneUebungsbereich(
      song.strophen,
      ausgewaehlteIds,
      Number.MAX_SAFE_INTEGER,
    );
  }, [song.strophen, ausgewaehlteIds]);

  // --- Enumerate audio devices after headphone confirmation ---
  useEffect(() => {
    let cancelled = false;

    async function enumerateDevices() {
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        tempStream.getTracks().forEach((t) => t.stop());

        const devices = await navigator.mediaDevices.enumerateDevices();
        if (cancelled) return;
        const inputs = devices.filter((d) => d.kind === "audioinput");
        setAudioDevices(inputs);
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

  // --- Kopfhörer bestätigt ---
  const handleKopfhoererBestaetigt = useCallback(() => {
    setKopfhoererBestaetigt(true);
  }, []);

  // --- State transitions ---

  // AUSWAHL → BEREIT: User selected stanzas and clicked Start
  const handleStarten = useCallback(() => {
    if (ausgewaehlteIds.size === 0) return;
    setZustand("BEREIT");
  }, [ausgewaehlteIds]);

  // BEREIT → AUFNAHME is handled internally by AufnahmeBereich
  // We transition to BEREIT and AufnahmeBereich handles the recording start

  // AUFNAHME → WIEDERGABE: Recording completed
  const handleAufnahmeAbgeschlossen = useCallback(
    (buffer: Float32Array, sampleRate: number) => {
      setAufnahmeBuffer(buffer);
      setAufnahmeSampleRate(sampleRate);
      setZustand("WIEDERGABE");
    },
    [],
  );

  // AUFNAHME → BEREIT: Recording cancelled
  const handleAufnahmeAbgebrochen = useCallback(() => {
    setAufnahmeBuffer(null);
    setZustand("BEREIT");
  }, []);

  // WIEDERGABE → BEREIT: New recording
  const handleNeueAufnahme = useCallback(() => {
    setAufnahmeBuffer(null);
    setZustand("BEREIT");
  }, []);

  // WIEDERGABE → AUSWAHL: Change stanza selection
  const handleZurueckZurAuswahl = useCallback(() => {
    setAufnahmeBuffer(null);
    setZustand("AUSWAHL");
  }, []);

  // --- Missing instrumental check ---
  const keinInstrumental = instrumentalUrl === null;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-gradient-to-b from-neutral-900 via-neutral-800 to-neutral-900">
      {/* aria-live region for state change announcements (Req 11.7) */}
      <div aria-live="polite" className="sr-only">
        {ZUSTAND_LABELS[zustand]}
      </div>

      {/* Kopfhörer-Hinweis dialog (Req 3.1, 3.2, 3.3) */}
      {!kopfhoererBestaetigt && (
        <KopfhoererHinweis onBestaetigt={handleKopfhoererBestaetigt} />
      )}

      {/* Top bar: Back button + Song info */}
      <div className="flex items-center justify-between px-4 py-3">
        <ZurueckButton onBack={onZurueck} />
        <SongInfo titel={song.titel} kuenstler={song.kuenstler} compact />
        <div className="min-w-[44px]" aria-hidden="true" />
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-y-auto px-4 pb-4">
        {/* Missing instrumental hint */}
        {keinInstrumental && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800"
          >
            Kein Instrumental vorhanden. Bitte füge eine Instrumental-Audioquelle
            hinzu, um den Phrasen-Trainer nutzen zu können.
          </div>
        )}

        {/* No stanzas with timecodes hint */}
        {!keinInstrumental && !hatStrophenMitTimecode && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800"
          >
            Keine Strophen mit Timecodes vorhanden. Bitte setze Timecodes für
            die Strophen, um den Phrasen-Trainer nutzen zu können.
          </div>
        )}

        {/* AUSWAHL state (Req 11.2) */}
        {zustand === "AUSWAHL" && !keinInstrumental && (
          <div className="mx-auto w-full max-w-md">
            <h1 className="mb-4 text-xl font-semibold text-white">
              Phrasen-Trainer
            </h1>
            <div className="rounded-lg bg-white p-4">
              <StrophenAuswahl
                strophen={song.strophen}
                ausgewaehlteIds={ausgewaehlteIds}
                onAuswahlAendern={setAusgewaehlteIds}
                onStarten={handleStarten}
              />
            </div>
          </div>
        )}

        {/* BEREIT state (Req 11.2) */}
        {zustand === "BEREIT" && !keinInstrumental && instrumentalUrl && (
          <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6">
            <h1 className="text-xl font-semibold text-white">
              Phrasen-Trainer
            </h1>
            <p className="text-sm text-white/70">
              Bereit für die Aufnahme. Starte die Aufnahme, um die ausgewählten
              Strophen einzusingen.
            </p>

            {/* Device selection (Req 8.1, 8.2, 8.3, 8.4) */}
            <GeraeteAuswahl
              geraete={audioDevices}
              ausgewaehltesGeraetId={selectedDeviceId}
              onGeraetAendern={setSelectedDeviceId}
              deaktiviert={false}
            />

            {/* Gain control (Req 9.1, 9.2, 9.3, 9.4) */}
            <div className="w-full max-w-xs">
              <GainRegler
                gainWert={gainWert}
                onGainAendern={setGainWert}
                deaktiviert={false}
              />
            </div>

            {/* AufnahmeBereich handles BEREIT → AUFNAHME → WIEDERGABE */}
            <AufnahmeBereich
              song={song}
              ausgewaehlteStrophenIds={ausgewaehlteIds}
              instrumentalUrl={instrumentalUrl}
              selectedDeviceId={selectedDeviceId}
              gainWert={gainWert}
              onAufnahmeAbgeschlossen={handleAufnahmeAbgeschlossen}
              onAbbrechen={handleAufnahmeAbgebrochen}
            />
          </div>
        )}

        {/* AUFNAHME state (Req 11.3) */}
        {zustand === "AUFNAHME" && !keinInstrumental && instrumentalUrl && (
          <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4">
            {/* Device selection disabled during recording (Req 8.4) */}
            <GeraeteAuswahl
              geraete={audioDevices}
              ausgewaehltesGeraetId={selectedDeviceId}
              onGeraetAendern={setSelectedDeviceId}
              deaktiviert={true}
            />

            {/* Gain control available during recording (Req 9.3) */}
            <div className="w-full max-w-xs">
              <GainRegler
                gainWert={gainWert}
                onGainAendern={setGainWert}
              />
            </div>

            <AufnahmeBereich
              song={song}
              ausgewaehlteStrophenIds={ausgewaehlteIds}
              instrumentalUrl={instrumentalUrl}
              selectedDeviceId={selectedDeviceId}
              gainWert={gainWert}
              onAufnahmeAbgeschlossen={handleAufnahmeAbgeschlossen}
              onAbbrechen={handleAufnahmeAbgebrochen}
            />
          </div>
        )}

        {/* WIEDERGABE state (Req 11.4, 11.5, 11.6) */}
        {zustand === "WIEDERGABE" &&
          aufnahmeBuffer &&
          instrumentalUrl && (
            <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4">
              <h2 className="text-lg font-semibold text-white">Wiedergabe</h2>
              <WiedergabeMixer
                aufnahmeBuffer={aufnahmeBuffer}
                aufnahmeSampleRate={aufnahmeSampleRate}
                instrumentalUrl={instrumentalUrl}
                referenzVokalUrl={referenzVokalUrl}
                startTimeMs={uebungsbereich.startMs}
                endTimeMs={uebungsbereich.endMs}
                onNeueAufnahme={handleNeueAufnahme}
                onZurueckZurAuswahl={handleZurueckZurAuswahl}
              />
            </div>
          )}
      </div>
    </div>
  );
}
