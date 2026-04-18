import type { ReferenzFrame } from '@/types/vocal-trainer';

/**
 * Ein einzelner Pitch-Balken, der aus zusammenhängenden stimmaktiven Frames aggregiert wird.
 * Die vertikale Position repräsentiert die Tonhöhe (MIDI-Wert),
 * die horizontale Ausdehnung die Dauer der stimmaktiven Phase.
 */
export interface PitchBalken {
  /** Startzeitpunkt in Millisekunden (timestampMs des ersten Frames) */
  startMs: number;
  /** Endzeitpunkt in Millisekunden (timestampMs des letzten Frames) */
  endMs: number;
  /** MIDI-Wert der Tonhöhe (Durchschnitt der zusammenhängenden Frames) */
  midiValue: number;
  /** Dauer in Millisekunden (endMs - startMs) */
  durationMs: number;
}

/** Max duration of an unvoiced gap (ms) that gets bridged instead of splitting. */
const GAP_TOLERANZ_MS = 200;

/** Max time gap (ms) between two bars to consider merging them. */
const MERGE_ABSTAND_MS = 300;

/** Max pitch difference (semitones) between two bars to consider merging them. */
const MERGE_HALBTON_TOLERANZ = 3;

/**
 * Aggregiert aufeinanderfolgende stimmaktive ReferenzFrames zu PitchBalken.
 *
 * Die Aggregation arbeitet in zwei Phasen:
 * 1. **Lücken-Toleranz**: Kurze stimmlose Lücken (≤ 200ms) innerhalb eines Segments
 *    werden überbrückt, statt einen neuen Balken zu starten. Das verhindert
 *    Fragmentierung durch kurze Analyse-Aussetzer.
 * 2. **Nachbar-Zusammenführung**: Aufeinanderfolgende Balken, die zeitlich nah
 *    (≤ 300ms Abstand) und tonal ähnlich (≤ 3 Halbtöne) sind, werden verschmolzen.
 *
 * - Frames mit `isVoiced === false` über der Toleranzgrenze erzeugen keine Balken
 * - Leere oder komplett stimmlose Eingaben ergeben ein leeres Array
 *
 * @param frames - Array von ReferenzFrames aus den Referenzdaten
 * @returns Array von PitchBalken, sortiert nach Startzeitpunkt
 */
export function aggregiereFramesZuBalken(frames: ReferenzFrame[]): PitchBalken[] {
  if (frames.length === 0) {
    return [];
  }

  // Phase 1: Segmentierung mit Lücken-Toleranz
  const rohBalken: PitchBalken[] = [];
  let segmentFrames: ReferenzFrame[] = [];
  let unvoicedGapMs = 0;

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];

    if (frame.isVoiced) {
      if (segmentFrames.length === 0) {
        // Neues Segment starten
        segmentFrames = [frame];
      } else {
        // Segment fortsetzen (ggf. nach überbrückter Lücke)
        segmentFrames.push(frame);
      }
      unvoicedGapMs = 0;
    } else {
      // Stimmloser Frame — Lücke messen
      if (segmentFrames.length > 0) {
        const prevFrame = frames[i - 1];
        const gapDelta = frame.timestampMs - prevFrame.timestampMs;
        unvoicedGapMs += gapDelta;

        if (unvoicedGapMs > GAP_TOLERANZ_MS) {
          // Lücke zu groß → Segment abschließen
          rohBalken.push(erstelleBalken(segmentFrames));
          segmentFrames = [];
          unvoicedGapMs = 0;
        }
        // Sonst: Lücke wird toleriert, Segment bleibt offen
      }
    }
  }

  // Letztes offenes Segment abschließen
  if (segmentFrames.length > 0) {
    rohBalken.push(erstelleBalken(segmentFrames));
  }

  if (rohBalken.length <= 1) {
    return rohBalken;
  }

  // Phase 2: Nachbar-Zusammenführung (zeitlich nah + tonal ähnlich)
  const ergebnis: PitchBalken[] = [rohBalken[0]];

  for (let i = 1; i < rohBalken.length; i++) {
    const aktuell = rohBalken[i];
    const letzter = ergebnis[ergebnis.length - 1];

    const zeitAbstand = aktuell.startMs - letzter.endMs;
    const tonAbstand = Math.abs(aktuell.midiValue - letzter.midiValue);

    if (zeitAbstand <= MERGE_ABSTAND_MS && tonAbstand <= MERGE_HALBTON_TOLERANZ) {
      // Zusammenführen: Zeitbereich erweitern, MIDI-Wert gewichtet mitteln
      const letzterGewicht = letzter.durationMs || 1;
      const aktuellGewicht = aktuell.durationMs || 1;
      const gesamtGewicht = letzterGewicht + aktuellGewicht;

      ergebnis[ergebnis.length - 1] = {
        startMs: letzter.startMs,
        endMs: aktuell.endMs,
        midiValue:
          (letzter.midiValue * letzterGewicht + aktuell.midiValue * aktuellGewicht) /
          gesamtGewicht,
        durationMs: aktuell.endMs - letzter.startMs,
      };
    } else {
      ergebnis.push(aktuell);
    }
  }

  return ergebnis;
}

/**
 * Serialisiert ein Array von PitchBalken zu einem JSON-String.
 *
 * @param balken - Array von PitchBalken
 * @returns JSON-String-Repräsentation
 */
export function serializePitchBalken(balken: PitchBalken[]): string {
  return JSON.stringify(balken);
}

/**
 * Deserialisiert einen JSON-String zu einem Array von PitchBalken.
 * Validiert die Struktur jedes Elements und wirft einen beschreibenden Fehler
 * bei ungültigem JSON oder fehlerhafter Struktur.
 *
 * @param json - JSON-String, der ein PitchBalken-Array repräsentiert
 * @returns Array von PitchBalken
 * @throws Error bei ungültigem JSON oder ungültiger Struktur
 */
export function deserializePitchBalken(json: string): PitchBalken[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error(
      `Ungültiges JSON für PitchBalken-Deserialisierung: ${json.length > 100 ? json.slice(0, 100) + '…' : json}`,
    );
  }

  if (!Array.isArray(parsed)) {
    throw new Error(
      `PitchBalken-Deserialisierung erwartet ein Array, erhalten: ${typeof parsed}`,
    );
  }

  return parsed.map((item: unknown, index: number) => {
    if (typeof item !== 'object' || item === null) {
      throw new Error(
        `PitchBalken[${index}] ist kein Objekt: ${typeof item}`,
      );
    }

    const obj = item as Record<string, unknown>;
    const requiredFields: (keyof PitchBalken)[] = [
      'startMs',
      'endMs',
      'midiValue',
      'durationMs',
    ];

    for (const field of requiredFields) {
      if (typeof obj[field] !== 'number') {
        throw new Error(
          `PitchBalken[${index}].${field} muss eine Zahl sein, erhalten: ${typeof obj[field]}`,
        );
      }
    }

    return {
      startMs: obj.startMs as number,
      endMs: obj.endMs as number,
      midiValue: obj.midiValue as number,
      durationMs: obj.durationMs as number,
    };
  });
}

/**
 * Erstellt einen PitchBalken aus einer Gruppe zusammenhängender stimmaktiver Frames.
 */
function erstelleBalken(frames: ReferenzFrame[]): PitchBalken {
  const startMs = frames[0].timestampMs;
  const endMs = frames[frames.length - 1].timestampMs;
  const midiSum = frames.reduce((sum, f) => sum + f.midiValue, 0);
  const midiValue = midiSum / frames.length;

  return {
    startMs,
    endMs,
    midiValue,
    durationMs: endMs - startMs,
  };
}
