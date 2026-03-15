import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { importSong } from "@/lib/services/song-service";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const body = await request.json();
    const { titel, strophen } = body;

    // Validate title
    if (!titel || typeof titel !== "string" || !titel.trim()) {
      return NextResponse.json(
        { error: "Titel ist erforderlich", field: "titel" },
        { status: 400 }
      );
    }

    // Validate at least 1 strophe
    if (!strophen || !Array.isArray(strophen) || strophen.length === 0) {
      return NextResponse.json(
        { error: "Mindestens eine Strophe erforderlich", field: "strophen" },
        { status: 400 }
      );
    }

    // Validate each strophe has at least 1 line
    for (let i = 0; i < strophen.length; i++) {
      const strophe = strophen[i];
      if (!strophe.zeilen || !Array.isArray(strophe.zeilen) || strophe.zeilen.length === 0) {
        return NextResponse.json(
          { error: "Jede Strophe muss mindestens eine Zeile enthalten", field: `strophen[${i}].zeilen` },
          { status: 400 }
        );
      }
    }

    const song = await importSong(session.user.id, body);
    return NextResponse.json({ song }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Titel ist erforderlich") {
        return NextResponse.json(
          { error: "Titel ist erforderlich", field: "titel" },
          { status: 400 }
        );
      }
      if (error.message === "Mindestens eine Strophe erforderlich") {
        return NextResponse.json(
          { error: "Mindestens eine Strophe erforderlich", field: "strophen" },
          { status: 400 }
        );
      }
      if (error.message === "Jede Strophe muss mindestens eine Zeile enthalten") {
        return NextResponse.json(
          { error: "Jede Strophe muss mindestens eine Zeile enthalten", field: "strophen" },
          { status: 400 }
        );
      }
    }
    console.error("POST /api/songs/import error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
