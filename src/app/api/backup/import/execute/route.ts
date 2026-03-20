import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { executeImport } from "@/lib/services/import-service";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const resolutionsRaw = formData.get("resolutions");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Keine Datei hochgeladen" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Datei zu groß" },
        { status: 413 }
      );
    }

    // Parse resolutions JSON — default to empty object if not provided
    let resolutions: Record<string, "overwrite" | "new"> = {};
    if (resolutionsRaw && typeof resolutionsRaw === "string") {
      try {
        resolutions = JSON.parse(resolutionsRaw);
      } catch {
        return NextResponse.json(
          { error: "Ungültiges Resolutions-Format" },
          { status: 400 }
        );
      }
    }

    const arrayBuffer = await file.arrayBuffer();
    const zipBuffer = Buffer.from(arrayBuffer);

    const result = await executeImport(session.user.id, zipBuffer, resolutions);

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/backup/import/execute error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
