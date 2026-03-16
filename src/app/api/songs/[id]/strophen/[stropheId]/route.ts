import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateStrophe, deleteStrophe } from "@/lib/services/strophe-service";

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

    const strophe = await updateStrophe(session.user.id, id, stropheId, body);
    return NextResponse.json({ strophe });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Name ist erforderlich") {
        return NextResponse.json(
          { error: "Name ist erforderlich", field: "name" },
          { status: 400 }
        );
      }
      if (error.message === "Song nicht gefunden") {
        return NextResponse.json({ error: "Song nicht gefunden" }, { status: 404 });
      }
      if (error.message === "Strophe nicht gefunden") {
        return NextResponse.json({ error: "Strophe nicht gefunden" }, { status: 404 });
      }
      if (error.message === "Zugriff verweigert") {
        return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
      }
    }
    console.error("PUT /api/songs/[id]/strophen/[stropheId] error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; stropheId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const { id, stropheId } = await params;
    await deleteStrophe(session.user.id, id, stropheId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Song nicht gefunden") {
        return NextResponse.json({ error: "Song nicht gefunden" }, { status: 404 });
      }
      if (error.message === "Strophe nicht gefunden") {
        return NextResponse.json({ error: "Strophe nicht gefunden" }, { status: 404 });
      }
      if (error.message === "Zugriff verweigert") {
        return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
      }
    }
    console.error("DELETE /api/songs/[id]/strophen/[stropheId] error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
