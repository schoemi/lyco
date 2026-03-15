import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { upsertNote } from "@/lib/services/note-service";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { stropheId, text } = body;

    if (!stropheId || typeof stropheId !== "string" || !stropheId.trim()) {
      return NextResponse.json(
        { error: "Strophe-ID ist erforderlich", field: "stropheId" },
        { status: 400 }
      );
    }

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { error: "Notiztext ist erforderlich", field: "text" },
        { status: 400 }
      );
    }

    const notiz = await upsertNote(session.user.id, stropheId, text);
    return NextResponse.json({ notiz }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Notiztext ist erforderlich") {
        return NextResponse.json(
          { error: "Notiztext ist erforderlich", field: "text" },
          { status: 400 }
        );
      }
      if (error.message === "Strophe nicht gefunden") {
        return NextResponse.json(
          { error: "Strophe nicht gefunden" },
          { status: 404 }
        );
      }
      if (error.message === "Zugriff verweigert") {
        return NextResponse.json(
          { error: "Zugriff verweigert" },
          { status: 403 }
        );
      }
    }
    console.error("POST /api/notes error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
