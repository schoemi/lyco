import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import { join } from "path";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(
  _request: NextRequest,
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

    const filepath = join(process.cwd(), "data", "uploads", "covers", filename);

    // Check file exists
    try {
      await stat(filepath);
    } catch {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    const buffer = await readFile(filepath);
    const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buffer.length),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("GET /api/uploads/covers error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
