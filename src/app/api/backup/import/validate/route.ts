import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { validateImport } from "@/lib/services/import-service";
import { UPLOAD_LIMITS } from "@/lib/upload-config";

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

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Keine Datei hochgeladen" },
        { status: 400 }
      );
    }

    if (file.size > UPLOAD_LIMITS.BACKUP_IMPORT) {
      return NextResponse.json(
        { error: "Datei zu groß" },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const zipBuffer = Buffer.from(arrayBuffer);

    const result = await validateImport(session.user.id, zipBuffer);

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/backup/import/validate error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
