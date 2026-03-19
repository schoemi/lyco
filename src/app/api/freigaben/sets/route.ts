import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createSetFreigabe } from "@/lib/services/freigabe-service";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const body = await request.json();
    const { setId, empfaengerEmail } = body;

    const freigabe = await createSetFreigabe(setId, empfaengerEmail, session.user.id);
    return NextResponse.json(freigabe, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Set nicht gefunden") {
        return NextResponse.json({ error: "Set nicht gefunden" }, { status: 404 });
      }
      if (error.message === "Zugriff verweigert") {
        return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
      }
      if (error.message === "Nutzer nicht gefunden") {
        return NextResponse.json({ error: "Nutzer nicht gefunden" }, { status: 404 });
      }
      if (error.message === "Freigabe an sich selbst ist nicht möglich") {
        return NextResponse.json({ error: "Freigabe an sich selbst ist nicht möglich" }, { status: 400 });
      }
      if (error.message === "Set ist bereits für diesen Nutzer freigegeben") {
        return NextResponse.json({ error: "Set ist bereits für diesen Nutzer freigegeben" }, { status: 409 });
      }
    }
    console.error("POST /api/freigaben/sets error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
