import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  upsertInterpretation,
  getInterpretationsForSong,
} from "@/lib/services/interpretation-service";

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
        { error: "Interpretationstext ist erforderlich", field: "text" },
        { status: 400 }
      );
    }

    const interpretation = await upsertInterpretation(
      session.user.id,
      stropheId,
      text
    );
    return NextResponse.json({ interpretation }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Interpretationstext ist erforderlich") {
        return NextResponse.json(
          { error: "Interpretationstext ist erforderlich", field: "text" },
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
    console.error("POST /api/interpretations error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    const songId = request.nextUrl.searchParams.get("songId");

    if (!songId || !songId.trim()) {
      return NextResponse.json(
        { error: "Song-ID ist erforderlich", field: "songId" },
        { status: 400 }
      );
    }

    const interpretations = await getInterpretationsForSong(
      session.user.id,
      songId
    );
    return NextResponse.json({ interpretations });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Song nicht gefunden") {
        return NextResponse.json(
          { error: "Song nicht gefunden" },
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
    console.error("GET /api/interpretations error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
