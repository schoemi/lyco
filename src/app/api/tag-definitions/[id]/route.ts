import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  updateTagDefinition,
  deleteTagDefinition,
} from "@/lib/services/tag-definition-service";

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

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Keine Berechtigung" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const definition = await updateTagDefinition(id, {
      label: body.label,
      icon: body.icon,
      color: body.color,
      indexNr: body.indexNr,
    });

    return NextResponse.json({ definition });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Tag-Definition nicht gefunden"
    ) {
      return NextResponse.json(
        { error: "Tag-Definition nicht gefunden" },
        { status: 404 }
      );
    }
    console.error("PUT /api/tag-definitions/[id] error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Keine Berechtigung" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const result = await deleteTagDefinition(id);

    const response: Record<string, unknown> = {
      deleted: result.deleted,
      affectedSongs: result.affectedSongs,
    };

    if (result.affectedSongs > 0) {
      response.warning = `Dieser Tag wurde in ${result.affectedSongs} Song(s) verwendet.`;
    }

    return NextResponse.json(response);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Tag-Definition nicht gefunden"
    ) {
      return NextResponse.json(
        { error: "Tag-Definition nicht gefunden" },
        { status: 404 }
      );
    }
    console.error("DELETE /api/tag-definitions/[id] error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
