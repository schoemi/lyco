import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  updateAudioQuelle,
  deleteAudioQuelle,
} from "@/lib/services/audio-quelle-service";

const VALID_AUDIO_TYPEN = ["MP3", "SPOTIFY", "YOUTUBE", "APPLE_MUSIC"] as const;
const VALID_AUDIO_ROLLEN = ["STANDARD", "INSTRUMENTAL", "REFERENZ_VOKAL"] as const;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; quelleId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    const { quelleId } = await params;
    const body = await request.json();

    const { url, typ, label, rolle } = body;

    if (url !== undefined && (typeof url !== "string" || !url.trim())) {
      return NextResponse.json(
        { error: "Ungültige URL" },
        { status: 400 }
      );
    }

    if (typ !== undefined && !VALID_AUDIO_TYPEN.includes(typ)) {
      return NextResponse.json(
        { error: "Ungültiger Audio-Typ" },
        { status: 400 }
      );
    }

    if (label !== undefined && (typeof label !== "string" || !label.trim())) {
      return NextResponse.json(
        { error: "Label ist erforderlich" },
        { status: 400 }
      );
    }

    if (rolle !== undefined && !VALID_AUDIO_ROLLEN.includes(rolle)) {
      return NextResponse.json(
        { error: "Ungültige Audio-Rolle" },
        { status: 400 }
      );
    }

    const updatedQuelle = await updateAudioQuelle(
      quelleId,
      { url, typ, label, rolle },
      session.user.id
    );

    return NextResponse.json(updatedQuelle);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Audio-Quelle nicht gefunden") {
        return NextResponse.json(
          { error: "Audio-Quelle nicht gefunden" },
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
    console.error("PUT /api/songs/[id]/audio-quellen/[quelleId] error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; quelleId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    const { quelleId } = await params;

    await deleteAudioQuelle(quelleId, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Audio-Quelle nicht gefunden") {
        return NextResponse.json(
          { error: "Audio-Quelle nicht gefunden" },
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
    console.error("DELETE /api/songs/[id]/audio-quellen/[quelleId] error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
