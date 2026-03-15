import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { addSongToSet } from "@/lib/services/set-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { songId } = body;

    if (!songId || typeof songId !== "string") {
      return NextResponse.json(
        { error: "Song-ID ist erforderlich", field: "songId" },
        { status: 400 }
      );
    }

    await addSongToSet(session.user.id, id, songId);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Set nicht gefunden") {
        return NextResponse.json({ error: "Set nicht gefunden" }, { status: 404 });
      }
      if (error.message === "Zugriff verweigert") {
        return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
      }
      if (error.message === "Song ist bereits im Set") {
        return NextResponse.json({ error: "Song ist bereits im Set" }, { status: 409 });
      }
    }
    console.error("POST /api/sets/[id]/songs error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
