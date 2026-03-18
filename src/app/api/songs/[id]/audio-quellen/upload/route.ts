import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createAudioQuelle } from "@/lib/services/audio-quelle-service";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "video/mp4",
]);
const ALLOWED_EXTENSIONS = new Set([".mp3", ".mp4", ".m4a"]);

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot).toLowerCase() : "";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    const { id: songId } = await params;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const label = formData.get("label") as string | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Keine Datei hochgeladen" },
        { status: 400 }
      );
    }

    if (!label || !label.trim()) {
      return NextResponse.json(
        { error: "Label ist erforderlich" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Datei ist zu groß (max. 50 MB)" },
        { status: 400 }
      );
    }

    // Validate file type
    const ext = getExtension(file.name);
    if (!ALLOWED_EXTENSIONS.has(ext) && !ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Nur MP3- und MP4-Dateien sind erlaubt" },
        { status: 400 }
      );
    }

    // Save file to disk
    const uploadDir = join(process.cwd(), "data", "uploads", "audio");
    await mkdir(uploadDir, { recursive: true });

    const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : ".mp3";
    const filename = `${randomUUID()}${safeExt}`;
    const filepath = join(uploadDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    // Build internal serve URL
    const url = `/api/uploads/audio/${filename}`;

    // Create audio quelle record
    const audioQuelle = await createAudioQuelle(
      songId,
      { url, typ: "MP3", label: label.trim() },
      session.user.id
    );

    return NextResponse.json(audioQuelle, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Song nicht gefunden") {
        return NextResponse.json(
          { error: "Song nicht gefunden" },
          { status: 404 }
        );
      }
      if (error.message === "Zugriff verweigert") {
        return NextResponse.json(
          { error: "Zugriff verweigert" },
          { status: 403 }
        );
      }
    }
    console.error("POST /api/songs/[id]/audio-quellen/upload error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
