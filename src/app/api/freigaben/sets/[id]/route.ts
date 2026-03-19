import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { revokeSetFreigabe, listSetFreigaben } from "@/lib/services/freigabe-service";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const { id } = await params;
    await revokeSetFreigabe(id, session.user.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Freigabe nicht gefunden") {
        return NextResponse.json({ error: "Freigabe nicht gefunden" }, { status: 404 });
      }
      if (error.message === "Zugriff verweigert") {
        return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
      }
    }
    console.error("DELETE /api/freigaben/sets/[id] error:", error);
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
    const freigaben = await listSetFreigaben(id, session.user.id);
    return NextResponse.json({ freigaben });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Set nicht gefunden") {
        return NextResponse.json({ error: "Set nicht gefunden" }, { status: 404 });
      }
      if (error.message === "Zugriff verweigert") {
        return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
      }
    }
    console.error("GET /api/freigaben/sets/[id] error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
