/**
 * API-Route für BeatErgebnis eines Songs.
 *
 * GET  /api/songs/[id]/beat-ergebnis — BeatErgebnis laden
 * PUT  /api/songs/[id]/beat-ergebnis — BeatErgebnis erstellen oder aktualisieren
 *
 * Anforderungen: 6.1, 6.3, 6.4, 6.5, 6.6, 6.7
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getBeatErgebnis,
  upsertBeatErgebnis,
} from "@/lib/services/beat-ergebnis-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const beatErgebnis = await getBeatErgebnis(id, session.user.id);
    return NextResponse.json({ beatErgebnis });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Song nicht gefunden") {
        return NextResponse.json(
          { error: "Song nicht gefunden" },
          { status: 404 },
        );
      }
      if (error.message === "Zugriff verweigert") {
        return NextResponse.json(
          { error: "Zugriff verweigert" },
          { status: 403 },
        );
      }
    }
    console.error("GET /api/songs/[id]/beat-ergebnis error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Basic required fields check
    if (body.bpm === undefined || body.bpm === null || !body.methode) {
      return NextResponse.json(
        { error: "BPM und Methode sind erforderlich" },
        { status: 400 },
      );
    }

    if (!Array.isArray(body.beatPositionenMs)) {
      return NextResponse.json(
        { error: "beatPositionenMs muss ein Array sein" },
        { status: 400 },
      );
    }

    const beatErgebnis = await upsertBeatErgebnis(id, body, session.user.id);
    return NextResponse.json({ beatErgebnis });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Song nicht gefunden") {
        return NextResponse.json(
          { error: "Song nicht gefunden" },
          { status: 404 },
        );
      }
      if (error.message === "Zugriff verweigert") {
        return NextResponse.json(
          { error: "Zugriff verweigert" },
          { status: 403 },
        );
      }
      // Validation errors from the service
      if (
        error.message.startsWith("BPM muss") ||
        error.message.startsWith("Methode muss") ||
        error.message.startsWith("beatPositionenMs") ||
        error.message.startsWith("Konfidenz muss") ||
        error.message.startsWith("Frequenz")
      ) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 },
        );
      }
    }
    console.error("PUT /api/songs/[id]/beat-ergebnis error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 },
    );
  }
}
