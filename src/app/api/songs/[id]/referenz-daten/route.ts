import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { readFile } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { generiereReferenzDaten } from "@/lib/vocal-trainer/referenz-generator";

/**
 * GET: Load existing referenz-daten for a song.
 * Checks data/referenz-daten/{id}.json first, then public/referenz-daten/{id}.json as fallback.
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

    const { id } = await params;

    // Try data/ directory first (generated files)
    const dataPath = join(process.cwd(), "data", "referenz-daten", `${id}.json`);
    try {
      const content = await readFile(dataPath, "utf-8");
      const data = JSON.parse(content);
      return NextResponse.json(data);
    } catch {
      // Not found in data/, try public/ as fallback
    }

    // Fallback: public/ directory (manually placed files)
    const publicPath = join(process.cwd(), "public", "referenz-daten", `${id}.json`);
    try {
      const content = await readFile(publicPath, "utf-8");
      const data = JSON.parse(content);
      return NextResponse.json(data);
    } catch {
      return NextResponse.json(
        { error: "Keine Referenz-Daten für diesen Song vorhanden" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("GET /api/songs/[id]/referenz-daten error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

/**
 * POST: Generate referenz-daten from the REFERENZ_VOKAL audio source.
 * Finds the audio source with rolle REFERENZ_VOKAL, decodes it,
 * runs pitch extraction, and saves the result.
 */
export async function POST(
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

    // Verify song exists and user has access
    const song = await prisma.song.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!song) {
      return NextResponse.json(
        { error: "Song nicht gefunden" },
        { status: 404 }
      );
    }

    if (song.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Zugriff verweigert" },
        { status: 403 }
      );
    }

    // Find REFERENZ_VOKAL audio source
    const vokalQuelle = await prisma.audioQuelle.findFirst({
      where: { songId: id, rolle: "REFERENZ_VOKAL" },
    });

    if (!vokalQuelle) {
      return NextResponse.json(
        {
          error:
            "Keine Audio-Quelle mit Rolle 'Referenz-Vokal' gefunden. " +
            "Bitte weise einer Audio-Quelle die Rolle 'Referenz-Vokal' zu.",
        },
        { status: 400 }
      );
    }

    // Generate referenz-daten
    const referenzDaten = await generiereReferenzDaten(id, vokalQuelle.url);

    return NextResponse.json({
      message: "Referenz-Daten erfolgreich generiert",
      framesCount: referenzDaten.frames.length,
      voicedCount: referenzDaten.frames.filter((f) => f.isVoiced).length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Interner Serverfehler";
    console.error("POST /api/songs/[id]/referenz-daten error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
