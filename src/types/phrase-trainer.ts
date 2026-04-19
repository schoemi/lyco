/** Zustände des Phrasen-Trainers */
export type PhrasenTrainerZustand = 'AUSWAHL' | 'BEREIT' | 'AUFNAHME' | 'WIEDERGABE';

/** Mixer-Zustand für die Wiedergabe */
export interface MixerZustand {
  istAbspielend: boolean;
  instrumentalLautstaerke: number;  // 0–1, initial 1.0
  aufnahmeLautstaerke: number;      // 0–1, initial 1.0
  referenzLautstaerke: number;      // 0–1, initial 0.7
  referenzAktiv: boolean;           // Toggle für Referenz-Vokalspur
  panningWert: number;              // 0–1, initial 0.5
}

/** Aufnahme-Daten */
export interface AufnahmeDaten {
  buffer: Float32Array;
  sampleRate: number;
  dauerMs: number;
}

/** Übungsbereich */
export interface Uebungsbereich {
  startMs: number;
  endMs: number;
}
