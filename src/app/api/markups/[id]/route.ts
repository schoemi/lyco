import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateMarkup, deleteMarkup } from "@/lib/services/markup-service";

export async function PUT(
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
    const { typ, inhalt } = body;

    const markup = await updateMarkup(session.user.id, id, {
      wert: inhalt,
      timecodeMs: body.timecodeMs,
    });

    return NextResponse.json({ markup });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Markup nicht gefunden") {
        return NextResponse.json(
          { error: "Markup nicht gefunden" },
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
    console.error("PUT /api/markups/[id] error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    await deleteMarkup(session.user.id, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Markup nicht gefunden") {
        return NextResponse.json(
          { error: "Markup nicht gefunden" },
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
    console.error("DELETE /api/markups/[id] error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
