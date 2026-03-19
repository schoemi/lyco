export type AufnahmeZustand = 'BEREIT' | 'AUFNAHME' | 'ANALYSE' | 'ERGEBNIS';

export interface ReferenzFrame {
  timestampMs: number;
  f0Hz: number;
  midiValue: number;
  isVoiced: boolean;
  isOnset: boolean;
}

export interface ReferenzDaten {
  songId: string;
  sampleRate: number;
  windowSize: number;
  frames: ReferenzFrame[];
}

export interface PitchFrame {
  timestampMs: number;
  f0Hz: number;
  midiValue: number;
  isVoiced: boolean;
  confidence: number;
}

export interface AnalyseErgebnis {
  pitchScore: number;
  timingScore: number;
  gesamtScore: number;
  referenzKurve: { timestampMs: number; midiValue: number }[];
  nutzerKurve: { timestampMs: number; midiValue: number; abweichungCents: number }[];
}

export interface WorkerRequest {
  type: 'ANALYSE';
  audioBuffer: Float32Array;
  sampleRate: number;
  referenzDaten: ReferenzDaten;
  latenzMs: number;
}

export interface WorkerResponse {
  type: 'ERGEBNIS' | 'FORTSCHRITT' | 'FEHLER';
  ergebnis?: AnalyseErgebnis;
  fortschritt?: number;
  fehler?: string;
}
