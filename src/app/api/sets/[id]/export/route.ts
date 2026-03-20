import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { exportSet } from "@/lib/services/export-service";

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
    const zipBuffer = await exportSet(session.user.id, id);

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="set-${id}.zip"`,
        "Content-Length": String(zipBuffer.length),
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Set nicht gefunden") {
        return NextResponse.json(
          { error: "Set nicht gefunden" },
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
    console.error("GET /api/sets/[id]/export error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
