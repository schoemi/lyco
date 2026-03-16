import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getFaelligeStrophen,
  getFaelligeStrophenFuerSong,
} from "@/lib/services/spaced-repetition-service";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const songId = request.nextUrl.searchParams.get("songId");

    const strophen = songId
      ? await getFaelligeStrophenFuerSong(userId, songId)
      : await getFaelligeStrophen(userId);

    return NextResponse.json({ strophen, anzahl: strophen.length });
  } catch (error) {
    console.error("GET /api/spaced-repetition/queue error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
