import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  updateTagKategorie,
  deleteTagKategorie,
} from "@/lib/services/tag-kategorie-service";

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

    const category = await updateTagKategorie(id, {
      title: body.title,
      slug: body.slug,
      orderIndex: body.orderIndex,
    });

    return NextResponse.json({ category });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Tag-Kategorie nicht gefunden"
    ) {
      return NextResponse.json(
        { error: "Tag-Kategorie nicht gefunden" },
        { status: 404 }
      );
    }
    if (
      error instanceof Error &&
      error.message === "Eine Kategorie mit diesem Slug existiert bereits"
    ) {
      return NextResponse.json(
        { error: "Eine Kategorie mit diesem Slug existiert bereits" },
        { status: 409 }
      );
    }
    console.error("PUT /api/tag-categories/[id] error:", error);
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
    const result = await deleteTagKategorie(id);

    return NextResponse.json({
      deleted: result.deleted,
      affectedTags: result.affectedTags,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Tag-Kategorie nicht gefunden"
    ) {
      return NextResponse.json(
        { error: "Tag-Kategorie nicht gefunden" },
        { status: 404 }
      );
    }
    console.error("DELETE /api/tag-categories/[id] error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
