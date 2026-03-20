import { join } from "path";

/**
 * Base directory for persistent file storage (uploads, referenz-daten, etc.).
 *
 * In Docker the WORKDIR is /app and the bind mount targets /app/data/uploads.
 * Using an absolute path avoids any ambiguity around process.cwd() which can
 * differ between Next.js standalone server and build-time contexts.
 *
 * Override via DATA_DIR env var if needed.
 */
const DATA_BASE = process.env.DATA_DIR || join(process.cwd(), "data");

export const UPLOADS_DIR = join(DATA_BASE, "uploads");
export const AUDIO_DIR = join(UPLOADS_DIR, "audio");
export const COVERS_DIR = join(UPLOADS_DIR, "covers");
export const REFERENZ_DATEN_DIR = join(UPLOADS_DIR, "referenz-daten");
