import { AudioQuelleResponse } from "@/types/audio";

// --- Beat-Methode ---

export type BeatMethode = 'AUTOMATISCH' | 'MANUELL';

// --- Worker-Messages ---

export interface BeatDetektorRequest {
  type: 'ANALYSE';
  audioBuffer: Float32Array;
  sampleRate: number;
  frequenzUntergrenze: number; // Hz
  frequenzObergrenze: number;  // Hz
}

export interface BeatDetektorResponse {
  type: 'ERGEBNIS' | 'FORTSCHRITT' | 'FEHLER';
  ergebnis?: BeatErgebnisLokal;
  fortschritt?: number;
  fehler?: string;
}

// --- Lokales Ergebnis aus dem Worker ---

export interface BeatErgebnisLokal {
  bpm: number;
  konfidenz: number; // 0–100
  beatPositionenMs: number[];
}

// --- API-Typen ---

export interface BeatErgebnisResponse {
  id: string;
  songId: string;
  bpm: number;
  methode: BeatMethode;
  konfidenz: number | null;
  beatPositionenMs: number[];
  frequenzUntergrenze: number | null;
  frequenzObergrenze: number | null;
  offsetMs: number;
  taktZaehler: number;
  taktNenner: number;
}

export interface BeatErgebnisSpeichernInput {
  bpm: number;
  methode: BeatMethode;
  konfidenz?: number | null;
  beatPositionenMs: number[];
  frequenzUntergrenze?: number | null;
  frequenzObergrenze?: number | null;
  offsetMs?: number;
  taktZaehler?: number;
  taktNenner?: number;
}

// --- Komponenten-Props ---

export interface BeatEinstellungenProps {
  songId: string;
  audioQuellen: AudioQuelleResponse[];
  initialBeatErgebnis: BeatErgebnisResponse | null;
  /** Current beat offset in milliseconds. */
  beatOffsetMs?: number;
  /** Called when the user changes the beat offset slider. */
  onBeatOffsetChange?: (offsetMs: number) => void;
  /** Called when a new BeatErgebnis is saved (auto or manual). */
  onBeatErgebnisChange?: (ergebnis: BeatErgebnisResponse) => void;
}

export interface BeatMarkerOverlayProps {
  beatPositionenMs: number[];
  durationMs: number;
  currentTimeMs: number;
}
