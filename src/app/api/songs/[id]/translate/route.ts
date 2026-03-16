import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { translateSong, getTranslation, UebersetzungsError } from "@/lib/services/uebersetzungs-service";

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
    const body = await request.json().catch(() => ({}));
    const zielsprache = body.zielsprache as string | undefined;

    const result = await translateSong(session.user.id, id, zielsprache);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof UebersetzungsError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error && typeof error === "object" && "statusCode" in error && "message" in error) {
      const e = error as { statusCode: number; message: string };
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    console.error("POST /api/songs/[id]/translate error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const { id } = await params;
    const result = await getTranslation(session.user.id, id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof UebersetzungsError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error && typeof error === "object" && "statusCode" in error && "message" in error) {
      const e = error as { statusCode: number; message: string };
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    console.error("GET /api/songs/[id]/translate error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
