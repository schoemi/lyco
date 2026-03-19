// Hz → MIDI-Wert (A4 = 69, 440 Hz)
export function hzToMidi(hz: number): number {
  return 69 + 12 * Math.log2(hz / 440);
}

// MIDI → Hz
export function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Differenz in Cents zwischen zwei Frequenzen
export function centsDiff(hzA: number, hzB: number): number {
  return 1200 * Math.log2(hzA / hzB);
}
