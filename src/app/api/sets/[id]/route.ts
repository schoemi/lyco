import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSetDetail, updateSet, deleteSet } from "@/lib/services/set-service";

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
    const set = await getSetDetail(session.user.id, id);
    return NextResponse.json({ set });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Set nicht gefunden") {
        return NextResponse.json({ error: "Set nicht gefunden" }, { status: 404 });
      }
      if (error.message === "Zugriff verweigert") {
        return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
      }
    }
    console.error("GET /api/sets/[id] error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Name ist erforderlich", field: "name" },
        { status: 400 }
      );
    }

    const set = await updateSet(session.user.id, id, { name, description });
    return NextResponse.json({ set });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Name ist erforderlich") {
        return NextResponse.json(
          { error: "Name ist erforderlich", field: "name" },
          { status: 400 }
        );
      }
      if (error.message === "Name darf maximal 100 Zeichen lang sein") {
        return NextResponse.json(
          { error: "Name darf maximal 100 Zeichen lang sein", field: "name" },
          { status: 400 }
        );
      }
      if (error.message === "Beschreibung darf maximal 500 Zeichen lang sein") {
        return NextResponse.json(
          { error: "Beschreibung darf maximal 500 Zeichen lang sein", field: "description" },
          { status: 400 }
        );
      }
      if (error.message === "Set nicht gefunden") {
        return NextResponse.json({ error: "Set nicht gefunden" }, { status: 404 });
      }
      if (error.message === "Zugriff verweigert") {
        return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
      }
    }
    console.error("PUT /api/sets/[id] error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

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
    await deleteSet(session.user.id, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Set nicht gefunden") {
        return NextResponse.json({ error: "Set nicht gefunden" }, { status: 404 });
      }
      if (error.message === "Zugriff verweigert") {
        return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
      }
    }
    console.error("DELETE /api/sets/[id] error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
