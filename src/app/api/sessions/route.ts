import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  createSession,
  createSessionWithStreak,
  getSessionCount,
  getTotalSessionCount,
} from "@/lib/services/session-service";

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
      const count = await getSessionCount(session.user.id, songId);
      return NextResponse.json({ count });
    }

    const count = await getTotalSessionCount(session.user.id);
    return NextResponse.json({ count });
  } catch (error) {
    console.error("GET /api/sessions error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

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
    const { songId, lernmethode } = body;

    if (!songId || typeof songId !== "string") {
      return NextResponse.json(
        { error: "Song-ID ist erforderlich", field: "songId" },
        { status: 400 }
      );
    }

    if (!lernmethode || typeof lernmethode !== "string") {
      return NextResponse.json(
        { error: "Lernmethode ist erforderlich", field: "lernmethode" },
        { status: 400 }
      );
    }

    const { session: newSession, streak } = await createSessionWithStreak(
      session.user.id,
      songId,
      lernmethode as Parameters<typeof createSession>[2]
    );
    return NextResponse.json({ session: newSession, streak }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Ungültige Lernmethode") {
        return NextResponse.json(
          { error: "Ungültige Lernmethode", field: "lernmethode" },
          { status: 400 }
        );
      }
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
    console.error("POST /api/sessions error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
