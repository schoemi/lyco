import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import { join } from "path";

async function getAdminSession() {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 }) };
  }
  if (session.user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 }) };
  }
  return { session };
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const result = await getAdminSession();
    if ("error" in result && result.error) return result.error;

    const { filename } = await params;

    // Prevent path traversal
    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return NextResponse.json({ error: "Ungültiger Dateiname" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    if (type !== "audio" && type !== "cover") {
      return NextResponse.json({ error: "Typ muss 'audio' oder 'cover' sein" }, { status: 400 });
    }

    // Check if file is still linked
    if (type === "audio") {
      const linked = await prisma.audioQuelle.findFirst({
        where: { url: `/api/uploads/audio/${filename}` },
      });
      if (linked) {
        return NextResponse.json(
          { error: "Datei ist noch mit einem Song verknüpft" },
          { status: 409 }
        );
      }
    } else {
      const linked = await prisma.song.findFirst({
        where: { coverUrl: `/api/uploads/covers/${filename}` },
      });
      if (linked) {
        return NextResponse.json(
          { error: "Datei ist noch mit einem Song verknüpft" },
          { status: 409 }
        );
      }
    }

    const subdir = type === "audio" ? "audio" : "covers";
    const filepath = join(process.cwd(), "data", "uploads", subdir, filename);

    try {
      await unlink(filepath);
    } catch {
      return NextResponse.json({ error: "Datei nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/files/[filename] error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
