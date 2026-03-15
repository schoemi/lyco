import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { removeSongFromSet } from "@/lib/services/set-service";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; songId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const { id, songId } = await params;
    await removeSongFromSet(session.user.id, id, songId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Set nicht gefunden") {
        return NextResponse.json({ error: "Set nicht gefunden" }, { status: 404 });
      }
      if (error.message === "Zugriff verweigert") {
        return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
      }
    }
    console.error("DELETE /api/sets/[id]/songs/[songId] error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
