import { NextRequest, NextResponse } from "next/server";
import { open, stat } from "fs/promises";
import { join } from "path";

const MIME_TYPES: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".mp4": "audio/mp4",
  ".m4a": "audio/mp4",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await params;

    // Only allow a single filename — no directory traversal
    if (segments.length !== 1) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    const filename = segments[0];

    // Block path traversal attempts
    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    const filepath = join(process.cwd(), "data", "uploads", "audio", filename);

    // Check file exists and get size
    let fileSize: number;
    try {
      const fileStat = await stat(filepath);
      fileSize = fileStat.size;
    } catch {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    const rangeHeader = request.headers.get("range");

    // --- Range Request (required for iOS Safari audio playback) ---
    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (!match) {
        return new NextResponse(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${fileSize}` },
        });
      }

      const start = parseInt(match[1], 10);
      const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize || start > end) {
        return new NextResponse(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${fileSize}` },
        });
      }

      const chunkSize = end - start + 1;

      // Read only the requested byte range
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
