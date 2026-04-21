import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getAllTagKategorien,
  createTagKategorie,
} from "@/lib/services/tag-kategorie-service";

const REQUIRED_FIELDS = ["title", "slug"] as const;

/**
 * Extracts an error message from an unknown thrown value.
 * Handles Error instances, objects with a `message` property, strings, and fallback.
 */
function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  if (typeof error === "string") {
    return error;
  }
  return String(error);
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    const categories = await getAllTagKategorien();
    return NextResponse.json({ categories });
  } catch (error) {
    console.error("GET /api/tag-categories error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();

    for (const field of REQUIRED_FIELDS) {
      if (body[field] === undefined || body[field] === null || body[field] === "") {
        return NextResponse.json(
          { error: `Feld '${field}' ist erforderlich` },
          { status: 400 }
        );
      }
    }

    const category = await createTagKategorie({
      title: body.title,
      slug: body.slug,
      orderIndex: body.orderIndex,
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    const message = extractErrorMessage(error);
    if (message === "Eine Kategorie mit diesem Slug existiert bereits") {
      return NextResponse.json(
        { error: "Eine Kategorie mit diesem Slug existiert bereits" },
        { status: 409 }
      );
    }
    console.error(
      "POST /api/tag-categories error:",
      error,
      `[typeof=${typeof error}, constructor=${
        typeof error === "object" && error !== null
          ? error.constructor?.name ?? "unknown"
          : "N/A"
      }]`
    );
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
