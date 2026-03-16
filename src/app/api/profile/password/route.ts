import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { changePassword } from "@/lib/services/profil-service";

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const body = await request.json();
    await changePassword(session.user.id, body);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      const validationMessages = [
        "Passwörter stimmen nicht überein",
        "Aktuelles Passwort ist falsch",
        "Passwort muss mindestens 8 Zeichen lang sein",
      ];
      if (validationMessages.some((msg) => error.message.includes(msg))) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    console.error("PUT /api/profile/password error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
