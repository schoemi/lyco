import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { countSongsUsingTag } from "@/lib/services/tag-definition-service";

/**
 * GET /api/tag-definitions/[id]/count
 * Gibt die Anzahl der Songs zurück, die diesen Tag verwenden.
 */
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

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Keine Berechtigung" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const definition = await prisma.tagDefinition.findUnique({
      where: { id },
    });

    if (!definition) {
      return NextResponse.json(
        { error: "Tag-Definition nicht gefunden" },
        { status: 404 }
      );
    }

    const count = await countSongsUsingTag(definition.tag);

    return NextResponse.json({ count });
  } catch (error) {
    console.error("GET /api/tag-definitions/[id]/count error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
