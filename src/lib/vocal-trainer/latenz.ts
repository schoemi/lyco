/**
 * Latenz-Messung und -Kompensation für das Vocal-Trainer-Modul.
 *
 * - messeLatenz(): Misst die Round-Trip-Latenz des Audio-Systems (Browser-only).
 * - kompensiere(): Verschiebt einen Audio-Buffer zeitlich, um die Latenz auszugleichen.
 *
 * Anforderungen: 5.1, 5.2, 5.3
 */

/**
 * Misst die Round-Trip-Latenz des Audio-Systems in Millisekunden.
 *
 * Nutzt `AudioContext.baseLatency` und `AudioContext.outputLatency`, falls verfügbar.
 * Fallback: Schätzung basierend auf Buffer-Größe / Sample-Rate.
 *
 * Nur im Browser-Kontext nutzbar (benötigt AudioContext).
 */
export async function messeLatenz(): Promise<number> {
  const audioContext = new AudioContext();

  try {
    let latenzSekunden = 0;

    // Prefer baseLatency + outputLatency if available
    if (typeof audioContext.baseLatency === 'number') {
      latenzSekunden += audioContext.baseLatency;
    }

    if (typeof (audioContext as any).outputLatency === 'number') {
      latenzSekunden += (audioContext as any).outputLatency;
    }

    // Fallback: estimate from buffer size / sample rate when neither property is available
    if (latenzSekunden === 0) {
      // Default buffer size is typically 128 samples; use 2 buffers as round-trip estimate
      const bufferSize = 128;
      latenzSekunden = (bufferSize * 2) / audioContext.sampleRate;
    }

    return latenzSekunden * 1000; // convert to milliseconds
  } finally {
    await audioContext.close();
  }
}

/**
 * Verschiebt einen Audio-Buffer zeitlich, um die gemessene Latenz zu kompensieren.
 *
 * Schneidet die ersten `offset` Samples ab, wobei:
 *   offset = Math.round(latenzMs / 1000 * sampleRate)
 *
 * @param audioBuffer - Die aufgenommene Audio-Spur als Float32Array
 * @param latenzMs   - Die gemessene Latenz in Millisekunden
 * @param sampleRate - Die Abtastrate der Aufnahme (z.B. 44100)
 * @returns Ein neues Float32Array mit kompensiertem Timing
 */
export function kompensiere(
  audioBuffer: Float32Array,
  latenzMs: number,
  sampleRate: number,
): Float32Array {
  const offset = Math.round((latenzMs / 1000) * sampleRate);

  if (offset >= audioBuffer.length) {
    return new Float32Array(0);
  }

  if (offset <= 0) {
    return new Float32Array(audioBuffer);
  }

  return audioBuffer.slice(offset);
}
