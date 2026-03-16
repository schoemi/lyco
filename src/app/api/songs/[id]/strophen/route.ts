import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createStrophe } from "@/lib/services/strophe-service";

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

    const strophe = await createStrophe(session.user.id, id, body);
    return NextResponse.json({ strophe }, { status: 201 });
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
      if (error.message === "Zugriff verweigert") {
        return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
      }
    }
    console.error("POST /api/songs/[id]/strophen error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
