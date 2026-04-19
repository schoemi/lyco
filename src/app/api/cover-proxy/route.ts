import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Proxy-Endpoint für externe Cover-Bilder.
 *
 * Löst das CORS-Problem bei Bildern von Genius und anderen externen Quellen.
 * Nur für authentifizierte Benutzer zugänglich.
 *
 * GET /api/cover-proxy?url=https://images.genius.com/...
 */

const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 },
      );
    }

    const url = request.nextUrl.searchParams.get("url");
    if (!url) {
      return NextResponse.json(
        { error: "URL-Parameter fehlt" },
        { status: 400 },
      );
    }

    // Nur HTTPS-URLs erlauben
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Ungültige URL" },
        { status: 400 },
      );
    }

    if (parsed.protocol !== "https:") {
      return NextResponse.json(
        { error: "Nur HTTPS-URLs sind erlaubt" },
        { status: 400 },
      );
    }

    // Keine internen URLs proxyen
    if (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "0.0.0.0" ||
      parsed.hostname.endsWith(".local")
    ) {
      return NextResponse.json(
        { error: "Interne URLs sind nicht erlaubt" },
        { status: 400 },
      );
    }

    const response = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      headers: {
        "User-Agent": "LycoApp/1.0",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream-Fehler: ${response.status}` },
        { status: 502 },
      );
    }

    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      return NextResponse.json(
        { error: "Kein gültiges Bildformat" },
        { status: 422 },
      );
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_SIZE) {
      return NextResponse.json(
        { error: "Bild zu groß" },
        { status: 413 },
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    if (buffer.byteLength > MAX_SIZE) {
      return NextResponse.json(
        { error: "Bild zu groß" },
        { status: 413 },
      );
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "public, max-age=86400, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("GET /api/cover-proxy error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 },
    );
  }
}
