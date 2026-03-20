import { execFile } from "child_process";
import { access, readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { promisify } from "util";
import { extrahierePitch } from "@/lib/vocal-trainer/pitch-extraktor";
import { hzToMidi } from "@/lib/vocal-trainer/frequenz-utils";
import { AUDIO_DIR, REFERENZ_DATEN_DIR } from "@/lib/storage";
import type { ReferenzDaten, ReferenzFrame } from "@/types/vocal-trainer";
import type { PitchFrame } from "@/types/vocal-trainer";

const execFileAsync = promisify(execFile);

const SAMPLE_RATE = 44100;
const WINDOW_SIZE = 1024;

/**
 * Decode an audio file to mono PCM Float32 using ffmpeg.
 * Supports MP3, M4A, WAV, and any format ffmpeg can handle.
 */
async function decodeAudioToFloat32(filePath: string): Promise<Float32Array> {
  // ffmpeg outputs raw 32-bit float PCM, mono, 44100 Hz to stdout
  const { stdout } = await execFileAsync(
    "ffmpeg",
    [
      "-i", filePath,
      "-f", "f32le",       // raw 32-bit float little-endian
      "-acodec", "pcm_f32le",
      "-ac", "1",          // mono
      "-ar", String(SAMPLE_RATE),
      "-v", "error",       // suppress info output
      "pipe:1",            // output to stdout
    ],
    {
      encoding: "buffer",
      maxBuffer: 200 * 1024 * 1024, // 200 MB for long audio files
    },
  );

  // Convert Buffer to Float32Array
  const buffer = stdout as unknown as Buffer;
  return new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
}

/**
 * Convert PitchFrames from the extractor to ReferenzFrames.
 * Adds onset detection (simple: voiced after unvoiced = onset).
 */
function pitchFramesToReferenz(frames: PitchFrame[]): ReferenzFrame[] {
  return frames.map((frame, i) => {
    const prevVoiced = i > 0 && frames[i - 1].isVoiced;
    const isOnset = frame.isVoiced && !prevVoiced;

    return {
      timestampMs: frame.timestampMs,
      f0Hz: frame.f0Hz,
      midiValue: frame.isVoiced ? hzToMidi(frame.f0Hz) : 0,
      isVoiced: frame.isVoiced,
      isOnset,
    };
  });
}

/**
 * Resolve the file path for an audio source URL.
 * Handles both internal uploads (/api/uploads/audio/...) and absolute paths.
 */
function resolveAudioPath(url: string): string {
  if (url.startsWith("/api/uploads/audio/")) {
    const filename = url.replace("/api/uploads/audio/", "");
    return join(AUDIO_DIR, filename);
  }
  // For external URLs, we can't process them server-side
  throw new Error(
    "Nur lokal hochgeladene Audio-Dateien können analysiert werden. Externe URLs werden nicht unterstützt."
  );
}

/**
 * Get the output path for referenz-daten JSON.
 * Stored inside data/uploads/ so it's covered by the Docker volume mount.
 */
function getReferenzDatenPath(songId: string): string {
  return join(REFERENZ_DATEN_DIR, `${songId}.json`);
}

/**
 * Generate reference pitch data from a vocal audio source.
 *
 * 1. Decodes the audio file to PCM via ffmpeg
 * 2. Runs YIN pitch extraction
 * 3. Converts to ReferenzFrame format with onset detection
 * 4. Saves as JSON to data/uploads/referenz-daten/{songId}.json
 *
 * @returns The generated ReferenzDaten
 */
export async function generiereReferenzDaten(
  songId: string,
  audioUrl: string,
): Promise<ReferenzDaten> {
  // 1. Resolve file path
  const audioPath = resolveAudioPath(audioUrl);

  // 2. Verify file exists before calling ffmpeg
  try {
    await access(audioPath);
  } catch {
    throw new Error(
      `Audio-Datei nicht gefunden: ${audioPath}. ` +
      `Bitte stelle sicher, dass die Datei hochgeladen wurde und das Volume korrekt gemountet ist.`
    );
  }

  // 3. Decode audio to Float32Array
  let pcmData: Float32Array;
  try {
    pcmData = await decodeAudioToFloat32(audioPath);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Audio-Dekodierung fehlgeschlagen: ${msg}`);
  }

  if (pcmData.length === 0) {
    throw new Error("Die Audio-Datei enthält keine Daten.");
  }

  // 3. Extract pitch using YIN algorithm
  const pitchFrames = extrahierePitch(pcmData, SAMPLE_RATE);

  // 4. Convert to ReferenzFrames
  const referenzFrames = pitchFramesToReferenz(pitchFrames);

  // 5. Build ReferenzDaten object
  const referenzDaten: ReferenzDaten = {
    songId,
    sampleRate: SAMPLE_RATE,
    windowSize: WINDOW_SIZE,
    frames: referenzFrames,
  };

  // 7. Save to disk (inside uploads volume for persistence)
  const outputPath = getReferenzDatenPath(songId);
  await mkdir(REFERENZ_DATEN_DIR, { recursive: true });
  await writeFile(outputPath, JSON.stringify(referenzDaten), "utf-8");

  return referenzDaten;
}
