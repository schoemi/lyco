import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createZeile } from "@/lib/services/zeile-service";

export async function POST(
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

    const zeile = await createZeile(session.user.id, id, stropheId, body);
    return NextResponse.json({ zeile }, { status: 201 });
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
      if (error.message === "Zugriff verweigert") {
        return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
      }
    }
    console.error("POST /api/songs/[id]/strophen/[stropheId]/zeilen error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
