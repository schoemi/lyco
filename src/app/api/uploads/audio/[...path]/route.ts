import { NextRequest, NextResponse } from "next/server";
import { open, stat } from "fs/promises";
import { join } from "path";
import { AUDIO_DIR } from "@/lib/storage";

const MIME_TYPES: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".mp4": "audio/mp4",
  ".m4a": "audio/mp4",
};

/** Max chunk size for open-ended range requests (1 MB). Keeps memory low
 *  and works around Firefox Mobile's expectation of chunked 206 responses. */
const MAX_CHUNK = 1024 * 1024;

function resolveFile(segments: string[]): { filepath: string; filename: string } | null {
  if (segments.length !== 1) return null;
  const filename = segments[0];
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) return null;
  return { filepath: join(AUDIO_DIR, filename), filename };
}

function contentTypeFor(filename: string): string {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

/**
 * HEAD handler — Firefox Mobile (and some other browsers) send a HEAD
 * request before attempting to stream audio so they can discover
 * Accept-Ranges and Content-Length up front.
 */
export async function HEAD(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await params;
    const resolved = resolveFile(segments);
    if (!resolved) {
      return new NextResponse(null, { status: 404 });
    }

    let fileSize: number;
    try {
      const fileStat = await stat(resolved.filepath);
      fileSize = fileStat.size;
    } catch {
      return new NextResponse(null, { status: 404 });
    }

    return new NextResponse(null, {
      status: 200,
      headers: {
        "Content-Type": contentTypeFor(resolved.filename),
        "Content-Length": String(fileSize),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("HEAD /api/uploads/audio error:", error);
    return new NextResponse(null, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await params;
    const resolved = resolveFile(segments);
    if (!resolved) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    const { filepath, filename } = resolved;

    // Check file exists and get size
    let fileSize: number;
    try {
      const fileStat = await stat(filepath);
      fileSize = fileStat.size;
    } catch {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    const contentType = contentTypeFor(filename);
    const rangeHeader = request.headers.get("range");

    // --- Range Request (required for iOS Safari & Firefox Mobile) ---
    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (!match) {
        return new NextResponse(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${fileSize}` },
        });
      }

      const start = parseInt(match[1], 10);
      // If no end specified (e.g. "bytes=0-"), cap to MAX_CHUNK so we don't
      // load the entire file into memory. Firefox Mobile sends "bytes=0-"
      // and expects a bounded 206 response it can follow up on.
      const requestedEnd = match[2] ? parseInt(match[2], 10) : undefined;
      const end = requestedEnd !== undefined
        ? Math.min(requestedEnd, fileSize - 1)
        : Math.min(start + MAX_CHUNK - 1, fileSize - 1);

      if (start >= fileSize || start > end) {
        return new NextResponse(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${fileSize}` },
        });
      }

      const chunkSize = end - start + 1;

      const fh = await open(filepath, "r");
      try {
        const buf = Buffer.alloc(chunkSize);
        await fh.read(buf, 0, chunkSize, start);
        return new NextResponse(buf, {
          status: 206,
          headers: {
            "Content-Type": contentType,
            "Content-Length": String(chunkSize),
            "Content-Range": `bytes ${start}-${end}/${fileSize}`,
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      } finally {
        await fh.close();
      }
    }

    // --- Full request (non-range) ---
    const fh = await open(filepath, "r");
    try {
      const buf = Buffer.alloc(fileSize);
      await fh.read(buf, 0, fileSize, 0);
      return new NextResponse(buf, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(fileSize),
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } finally {
      await fh.close();
    }
  } catch (error) {
    console.error("GET /api/uploads/audio error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
