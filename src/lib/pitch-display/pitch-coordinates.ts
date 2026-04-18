import type { PitchBalken } from './pitch-balken';

/**
 * Viewport-Bereich mit Start- und Endzeitpunkt in Millisekunden.
 */
export interface Viewport {
  startMs: number;
  endMs: number;
}

/**
 * MIDI-Bereich mit Minimum und Maximum.
 */
export interface MidiBereich {
  min: number;
  max: number;
}

/**
 * Berechnet das Sichtfenster (Viewport) so, dass der Wiedergabe-Cursor
 * im linken Drittel des sichtbaren Bereichs positioniert ist.
 *
 * Der Cursor befindet sich bei currentTimeMs. Das Sichtfenster wird so gewählt,
 * dass currentTimeMs bei 1/3 der Fensterbreite liegt.
 *
 * @param currentTimeMs - Aktuelle Wiedergabeposition in Millisekunden
 * @param windowDurationMs - Dauer des Sichtfensters in Millisekunden (10000–30000)
 * @returns Viewport mit startMs und endMs
 *
 * Requirements: 4.1, 4.2
 */
export function berechneViewport(
  currentTimeMs: number,
  windowDurationMs: number,
): Viewport {
  // Cursor soll im linken Drittel liegen → startMs = currentTimeMs - windowDurationMs / 3
  const startMs = currentTimeMs - windowDurationMs / 3;
  const endMs = startMs + windowDurationMs;

  return { startMs, endMs };
}

/**
 * Filtert PitchBalken, die das gegebene Viewport-Zeitfenster überlappen.
 * Ein Balken überlappt, wenn sein Zeitbereich [startMs, endMs] mit dem
 * Viewport-Zeitbereich [viewport.startMs, viewport.endMs] überlappt.
 *
 * @param balken - Alle PitchBalken des Songs
 * @param viewport - Das aktuelle Sichtfenster
 * @returns Nur die Balken, die im Sichtfenster sichtbar sind
 *
 * Requirements: 4.3, 10.2
 */
export function filterSichtbareBalken(
  balken: PitchBalken[],
  viewport: Viewport,
): PitchBalken[] {
  return balken.filter(
    (b) => b.endMs >= viewport.startMs && b.startMs <= viewport.endMs,
  );
}

/**
 * Bildet einen Zeitpunkt auf eine SVG-X-Koordinate ab.
 * Lineare Interpolation innerhalb des Viewport-Zeitbereichs auf [0, svgWidth].
 *
 * @param timeMs - Zeitpunkt in Millisekunden
 * @param viewport - Das aktuelle Sichtfenster
 * @param svgWidth - Breite des SVG-Elements in Pixeln
 * @returns X-Koordinate im SVG
 *
 * Requirements: 2.2, 3.1
 */
export function berechneSvgX(
  timeMs: number,
  viewport: Viewport,
  svgWidth: number,
): number {
  const viewportDuration = viewport.endMs - viewport.startMs;
  if (viewportDuration === 0) return 0;

  return ((timeMs - viewport.startMs) / viewportDuration) * svgWidth;
}

/**
 * Bildet einen MIDI-Wert auf eine SVG-Y-Koordinate ab.
 * Höhere MIDI-Werte (höhere Töne) werden weiter oben dargestellt (kleinere Y-Werte).
 * Der nutzbare Bereich wird durch Padding oben und unten eingeschränkt.
 *
 * @param midiValue - MIDI-Wert der Tonhöhe
 * @param midiMin - Minimaler MIDI-Wert im Bereich
 * @param midiMax - Maximaler MIDI-Wert im Bereich
 * @param svgHeight - Höhe des SVG-Elements in Pixeln
 * @param padding - Padding oben und unten in Pixeln
 * @returns Y-Koordinate im SVG
 *
 * Requirements: 2.3
 */
export function berechneSvgY(
  midiValue: number,
  midiMin: number,
  midiMax: number,
  svgHeight: number,
  padding: number,
): number {
  const midiRange = midiMax - midiMin;
  if (midiRange === 0) {
    // Alle Balken auf gleicher Höhe → Mitte des nutzbaren Bereichs
    return svgHeight / 2;
  }

  const plotHeight = svgHeight - 2 * padding;
  // Invertiere Y: höhere MIDI-Werte → kleinere Y-Koordinaten (oben)
  return padding + plotHeight - ((midiValue - midiMin) / midiRange) * plotHeight;
}

/**
 * Berechnet den MIDI-Bereich (Minimum und Maximum) über alle PitchBalken.
 * Bei leerem Array wird { min: 0, max: 0 } zurückgegeben.
 *
 * @param balken - Array von PitchBalken
 * @returns Objekt mit min und max MIDI-Werten
 *
 * Requirements: 2.2, 2.3
 */
export function berechneMidiBereich(balken: PitchBalken[]): MidiBereich {
  if (balken.length === 0) {
    return { min: 0, max: 0 };
  }

  let min = balken[0].midiValue;
  let max = balken[0].midiValue;

  for (let i = 1; i < balken.length; i++) {
    const midi = balken[i].midiValue;
    if (midi < min) min = midi;
    if (midi > max) max = midi;
  }

  return { min, max };
}
