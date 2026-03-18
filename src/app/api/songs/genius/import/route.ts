import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserApiKey } from "@/lib/genius/api-key-store";
import { fetchLyrics } from "@/lib/genius/client";
import { isNoiseLine } from "@/lib/import/noise-filter";
import { parseSongtext } from "@/lib/import/songtext-parser";
import { importSong } from "@/lib/services/song-service";
import type { GeniusImportRequest } from "@/types/genius";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as GeniusImportRequest;
    const { geniusId, title, artist, geniusUrl, albumArt } = body;

    let apiKey: string;
    try {
      apiKey = await getUserApiKey(session.user.id);
    } catch {
      return NextResponse.json(
        {
          error:
            "Kein Genius-API-Schlüssel hinterlegt. Bitte in den Profileinstellungen konfigurieren.",
        },
        { status: 400 }
      );
    }

    let rawLyrics: string;
    try {
      rawLyrics = await fetchLyrics(geniusUrl, apiKey);
    } catch {
      return NextResponse.json(
        { error: "Lyrics konnten nicht abgerufen werden" },
        { status: 502 }
      );
    }

    // Filter noise lines
    const filteredLyrics = rawLyrics
      .split("\n")
      .filter((line) => !isNoiseLine(line))
      .join("\n");

    // Parse into structured strophes
    const parsed = parseSongtext(filteredLyrics);

    if (!parsed.strophen || parsed.strophen.length === 0) {
      return NextResponse.json(
        { error: "Keine gültigen Lyrics gefunden" },
        { status: 422 }
      );
    }

    const song = await importSong(session.user.id, {
      titel: title,
      kuenstler: artist,
      coverUrl: albumArt,
      strophen: parsed.strophen.map((s) => ({
        name: s.name,
        zeilen: s.zeilen.map((z) => ({ text: z })),
      })),
    });

    return NextResponse.json({ song }, { status: 201 });
  } catch (error) {
    console.error("POST /api/songs/genius/import error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
