import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { reorderZeilen } from "@/lib/services/zeile-service";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stropheId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const { id, stropheId } = await params;
    const body = await request.json();

    await reorderZeilen(session.user.id, id, stropheId, body.order);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Reihenfolge ist erforderlich") {
        return NextResponse.json(
          { error: "Reihenfolge ist erforderlich" },
          { status: 400 }
        );
      }
      if (error.message === "Ungültiges Reihenfolge-Element") {
        return NextResponse.json(
          { error: "Ungültiges Reihenfolge-Element" },
          { status: 400 }
        );
      }
      if (error.message === "Song nicht gefunden") {
        return NextResponse.json({ error: "Song nicht gefunden" }, { status: 404 });
      }
      if (error.message === "Strophe nicht gefunden") {
        return NextResponse.json({ error: "Strophe nicht gefunden" }, { status: 404 });
      }
      if (error.message === "Zeile nicht gefunden") {
        return NextResponse.json({ error: "Zeile nicht gefunden" }, { status: 404 });
      }
      if (error.message === "Zugriff verweigert") {
        return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
      }
    }
    console.error("PUT /api/songs/[id]/strophen/[stropheId]/zeilen/reorder error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
