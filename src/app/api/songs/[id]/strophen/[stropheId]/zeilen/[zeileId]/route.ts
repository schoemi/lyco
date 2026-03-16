import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateZeile, deleteZeile } from "@/lib/services/zeile-service";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stropheId: string; zeileId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const { id, stropheId, zeileId } = await params;
    const body = await request.json();

    const zeile = await updateZeile(session.user.id, id, stropheId, zeileId, body);
    return NextResponse.json({ zeile });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Text ist erforderlich") {
        return NextResponse.json(
          { error: "Text ist erforderlich", field: "text" },
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
    console.error("PUT /api/songs/[id]/strophen/[stropheId]/zeilen/[zeileId] error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; stropheId: string; zeileId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const { id, stropheId, zeileId } = await params;
    await deleteZeile(session.user.id, id, stropheId, zeileId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
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
    console.error("DELETE /api/songs/[id]/strophen/[stropheId]/zeilen/[zeileId] error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
