import type { StropheDetail } from "@/types/song";
import type { AudioQuelleResponse } from "@/types/audio";

/**
 * Prüft ob eine Strophe einen gültigen Timecode hat.
 * Eine Strophe hat einen Timecode, wenn in strophe.markups ein Eintrag
 * mit typ === 'TIMECODE', ziel === 'STROPHE' und timecodeMs != null existiert.
 */
export function hatTimecode(strophe: StropheDetail): boolean {
  return strophe.markups.some(
    (m) => m.typ === "TIMECODE" && m.ziel === "STROPHE" && m.timecodeMs != null,
  );
}

/**
 * Findet die Instrumental-AudioQuelle eines Songs.
 */
export function findeInstrumental(
  audioQuellen: AudioQuelleResponse[],
): AudioQuelleResponse | null {
  return audioQuellen.find((q) => q.rolle === "INSTRUMENTAL") ?? null;
}

/**
 * Findet die Referenz-Vokal-AudioQuelle eines Songs.
 */
export function findeReferenzVokal(
  audioQuellen: AudioQuelleResponse[],
): AudioQuelleResponse | null {
  return audioQuellen.find((q) => q.rolle === "REFERENZ_VOKAL") ?? null;
}

/**
 * Berechnet den Panning-Wert für StereoPannerNode aus dem Regler-Wert (0–1).
 * Aufnahme: -wert (links), Referenz: +wert (rechts).
 * Bei wert = 0: beide mittig (mono).
 * Bei wert = 1: Aufnahme voll links (-1), Referenz voll rechts (+1).
 */
export function berechnePanning(reglerWert: number): {
  aufnahme: number;
  referenz: number;
} {
  return {
    aufnahme: -reglerWert,
    referenz: reglerWert,
  };
}
