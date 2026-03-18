import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserApiKey } from "@/lib/genius/api-key-store";
import { searchSongs } from "@/lib/genius/client";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { query } = body as { query?: string };

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

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: "Suchbegriff darf nicht leer sein" },
        { status: 400 }
      );
    }

    let results;
    try {
      results = await searchSongs(query, apiKey);
    } catch (err) {
      console.error("Genius search error:", err);
      const message =
        err instanceof Error ? err.message : String(err);
      // Genius API returns 401/403 for bad tokens
      if (message.includes("401") || message.includes("403") || message.includes("Unauthorized")) {
        return NextResponse.json(
          { error: "Ungültiger Genius-API-Schlüssel. Bitte in den Profileinstellungen prüfen." },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: `Genius-Suche fehlgeschlagen: ${message}` },
        { status: 502 }
      );
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("POST /api/songs/genius/search error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
