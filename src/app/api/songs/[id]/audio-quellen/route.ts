import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getAudioQuellen,
  createAudioQuelle,
} from "@/lib/services/audio-quelle-service";

const VALID_AUDIO_TYPEN = ["MP3", "SPOTIFY", "YOUTUBE", "APPLE_MUSIC"] as const;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const audioQuellen = await getAudioQuellen(id, session.user.id);
    return NextResponse.json({ audioQuellen });
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
    console.error("GET /api/songs/[id]/audio-quellen error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const { url, typ, label } = body;

    if (!url || typeof url !== "string" || !url.trim()) {
      return NextResponse.json(
        { error: "Ungültige URL" },
        { status: 400 }
      );
    }

    if (!typ || !VALID_AUDIO_TYPEN.includes(typ)) {
      return NextResponse.json(
        { error: "Ungültiger Audio-Typ" },
        { status: 400 }
      );
    }

    if (!label || typeof label !== "string" || !label.trim()) {
      return NextResponse.json(
        { error: "Label ist erforderlich" },
        { status: 400 }
      );
    }

    const audioQuelle = await createAudioQuelle(
      id,
      { url, typ, label },
      session.user.id
    );

    return NextResponse.json(audioQuelle, { status: 201 });
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
      if (error.message === "Ungültige URL") {
        return NextResponse.json(
          { error: "Ungültige URL" },
          { status: 400 }
        );
      }
      if (error.message === "Label ist erforderlich") {
        return NextResponse.json(
          { error: "Label ist erforderlich" },
          { status: 400 }
        );
      }
    }
    console.error("POST /api/songs/[id]/audio-quellen error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
