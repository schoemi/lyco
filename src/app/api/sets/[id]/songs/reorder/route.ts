import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { reorderSetSongs } from "@/lib/services/set-service";

export async function PUT(
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
    const { items } = body;

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: "items muss ein Array sein" },
        { status: 400 }
      );
    }

    await reorderSetSongs(session.user.id, id, items);
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
    console.error("PUT /api/sets/[id]/songs/reorder error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
