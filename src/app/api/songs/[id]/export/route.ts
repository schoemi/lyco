import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { exportSong, exportSongFormatted } from "@/lib/services/export-service";
import type { ExportFormat, ExportOptions } from "@/lib/export/export-types";

/** Gültige Export-Formate */
const VALID_FORMATS: ExportFormat[] = ["pdf", "chordpro", "onsong", "songbookpro"];

function isValidFormat(value: string): value is ExportFormat {
  return VALID_FORMATS.includes(value as ExportFormat);
}

export async function GET(
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
    const { searchParams } = request.nextUrl;
    const format = searchParams.get("format");

    // Ohne format-Parameter: bestehender ZIP-Export (Rückwärtskompatibilität)
    if (!format) {
      const zipBuffer = await exportSong(session.user.id, id);

      return new NextResponse(new Uint8Array(zipBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="song-${id}.zip"`,
          "Content-Length": String(zipBuffer.length),
        },
      });
    }

    // Ungültiger format-Wert → 400
    if (!isValidFormat(format)) {
      return NextResponse.json(
        { error: "Ungültiges Export-Format. Erlaubt: pdf, chordpro, onsong, songbookpro" },
        { status: 400 }
      );
    }

    // Export-Optionen aus Query-Parametern lesen (Default: true)
    const options: ExportOptions = {
      vocalTags: searchParams.get("vocalTags") !== "false",
      instrumental: searchParams.get("instrumental") !== "false",
      kommentare: searchParams.get("kommentare") !== "false",
    };

    // Format-Export via exportSongFormatted()
    const result = await exportSongFormatted(session.user.id, id, format, options);

    return new NextResponse(new Uint8Array(result.data), {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Content-Length": String(result.data.length),
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Song nicht gefunden") {
        return NextResponse.json(
          { error: "Song nicht gefunden" },
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
    console.error("GET /api/songs/[id]/export error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
