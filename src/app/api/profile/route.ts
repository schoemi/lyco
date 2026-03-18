import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProfile, updateProfile } from "@/lib/services/profil-service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const profile = await getProfile(session.user.id);
    return NextResponse.json({ profile });
  } catch (error) {
    console.error("GET /api/profile error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const body = await request.json();
    const profile = await updateProfile(session.user.id, body);
    return NextResponse.json({ profile });
  } catch (error) {
    if (error instanceof Error) {
      // Validation errors from profil-service
      const validationMessages = [
        "Name darf nicht leer sein",
        "Name darf maximal 100 Zeichen lang sein",
        "Alter muss eine Ganzzahl zwischen 1 und 120 sein",
        "Geschlecht muss MAENNLICH, WEIBLICH oder DIVERS sein",
        "Erfahrungslevel muss ANFAENGER, FORTGESCHRITTEN, ERFAHREN oder PROFI sein",
        "Theme-Variante muss 'light' oder 'dark' sein",
        "Ausgewähltes Theme existiert nicht",
      ];
      if (validationMessages.some((msg) => error.message.includes(msg))) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    console.error("PUT /api/profile error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
