import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verarbeiteReview } from "@/lib/services/spaced-repetition-service";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body = await request.json();

    const { wiederholungId, gewusst } = body;

    if (
      typeof wiederholungId !== "string" ||
      !wiederholungId ||
      typeof gewusst !== "boolean"
    ) {
      return NextResponse.json(
        { error: "wiederholungId (string) und gewusst (boolean) sind erforderlich" },
        { status: 400 }
      );
    }

    const ergebnis = await verarbeiteReview(wiederholungId, userId, gewusst);

    return NextResponse.json({
      naechstesFaelligkeitsdatum: ergebnis.naechstesFaelligkeitsdatum.toISOString(),
      intervallTage: ergebnis.intervallTage,
    });
  } catch (error) {
    console.error("POST /api/spaced-repetition/review error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
