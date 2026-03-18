import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rewriteLyrics } from "@/lib/services/lyrics-rewrite-service";

export async function PUT(
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

    const { id } = await params;
    const body = await request.json();
    const { text } = body as { text?: string };

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: "Text darf nicht leer sein" },
        { status: 400 }
      );
    }

    const result = await rewriteLyrics(session.user.id, id, text);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Song nicht gefunden") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message === "Zugriff verweigert") {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      if (error.message === "Der Text enthält keine gültigen Zeilen") {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    console.error("PUT /api/songs/[id]/rewrite error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
