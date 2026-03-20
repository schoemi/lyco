import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { COVERS_DIR } from "@/lib/storage";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

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

    // Check song exists and ownership
    const song = await prisma.song.findUnique({ where: { id: songId } });
    if (!song) {
      return NextResponse.json(
        { error: "Song nicht gefunden" },
        { status: 404 }
      );
    }
    if (song.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Zugriff verweigert" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Keine Datei hochgeladen" },
        { status: 400 }
      );
    }

    // Validate file type
    const ext = getExtension(file.name);
    if (!ALLOWED_EXTENSIONS.has(ext) && !ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Nur JPEG, PNG und WebP Dateien sind erlaubt" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Die Datei darf maximal 5 MB groß sein" },
        { status: 400 }
      );
    }

    // Save file to disk
    const uploadDir = COVERS_DIR;
    await mkdir(uploadDir, { recursive: true });

    const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : ".jpg";
    const filename = `${randomUUID()}${safeExt}`;
    const filepath = join(uploadDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    // Build cover URL
    const coverUrl = `/api/uploads/covers/${filename}`;

    // Update song with cover URL
    await prisma.song.update({
      where: { id: songId },
      data: { coverUrl },
    });

    return NextResponse.json({ coverUrl });
  } catch (error) {
    console.error("POST /api/songs/[id]/cover/upload error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
