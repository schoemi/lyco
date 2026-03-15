import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listSongs, createSong } from "@/lib/services/song-service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const songs = await listSongs(session.user.id);
    return NextResponse.json({ songs });
  } catch (error) {
    console.error("GET /api/songs error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const body = await request.json();
    const { titel } = body;

    if (!titel || typeof titel !== "string" || !titel.trim()) {
      return NextResponse.json(
        { error: "Titel ist erforderlich", field: "titel" },
        { status: 400 }
      );
    }

    const song = await createSong(session.user.id, body);
    return NextResponse.json({ song }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Titel ist erforderlich") {
      return NextResponse.json(
        { error: "Titel ist erforderlich", field: "titel" },
        { status: 400 }
      );
    }
    console.error("POST /api/songs error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
