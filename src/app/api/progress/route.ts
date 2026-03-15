import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  updateProgress,
  getSongProgress,
  getAverageProgress,
} from "@/lib/services/progress-service";

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { stropheId, prozent } = body;

    if (!stropheId || typeof stropheId !== "string") {
      return NextResponse.json(
        { error: "Strophe-ID ist erforderlich", field: "stropheId" },
        { status: 400 }
      );
    }

    if (prozent === undefined || prozent === null || typeof prozent !== "number") {
      return NextResponse.json(
        { error: "Prozentwert muss eine Ganzzahl sein", field: "prozent" },
        { status: 400 }
      );
    }

    const fortschritt = await updateProgress(
      session.user.id,
      stropheId,
      prozent
    );
    return NextResponse.json({ fortschritt });
  } catch (error) {
    if (error instanceof Error) {
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
    console.error("PUT /api/progress error:", error);
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

    if (songId) {
      const progress = await getSongProgress(session.user.id, songId);
      return NextResponse.json({ progress });
    }

    const averageProgress = await getAverageProgress(session.user.id);
    return NextResponse.json({ averageProgress });
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
    console.error("GET /api/progress error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
